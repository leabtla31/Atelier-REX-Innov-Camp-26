-- ============================================================================
-- Seed idempotent des 55 post-its préremplis initiaux (Atelier REX — Innov'Camp 26)
-- - Utilise ON CONFLICT (id) DO NOTHING : aucun doublon même si réexécuté
-- - Ne modifie et ne supprime aucun post-it ajouté par les utilisateurs
-- ============================================================================

insert into public.workshop_notes (
  id,
  theme_id,
  column_id,
  text,
  profile,
  author_id,
  author_name,
  is_pre_filled,
  voter_ids,
  created_at,
  updated_at,
  rotation
) values
  ('seed-cadrage-keep-1', 'cadrage', 'keep', 'Format sprints intense mais ramassé', 'participant', 'seed-participant', 'Questionnaire collab.', true, '{}', 1764000000000, 1764000000000, 1.6),
  ('seed-cadrage-keep-2', 'cadrage', 'keep', 'Afterworks fédérateurs', 'participant', 'seed-participant', 'Questionnaire collab.', true, '{}', 1764000000001, 1764000000001, 1.7),
  ('seed-cadrage-keep-3', 'cadrage', 'keep', '(Coach) Supports et fil conducteur clés en main', 'coach', 'seed-coach', 'Entretiens REX coachs', true, '{}', 1764000000002, 1764000000002, 1.8),
  ('seed-cadrage-improve-1', 'cadrage', 'improve', 'Annoncer la charge réelle (≈100 %)', 'participant', 'seed-participant', 'Questionnaire collab.', true, '{}', 1764000000003, 1764000000003, 1.9),
  ('seed-cadrage-improve-2', 'cadrage', 'improve', 'Anticiper la note CEG', 'participant', 'seed-participant', 'Questionnaire collab.', true, '{}', 1764000000004, 1764000000004, 2),
  ('seed-cadrage-improve-3', 'cadrage', 'improve', '(Coach) Calendrier réaliste : 21 jours et sprints très courts', 'coach', 'seed-coach', 'Entretiens REX coachs', true, '{}', 1764000000005, 1764000000005, -2),
  ('seed-cadrage-improve-4', 'cadrage', 'improve', '(Coach) Casting : vérifier engagement et disponibilité', 'coach', 'seed-coach', 'Entretiens REX coachs', true, '{}', 1764000000006, 1764000000006, -1.9),
  ('seed-cadrage-start-1', 'cadrage', 'start', 'Une salle dédiée et fermée par équipe', 'participant', 'seed-participant', 'Questionnaire collab.', true, '{}', 1764000000007, 1764000000007, -0.9),
  ('seed-cadrage-start-2', 'cadrage', 'start', 'Sanctuariser les temps d''autonomie', 'participant', 'seed-participant', 'Questionnaire collab.', true, '{}', 1764000000008, 1764000000008, -0.8),
  ('seed-cadrage-start-3', 'cadrage', 'start', 'Points sponsors à mi-sprint', 'participant', 'seed-participant', 'Questionnaire collab.', true, '{}', 1764000000009, 1764000000009, -0.7),
  ('seed-cadrage-start-4', 'cadrage', 'start', 'Jours « libres InnovCamp » au planning', 'participant', 'seed-participant', 'Questionnaire collab.', true, '{}', 1764000000010, 1764000000010, -0.6),
  ('seed-cadrage-start-5', 'cadrage', 'start', '(Coach) Embarquer chaque participant en amont', 'coach', 'seed-coach', 'Entretiens REX coachs', true, '{}', 1764000000011, 1764000000011, -0.5),
  ('seed-cadrage-start-6', 'cadrage', 'start', '(Coach) Une vraie pause pour tester sur le terrain', 'coach', 'seed-coach', 'Entretiens REX coachs', true, '{}', 1764000000012, 1764000000012, -0.4),
  ('seed-cadrage-stop-1', 'cadrage', 'stop', 'Changements de salles en continu', 'participant', 'seed-participant', 'Questionnaire collab.', true, '{}', 1764000000013, 1764000000013, -1.6),
  ('seed-cadrage-stop-2', 'cadrage', 'stop', 'Trop de livrables intermédiaires', 'participant', 'seed-participant', 'Questionnaire collab.', true, '{}', 1764000000014, 1764000000014, -1.5),
  ('seed-cadrage-stop-3', 'cadrage', 'stop', 'Livrables pendant le break Toussaint', 'participant', 'seed-participant', 'Questionnaire collab.', true, '{}', 1764000000015, 1764000000015, -1.4),
  ('seed-cadrage-stop-4', 'cadrage', 'stop', '(Coach) Lancer des sujets non alignés en amont', 'coach', 'seed-coach', 'Entretiens REX coachs', true, '{}', 1764000000016, 1764000000016, -1.3),
  ('seed-cadrage-stop-5', 'cadrage', 'stop', '(Coach) Tout produire : trier livrables utiles / obligatoires', 'coach', 'seed-coach', 'Entretiens REX coachs', true, '{}', 1764000000017, 1764000000017, -1.2),
  ('seed-accompagnement-keep-1', 'accompagnement', 'keep', 'Coaching bienveillant qui challenge (4,3/5)', 'participant', 'seed-participant', 'Questionnaire collab.', true, '{}', 1764000000018, 1764000000018, 0.2),
  ('seed-accompagnement-keep-2', 'accompagnement', 'keep', 'Appui équipe Transfo & sponsors (note CEG)', 'participant', 'seed-participant', 'Questionnaire collab.', true, '{}', 1764000000019, 1764000000019, 0.3),
  ('seed-accompagnement-keep-3', 'accompagnement', 'keep', 'Pitchs croisés plébiscités (14/15)', 'participant', 'seed-participant', 'Questionnaire collab.', true, '{}', 1764000000020, 1764000000020, 0.4),
  ('seed-accompagnement-keep-4', 'accompagnement', 'keep', 'Temps de travail en autonomie', 'participant', 'seed-participant', 'Questionnaire collab.', true, '{}', 1764000000021, 1764000000021, 0.5),
  ('seed-accompagnement-keep-5', 'accompagnement', 'keep', '(Coach) Posture intrapreneur adoptée dès le départ', 'coach', 'seed-coach', 'Entretiens REX coachs', true, '{}', 1764000000022, 1764000000022, 0.6),
  ('seed-accompagnement-improve-1', 'accompagnement', 'improve', 'Disponibilité des sponsors inégale', 'participant', 'seed-participant', 'Questionnaire collab.', true, '{}', 1764000000023, 1764000000023, -1.4),
  ('seed-accompagnement-improve-2', 'accompagnement', 'improve', 'Méthode plus personnalisée, moins scolaire', 'participant', 'seed-participant', 'Questionnaire collab.', true, '{}', 1764000000024, 1764000000024, -1.3),
  ('seed-accompagnement-improve-3', 'accompagnement', 'improve', 'Masterclass plus courtes et ciblées', 'participant', 'seed-participant', 'Questionnaire collab.', true, '{}', 1764000000025, 1764000000025, -1.2),
  ('seed-accompagnement-improve-4', 'accompagnement', 'improve', '(Coach) Coaching en sessions de 2h ou demi-journée, à la carte', 'coach', 'seed-coach', 'Entretiens REX coachs', true, '{}', 1764000000026, 1764000000026, -1.1),
  ('seed-accompagnement-improve-5', 'accompagnement', 'improve', '(Coach) Clarifier dès le départ le rôle des coachs', 'coach', 'seed-coach', 'Entretiens REX coachs', true, '{}', 1764000000027, 1764000000027, -1),
  ('seed-accompagnement-start-1', 'accompagnement', 'start', 'Un coach référent par équipe, sur site et sur la durée', 'participant', 'seed-participant', 'Questionnaire collab.', true, '{}', 1764000000028, 1764000000028, -0.2),
  ('seed-accompagnement-start-2', 'accompagnement', 'start', 'Appui sur tensions et désaccords d''équipe', 'participant', 'seed-participant', 'Questionnaire collab.', true, '{}', 1764000000029, 1764000000029, -0.1),
  ('seed-accompagnement-start-3', 'accompagnement', 'start', 'Échanges avec alumni et experts externes', 'participant', 'seed-participant', 'Questionnaire collab.', true, '{}', 1764000000030, 1764000000030, 0),
  ('seed-accompagnement-start-4', 'accompagnement', 'start', '(Coach) RACI et critères de réussite au lancement', 'coach', 'seed-coach', 'Entretiens REX coachs', true, '{}', 1764000000031, 1764000000031, 0.1),
  ('seed-accompagnement-start-5', 'accompagnement', 'start', '(Coach) Sponsors prêts à laisser la main aux équipes', 'coach', 'seed-coach', 'Entretiens REX coachs', true, '{}', 1764000000032, 1764000000032, 0.2),
  ('seed-accompagnement-start-6', 'accompagnement', 'start', '(Coach) REX d''experts et masterclass ciblées par sujet', 'coach', 'seed-coach', 'Entretiens REX coachs', true, '{}', 1764000000033, 1764000000033, 0.3),
  ('seed-accompagnement-stop-1', 'accompagnement', 'stop', 'Multiplier les intervenants (retours redondants)', 'participant', 'seed-participant', 'Questionnaire collab.', true, '{}', 1764000000034, 1764000000034, -1.7),
  ('seed-accompagnement-stop-2', 'accompagnement', 'stop', '(Coach) Coachings de 30 min entre deux formations', 'coach', 'seed-coach', 'Entretiens REX coachs', true, '{}', 1764000000035, 1764000000035, -1.6),
  ('seed-accompagnement-stop-3', 'accompagnement', 'stop', '(Coach) Pression et correction plutôt qu''appui', 'coach', 'seed-coach', 'Entretiens REX coachs', true, '{}', 1764000000036, 1764000000036, -1.5),
  ('seed-apports-keep-1', 'apports', 'keep', 'NPS +87 et méthodes réutilisables (15/15)', 'participant', 'seed-participant', 'Questionnaire collab.', true, '{}', 1764000000037, 1764000000037, 0.1),
  ('seed-apports-keep-2', 'apports', 'keep', 'IA, vrai accélérateur (4,6/5)', 'participant', 'seed-participant', 'Questionnaire collab.', true, '{}', 1764000000038, 1764000000038, 0.2),
  ('seed-apports-keep-3', 'apports', 'keep', 'Réseau et liens durables', 'participant', 'seed-participant', 'Questionnaire collab.', true, '{}', 1764000000039, 1764000000039, 0.3),
  ('seed-apports-keep-4', 'apports', 'keep', '(Coach) Belle progression, pitchs plus assurés', 'coach', 'seed-coach', 'Entretiens REX coachs', true, '{}', 1764000000040, 1764000000040, 0.4),
  ('seed-apports-keep-5', 'apports', 'keep', '(Coach) Prototypes de qualité, IA agentique démontrée', 'coach', 'seed-coach', 'Entretiens REX coachs', true, '{}', 1764000000041, 1764000000041, 0.5),
  ('seed-apports-improve-1', 'apports', 'improve', 'Business plan : compétence la moins acquise (3,9/5)', 'participant', 'seed-participant', 'Questionnaire collab.', true, '{}', 1764000000042, 1764000000042, 0.5),
  ('seed-apports-improve-2', 'apports', 'improve', 'Livrables alignés sur la commande Groupama', 'participant', 'seed-participant', 'Questionnaire collab.', true, '{}', 1764000000043, 1764000000043, 0.6),
  ('seed-apports-improve-3', 'apports', 'improve', 'Clarté des attendus', 'participant', 'seed-participant', 'Questionnaire collab.', true, '{}', 1764000000044, 1764000000044, 0.7),
  ('seed-apports-improve-4', 'apports', 'improve', '(Coach) Alignement des sponsors sur le résultat attendu', 'coach', 'seed-coach', 'Entretiens REX coachs', true, '{}', 1764000000045, 1764000000045, 0.8),
  ('seed-apports-improve-5', 'apports', 'improve', '(Coach) Visibilité sur les projets adjacents', 'coach', 'seed-coach', 'Entretiens REX coachs', true, '{}', 1764000000046, 1764000000046, 0.9),
  ('seed-apports-start-1', 'apports', 'start', 'Plus de latitude sur la problématique', 'participant', 'seed-participant', 'Questionnaire collab.', true, '{}', 1764000000047, 1764000000047, 2),
  ('seed-apports-start-2', 'apports', 'start', 'Creuser davantage l''angle utilisateur', 'participant', 'seed-participant', 'Questionnaire collab.', true, '{}', 1764000000048, 1764000000048, -2),
  ('seed-apports-start-3', 'apports', 'start', 'Plus de temps pour prendre du recul', 'participant', 'seed-participant', 'Questionnaire collab.', true, '{}', 1764000000049, 1764000000049, -1.9),
  ('seed-apports-start-4', 'apports', 'start', '(Coach) Clarifier la vocation : accélérer des sujets stratégiques ?', 'coach', 'seed-coach', 'Entretiens REX coachs', true, '{}', 1764000000050, 1764000000050, -1.8),
  ('seed-apports-start-5', 'apports', 'start', '(Coach) Sortir du solutionnisme : tests terrain', 'coach', 'seed-coach', 'Entretiens REX coachs', true, '{}', 1764000000051, 1764000000051, -1.7),
  ('seed-apports-stop-1', 'apports', 'stop', 'Multiplier les sujets en parallèle', 'participant', 'seed-participant', 'Questionnaire collab.', true, '{}', 1764000000052, 1764000000052, 1),
  ('seed-apports-stop-2', 'apports', 'stop', 'Sujets uniquement orientés techno', 'participant', 'seed-participant', 'Questionnaire collab.', true, '{}', 1764000000053, 1764000000053, 1.1),
  ('seed-apports-stop-3', 'apports', 'stop', '(Coach) Sujets déjà ficelés, solution en tête', 'coach', 'seed-coach', 'Entretiens REX coachs', true, '{}', 1764000000054, 1764000000054, 1.2)
on conflict (id) do nothing;

-- Marquer les thématiques comme initialisées (sans écraser locked ni les minuteurs)
insert into public.workshop_settings (theme_id, seeded)
values
  ('cadrage', true),
  ('accompagnement', true),
  ('apports', true)
on conflict (theme_id) do update
set seeded = true
where public.workshop_settings.seeded = false;
