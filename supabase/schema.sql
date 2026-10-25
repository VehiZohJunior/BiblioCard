-- BiblioCard : base Supabase (offre gratuite). À coller en entier dans « SQL Editor », puis « Run ».
-- Le script peut être relancé sans danger (if not exists / or replace).
--
-- Principe de sécurité : le navigateur ne peut que LIRE son propre compte. L’essai, la formule et la
-- date de fin ne sont écrits que par le serveur (déclencheur à l’inscription, fonction de paiement),
-- avec l’horloge du serveur. Les documents de l’utilisateur ne sont jamais envoyés ici.

-- ============ 1. Abonnements : essai de 3 jours, puis formule payée ============
create table if not exists abonnements (
  user_id uuid primary key references auth.users on delete cascade,
  essai_fin timestamptz not null default now() + interval '3 days',
  formule smallint not null default 0 check (formule between 0 and 3),  -- formule payée (0 = aucune)
  fin timestamptz,                                                       -- fin de la période payée
  created_at timestamptz not null default now()
);
alter table abonnements enable row level security;
drop policy if exists "lecture de mon abonnement" on abonnements;
create policy "lecture de mon abonnement" on abonnements for select using (auth.uid() = user_id);
-- aucune règle d’écriture : seul le serveur (fonctions ci-dessous) modifie un abonnement

-- Chaque nouveau compte reçoit son essai, daté par le serveur
create or replace function public.bibliocard_nouveau_compte() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into abonnements (user_id) values (new.id) on conflict do nothing;
  return new;
end $$;
drop trigger if exists bibliocard_nouveau_compte on auth.users;
create trigger bibliocard_nouveau_compte after insert on auth.users
  for each row execute function public.bibliocard_nouveau_compte();

-- Droits actuels du compte connecté : formule effective (3 pendant l’essai), dates, heure du serveur
create or replace function public.mon_acces() returns json
language plpgsql security definer set search_path = public as $$
declare a abonnements;
begin
  if auth.uid() is null then return null; end if;
  insert into abonnements (user_id) values (auth.uid()) on conflict do nothing;
  select * into a from abonnements where user_id = auth.uid();
  return json_build_object(
    'formule', case when a.fin > now() then a.formule when a.essai_fin > now() then 3 else 0 end,
    'essai', a.essai_fin > now() and not coalesce(a.fin > now(), false),
    'essai_fin', a.essai_fin, 'fin', a.fin, 'formule_payee', a.formule, 'maintenant', now());
end $$;
revoke all on function public.mon_acces() from public, anon;
grant execute on function public.mon_acces() to authenticated;

-- ============ 2. Paiements PayDunya ============
create table if not exists paiements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  formule smallint not null check (formule between 1 and 3),
  montant integer not null,
  token text unique not null,               -- jeton de la facture PayDunya
  statut text not null default 'en_attente' check (statut in ('en_attente','reussi','echoue','annule','montant_different')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table paiements enable row level security;
drop policy if exists "lecture de mes paiements" on paiements;
create policy "lecture de mes paiements" on paiements for select using (auth.uid() = user_id);

-- Applique un paiement confirmé par PayDunya, en une seule opération :
-- vérifie le montant, passe « en_attente » → « reussi » une seule fois (une notification reçue deux fois
-- ne prolonge pas deux fois), puis prolonge l’abonnement de 30 jours.
-- Même formule encore active : les 30 jours s’ajoutent à la fin prévue ; sinon ils partent d’aujourd’hui.
create or replace function public.appliquer_paiement(p_token text, p_montant integer) returns text
language plpgsql security definer set search_path = public as $$
declare p paiements; a abonnements; depart timestamptz;
begin
  select * into p from paiements where token = p_token for update;
  if not found then return 'inconnu'; end if;
  if p.statut <> 'en_attente' then return 'deja_traite'; end if;
  if p.montant <> p_montant then
    update paiements set statut = 'montant_different', updated_at = now() where id = p.id;
    return 'montant_different';
  end if;
  update paiements set statut = 'reussi', updated_at = now() where id = p.id;
  insert into abonnements (user_id) values (p.user_id) on conflict do nothing;
  select * into a from abonnements where user_id = p.user_id for update;
  depart := case when a.fin > now() and a.formule = p.formule then a.fin else now() end;
  update abonnements set formule = p.formule, fin = depart + interval '30 days' where user_id = p.user_id;
  return 'ok';
end $$;
revoke all on function public.appliquer_paiement(text, integer) from public, anon, authenticated;
grant execute on function public.appliquer_paiement(text, integer) to service_role;  -- la fonction paydunya-notification seulement

-- ============ 3. Synchronisation entre appareils (chaque utilisateur ne voit que la sienne) ============
create table if not exists bibliotheques (
  user_id uuid primary key references auth.users on delete cascade,
  json text not null, updated_at bigint not null
);
alter table bibliotheques enable row level security;
drop policy if exists "la mienne" on bibliotheques;
create policy "la mienne" on bibliotheques for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============ 4. Catalogue partagé des références africaines (données bibliographiques publiques) ============
create table if not exists catalogue (
  id bigint generated always as identity primary key,
  tkey text not null, ref jsonb not null, contributor text not null,
  created_at timestamptz default now(), unique (tkey, contributor)
);
alter table catalogue enable row level security;
drop policy if exists "lecture publique" on catalogue;
create policy "lecture publique" on catalogue for select using (true);
drop policy if exists "ajout public" on catalogue;
create policy "ajout public" on catalogue for insert with check (char_length(tkey) < 200 and pg_column_size(ref) < 8000);

create table if not exists signalements (
  id bigint generated always as identity primary key,
  tkey text not null, contributor text not null,
  created_at timestamptz default now(), unique (tkey, contributor)
);
alter table signalements enable row level security;
drop policy if exists "lecture" on signalements;
create policy "lecture" on signalements for select using (true);
drop policy if exists "ajout" on signalements;
create policy "ajout" on signalements for insert with check (char_length(tkey) < 200);
