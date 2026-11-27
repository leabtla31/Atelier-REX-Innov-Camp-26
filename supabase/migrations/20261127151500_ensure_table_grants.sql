-- ============================================================================
-- Garantir les permissions SQL (GRANT) sur le schéma public et les tables
-- exposées pour la Publishable Key (rôles anon / authenticated) tout en
-- maintenant strictement l'isolation RLS existante.
-- ============================================================================

grant usage on schema public to anon, authenticated;

grant select, insert, update, delete on table public.workshop_notes to anon, authenticated;
grant select on table public.workshop_settings to anon, authenticated;

-- S'assurer que les 3 thématiques existent bien dans workshop_settings
insert into public.workshop_settings (theme_id)
values ('cadrage'), ('accompagnement'), ('apports')
on conflict (theme_id) do nothing;

-- Re-vérifier que RLS reste activé sur toutes les tables
alter table public.workshop_notes enable row level security;
alter table public.workshop_settings enable row level security;
alter table public.workshop_facilitator enable row level security;
alter table public.workshop_facilitator_sessions enable row level security;
