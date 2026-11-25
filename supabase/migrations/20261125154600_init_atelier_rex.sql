-- ============================================================================
-- Migration initiale : Atelier REX — Innov'Camp 26 (Groupama × Onepoint)
-- Tables, politiques RLS, fonctions RPC et publication Supabase Realtime
-- ============================================================================

create extension if not exists pgcrypto with schema extensions;

-- 1. Table des post-its
create table if not exists public.workshop_notes (
  id text primary key,
  theme_id text not null check (theme_id in ('cadrage', 'accompagnement', 'apports')),
  column_id text not null check (column_id in ('keep', 'improve', 'start', 'stop')),
  text text not null check (char_length(text) between 1 and 180),
  profile text not null check (profile in ('coach', 'participant', 'groupama')),
  author_id text not null,
  author_name text not null,
  is_pre_filled boolean not null default false,
  voter_ids text[] not null default '{}',
  created_at bigint not null,
  updated_at bigint not null,
  rotation double precision not null default 0
);

-- 2. Table des paramètres par thématique (verrouillage + minuteur 40 min + état seed)
create table if not exists public.workshop_settings (
  theme_id text primary key check (theme_id in ('cadrage', 'accompagnement', 'apports')),
  locked boolean not null default false,
  seeded boolean not null default false,
  timer_duration_sec integer not null default 2400,
  timer_remaining_sec integer not null default 2400,
  timer_running boolean not null default false,
  timer_updated_at bigint not null default (extract(epoch from now()) * 1000)::bigint
);

insert into public.workshop_settings (theme_id)
values ('cadrage'), ('accompagnement'), ('apports')
on conflict (theme_id) do nothing;

-- 3. Tables privées pour le code animateur (aucun accès direct depuis le navigateur)
create table if not exists public.workshop_facilitator (
  id integer primary key default 1 check (id = 1),
  passcode_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.workshop_facilitator_sessions (
  token text primary key,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

-- 4. Activation RLS
alter table public.workshop_notes enable row level security;
alter table public.workshop_settings enable row level security;
alter table public.workshop_facilitator enable row level security;
alter table public.workshop_facilitator_sessions enable row level security;

-- Politiques RLS sur workshop_notes
drop policy if exists "Public read workshop_notes" on public.workshop_notes;
create policy "Public read workshop_notes"
  on public.workshop_notes for select
  to anon, authenticated
  using (true);

drop policy if exists "Public insert unlocked workshop_notes" on public.workshop_notes;
create policy "Public insert unlocked workshop_notes"
  on public.workshop_notes for insert
  to anon, authenticated
  with check (
    not exists (
      select 1 from public.workshop_settings s
      where s.theme_id = workshop_notes.theme_id and s.locked = true
    )
  );

drop policy if exists "Public update workshop_notes" on public.workshop_notes;
create policy "Public update workshop_notes"
  on public.workshop_notes for update
  to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "Public delete own workshop_notes" on public.workshop_notes;
create policy "Public delete own workshop_notes"
  on public.workshop_notes for delete
  to anon, authenticated
  using (is_pre_filled = false);

-- Politiques RLS sur workshop_settings (lecture publique, mutations via RPC)
drop policy if exists "Public read workshop_settings" on public.workshop_settings;
create policy "Public read workshop_settings"
  on public.workshop_settings for select
  to anon, authenticated
  using (true);

-- 5. Fonctions RPC sécurisées (SECURITY DEFINER)

-- Initialisation unique des post-its pré-remplis
create or replace function public.seed_initial_notes(p_notes jsonb)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if exists (select 1 from public.workshop_settings where seeded = true) then
    return;
  end if;

  insert into public.workshop_notes (
    id, theme_id, column_id, text, profile, author_id, author_name,
    is_pre_filled, voter_ids, created_at, updated_at, rotation
  )
  select
    item->>'id',
    item->>'themeId',
    item->>'column',
    item->>'text',
    item->>'profile',
    item->>'authorId',
    item->>'authorName',
    coalesce((item->>'isPreFilled')::boolean, true),
    coalesce(array(select jsonb_array_elements_text(item->'voterIds')), '{}'),
    (item->>'createdAt')::bigint,
    (item->>'updatedAt')::bigint,
    (item->>'rotation')::double precision
  from jsonb_array_elements(p_notes) as item
  on conflict (id) do nothing;

  update public.workshop_settings set seeded = true;
end;
$$;

-- Vote atomique (toggle par participant_id)
create or replace function public.toggle_note_vote(p_note_id text, p_participant_id text)
returns public.workshop_notes
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_row public.workshop_notes;
  v_now bigint := (extract(epoch from now()) * 1000)::bigint;
begin
  update public.workshop_notes
  set
    voter_ids = case
      when p_participant_id = any(voter_ids) then array_remove(voter_ids, p_participant_id)
      else array_append(voter_ids, p_participant_id)
    end,
    updated_at = v_now
  where id = p_note_id
  returning * into v_row;

  if not found then
    raise exception 'Post-it introuvable.';
  end if;

  return v_row;
end;
$$;

-- Contrôle du minuteur partagé de 40 min
create or replace function public.control_workshop_timer(p_theme_id text, p_action text)
returns public.workshop_settings
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_row public.workshop_settings;
  v_now bigint := (extract(epoch from now()) * 1000)::bigint;
  v_elapsed integer;
  v_effective integer;
begin
  select * into v_row from public.workshop_settings where theme_id = p_theme_id for update;
  if not found then
    raise exception 'Thématique invalide.';
  end if;

  v_elapsed := case
    when v_row.timer_running then greatest(0, floor((v_now - v_row.timer_updated_at) / 1000.0)::integer)
    else 0
  end;
  v_effective := greatest(0, v_row.timer_remaining_sec - v_elapsed);

  if p_action = 'start' then
    update public.workshop_settings
    set
      timer_remaining_sec = case when v_effective > 0 then v_effective else timer_duration_sec end,
      timer_running = true,
      timer_updated_at = v_now
    where theme_id = p_theme_id
    returning * into v_row;
  elsif p_action = 'pause' then
    update public.workshop_settings
    set
      timer_remaining_sec = v_effective,
      timer_running = false,
      timer_updated_at = v_now
    where theme_id = p_theme_id
    returning * into v_row;
  elsif p_action = 'reset' then
    update public.workshop_settings
    set
      timer_remaining_sec = timer_duration_sec,
      timer_running = false,
      timer_updated_at = v_now
    where theme_id = p_theme_id
    returning * into v_row;
  else
    raise exception 'Action de minuteur invalide.';
  end if;

  return v_row;
end;
$$;

-- Vérification session animateur (interne)
create or replace function public.assert_facilitator_token(p_token text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if p_token is null or not exists (
    select 1 from public.workshop_facilitator_sessions
    where token = p_token and expires_at > now()
  ) then
    raise exception 'Accès animateur requis ou session expirée.';
  end if;
end;
$$;

-- Statut du code animateur
create or replace function public.facilitator_status()
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  return jsonb_build_object(
    'requiresClaim', not exists (select 1 from public.workshop_facilitator where id = 1)
  );
end;
$$;

-- Configuration initiale du code animateur (une seule fois)
create or replace function public.facilitator_claim(p_passcode text)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_token text;
begin
  if exists (select 1 from public.workshop_facilitator where id = 1) then
    raise exception 'Un code animateur est déjà configuré.';
  end if;
  if p_passcode is null or char_length(trim(p_passcode)) < 4 then
    raise exception 'Le code animateur doit contenir au moins 4 caractères.';
  end if;

  insert into public.workshop_facilitator (id, passcode_hash)
  values (1, extensions.crypt(trim(p_passcode), extensions.gen_salt('bf')));

  v_token := encode(extensions.gen_random_bytes(32), 'hex');
  insert into public.workshop_facilitator_sessions (token, expires_at)
  values (v_token, now() + interval '12 hours');

  return v_token;
end;
$$;

-- Connexion animateur
create or replace function public.facilitator_login(p_passcode text)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_hash text;
  v_token text;
begin
  select passcode_hash into v_hash from public.workshop_facilitator where id = 1;
  if v_hash is null then
    raise exception 'Aucun code animateur configuré pour le moment.';
  end if;
  if p_passcode is null or extensions.crypt(trim(p_passcode), v_hash) <> v_hash then
    raise exception 'Code animateur incorrect.';
  end if;

  delete from public.workshop_facilitator_sessions where expires_at <= now();

  v_token := encode(extensions.gen_random_bytes(32), 'hex');
  insert into public.workshop_facilitator_sessions (token, expires_at)
  values (v_token, now() + interval '12 hours');

  return v_token;
end;
$$;

-- Actions réservées à l'animateur
create or replace function public.facilitator_toggle_lock(
  p_token text,
  p_theme_id text,
  p_locked boolean
)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  perform public.assert_facilitator_token(p_token);
  update public.workshop_settings
  set locked = p_locked
  where theme_id = p_theme_id;
end;
$$;

create or replace function public.facilitator_reset_theme(
  p_token text,
  p_theme_id text,
  p_seed_notes jsonb
)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_now bigint := (extract(epoch from now()) * 1000)::bigint;
begin
  perform public.assert_facilitator_token(p_token);

  delete from public.workshop_notes where theme_id = p_theme_id;

  insert into public.workshop_notes (
    id, theme_id, column_id, text, profile, author_id, author_name,
    is_pre_filled, voter_ids, created_at, updated_at, rotation
  )
  select
    item->>'id',
    item->>'themeId',
    item->>'column',
    item->>'text',
    item->>'profile',
    item->>'authorId',
    item->>'authorName',
    coalesce((item->>'isPreFilled')::boolean, true),
    coalesce(array(select jsonb_array_elements_text(item->'voterIds')), '{}'),
    (item->>'createdAt')::bigint,
    (item->>'updatedAt')::bigint,
    (item->>'rotation')::double precision
  from jsonb_array_elements(p_seed_notes) as item;

  update public.workshop_settings
  set
    locked = false,
    seeded = true,
    timer_remaining_sec = timer_duration_sec,
    timer_running = false,
    timer_updated_at = v_now
  where theme_id = p_theme_id;
end;
$$;

create or replace function public.facilitator_merge_notes(
  p_token text,
  p_primary_id text,
  p_secondary_id text,
  p_merged_text text
)
returns public.workshop_notes
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_primary public.workshop_notes;
  v_secondary public.workshop_notes;
  v_combined_voters text[];
  v_now bigint := (extract(epoch from now()) * 1000)::bigint;
begin
  perform public.assert_facilitator_token(p_token);

  select * into v_primary from public.workshop_notes where id = p_primary_id;
  select * into v_secondary from public.workshop_notes where id = p_secondary_id;

  if v_primary.id is null or v_secondary.id is null or v_primary.theme_id <> v_secondary.theme_id then
    raise exception 'Post-its introuvables dans cette thématique.';
  end if;

  select array_agg(distinct v) into v_combined_voters
  from unnest(v_primary.voter_ids || v_secondary.voter_ids) as v;

  update public.workshop_notes
  set
    text = trim(p_merged_text),
    voter_ids = coalesce(v_combined_voters, '{}'),
    is_pre_filled = (v_primary.is_pre_filled and v_secondary.is_pre_filled),
    updated_at = v_now
  where id = p_primary_id
  returning * into v_primary;

  delete from public.workshop_notes where id = p_secondary_id;

  return v_primary;
end;
$$;

create or replace function public.facilitator_create_note(
  p_token text,
  p_note jsonb
)
returns public.workshop_notes
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_row public.workshop_notes;
begin
  perform public.assert_facilitator_token(p_token);

  insert into public.workshop_notes (
    id, theme_id, column_id, text, profile, author_id, author_name,
    is_pre_filled, voter_ids, created_at, updated_at, rotation
  ) values (
    p_note->>'id',
    p_note->>'themeId',
    p_note->>'column',
    p_note->>'text',
    p_note->>'profile',
    p_note->>'authorId',
    p_note->>'authorName',
    false,
    '{}',
    (p_note->>'createdAt')::bigint,
    (p_note->>'updatedAt')::bigint,
    (p_note->>'rotation')::double precision
  )
  returning * into v_row;

  return v_row;
end;
$$;

create or replace function public.facilitator_delete_note(
  p_token text,
  p_note_id text
)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  perform public.assert_facilitator_token(p_token);
  delete from public.workshop_notes where id = p_note_id;
end;
$$;

-- Droits d'exécution sur les RPC pour les visiteurs anonymes
grant execute on function public.seed_initial_notes(jsonb) to anon, authenticated;
grant execute on function public.toggle_note_vote(text, text) to anon, authenticated;
grant execute on function public.control_workshop_timer(text, text) to anon, authenticated;
grant execute on function public.facilitator_status() to anon, authenticated;
grant execute on function public.facilitator_claim(text) to anon, authenticated;
grant execute on function public.facilitator_login(text) to anon, authenticated;
grant execute on function public.facilitator_toggle_lock(text, text, boolean) to anon, authenticated;
grant execute on function public.facilitator_reset_theme(text, text, jsonb) to anon, authenticated;
grant execute on function public.facilitator_merge_notes(text, text, text, text) to anon, authenticated;
grant execute on function public.facilitator_create_note(text, jsonb) to anon, authenticated;
grant execute on function public.facilitator_delete_note(text, text) to anon, authenticated;

-- 6. Activation du temps réel Supabase Realtime
alter table public.workshop_notes replica identity full;
alter table public.workshop_settings replica identity full;

do $$
begin
  alter publication supabase_realtime add table public.workshop_notes;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.workshop_settings;
exception
  when duplicate_object then null;
end $$;
