import {
  DEFAULT_TIMER_SECONDS,
  computeRotationFromId,
} from '../types/workshop.ts';
import type {
  KissColumn,
  NoteItem,
  ThemeId,
  TimerState,
  UserProfile,
} from '../types/workshop.ts';

interface RawSeedNote {
  id: string;
  themeId: ThemeId;
  column: KissColumn;
  profile: UserProfile;
  text: string;
}

const RAW_SEED_NOTES: RawSeedNote[] = [
  // THÉMATIQUE 1 — Cadrage et organisation
  {
    id: 'seed-cadrage-keep-1',
    themeId: 'cadrage',
    column: 'keep',
    profile: 'participant',
    text: 'Format sprints intense mais ramassé',
  },
  {
    id: 'seed-cadrage-keep-2',
    themeId: 'cadrage',
    column: 'keep',
    profile: 'participant',
    text: 'Afterworks fédérateurs',
  },
  {
    id: 'seed-cadrage-keep-3',
    themeId: 'cadrage',
    column: 'keep',
    profile: 'coach',
    text: '(Coach) Supports et fil conducteur clés en main',
  },
  {
    id: 'seed-cadrage-improve-1',
    themeId: 'cadrage',
    column: 'improve',
    profile: 'participant',
    text: 'Annoncer la charge réelle (≈100 %)',
  },
  {
    id: 'seed-cadrage-improve-2',
    themeId: 'cadrage',
    column: 'improve',
    profile: 'participant',
    text: 'Anticiper la note CEG',
  },
  {
    id: 'seed-cadrage-improve-3',
    themeId: 'cadrage',
    column: 'improve',
    profile: 'coach',
    text: '(Coach) Calendrier réaliste : 21 jours et sprints très courts',
  },
  {
    id: 'seed-cadrage-improve-4',
    themeId: 'cadrage',
    column: 'improve',
    profile: 'coach',
    text: '(Coach) Casting : vérifier engagement et disponibilité',
  },
  {
    id: 'seed-cadrage-start-1',
    themeId: 'cadrage',
    column: 'start',
    profile: 'participant',
    text: 'Une salle dédiée et fermée par équipe',
  },
  {
    id: 'seed-cadrage-start-2',
    themeId: 'cadrage',
    column: 'start',
    profile: 'participant',
    text: "Sanctuariser les temps d'autonomie",
  },
  {
    id: 'seed-cadrage-start-3',
    themeId: 'cadrage',
    column: 'start',
    profile: 'participant',
    text: 'Points sponsors à mi-sprint',
  },
  {
    id: 'seed-cadrage-start-4',
    themeId: 'cadrage',
    column: 'start',
    profile: 'participant',
    text: 'Jours « libres InnovCamp » au planning',
  },
  {
    id: 'seed-cadrage-start-5',
    themeId: 'cadrage',
    column: 'start',
    profile: 'coach',
    text: '(Coach) Embarquer chaque participant en amont',
  },
  {
    id: 'seed-cadrage-start-6',
    themeId: 'cadrage',
    column: 'start',
    profile: 'coach',
    text: '(Coach) Une vraie pause pour tester sur le terrain',
  },
  {
    id: 'seed-cadrage-stop-1',
    themeId: 'cadrage',
    column: 'stop',
    profile: 'participant',
    text: 'Changements de salles en continu',
  },
  {
    id: 'seed-cadrage-stop-2',
    themeId: 'cadrage',
    column: 'stop',
    profile: 'participant',
    text: 'Trop de livrables intermédiaires',
  },
  {
    id: 'seed-cadrage-stop-3',
    themeId: 'cadrage',
    column: 'stop',
    profile: 'participant',
    text: 'Livrables pendant le break Toussaint',
  },
  {
    id: 'seed-cadrage-stop-4',
    themeId: 'cadrage',
    column: 'stop',
    profile: 'coach',
    text: '(Coach) Lancer des sujets non alignés en amont',
  },
  {
    id: 'seed-cadrage-stop-5',
    themeId: 'cadrage',
    column: 'stop',
    profile: 'coach',
    text: '(Coach) Tout produire : trier livrables utiles / obligatoires',
  },

  // THÉMATIQUE 2 — Accompagnement
  {
    id: 'seed-accompagnement-keep-1',
    themeId: 'accompagnement',
    column: 'keep',
    profile: 'participant',
    text: 'Coaching bienveillant qui challenge (4,3/5)',
  },
  {
    id: 'seed-accompagnement-keep-2',
    themeId: 'accompagnement',
    column: 'keep',
    profile: 'participant',
    text: 'Appui équipe Transfo & sponsors (note CEG)',
  },
  {
    id: 'seed-accompagnement-keep-3',
    themeId: 'accompagnement',
    column: 'keep',
    profile: 'participant',
    text: 'Pitchs croisés plébiscités (14/15)',
  },
  {
    id: 'seed-accompagnement-keep-4',
    themeId: 'accompagnement',
    column: 'keep',
    profile: 'participant',
    text: 'Temps de travail en autonomie',
  },
  {
    id: 'seed-accompagnement-keep-5',
    themeId: 'accompagnement',
    column: 'keep',
    profile: 'coach',
    text: '(Coach) Posture intrapreneur adoptée dès le départ',
  },
  {
    id: 'seed-accompagnement-improve-1',
    themeId: 'accompagnement',
    column: 'improve',
    profile: 'participant',
    text: 'Disponibilité des sponsors inégale',
  },
  {
    id: 'seed-accompagnement-improve-2',
    themeId: 'accompagnement',
    column: 'improve',
    profile: 'participant',
    text: 'Méthode plus personnalisée, moins scolaire',
  },
  {
    id: 'seed-accompagnement-improve-3',
    themeId: 'accompagnement',
    column: 'improve',
    profile: 'participant',
    text: 'Masterclass plus courtes et ciblées',
  },
  {
    id: 'seed-accompagnement-improve-4',
    themeId: 'accompagnement',
    column: 'improve',
    profile: 'coach',
    text: '(Coach) Coaching en sessions de 2h ou demi-journée, à la carte',
  },
  {
    id: 'seed-accompagnement-improve-5',
    themeId: 'accompagnement',
    column: 'improve',
    profile: 'coach',
    text: '(Coach) Clarifier dès le départ le rôle des coachs',
  },
  {
    id: 'seed-accompagnement-start-1',
    themeId: 'accompagnement',
    column: 'start',
    profile: 'participant',
    text: 'Un coach référent par équipe, sur site et sur la durée',
  },
  {
    id: 'seed-accompagnement-start-2',
    themeId: 'accompagnement',
    column: 'start',
    profile: 'participant',
    text: "Appui sur tensions et désaccords d'équipe",
  },
  {
    id: 'seed-accompagnement-start-3',
    themeId: 'accompagnement',
    column: 'start',
    profile: 'participant',
    text: 'Échanges avec alumni et experts externes',
  },
  {
    id: 'seed-accompagnement-start-4',
    themeId: 'accompagnement',
    column: 'start',
    profile: 'coach',
    text: '(Coach) RACI et critères de réussite au lancement',
  },
  {
    id: 'seed-accompagnement-start-5',
    themeId: 'accompagnement',
    column: 'start',
    profile: 'coach',
    text: '(Coach) Sponsors prêts à laisser la main aux équipes',
  },
  {
    id: 'seed-accompagnement-start-6',
    themeId: 'accompagnement',
    column: 'start',
    profile: 'coach',
    text: '(Coach) REX d\'experts et masterclass ciblées par sujet',
  },
  {
    id: 'seed-accompagnement-stop-1',
    themeId: 'accompagnement',
    column: 'stop',
    profile: 'participant',
    text: 'Multiplier les intervenants (retours redondants)',
  },
  {
    id: 'seed-accompagnement-stop-2',
    themeId: 'accompagnement',
    column: 'stop',
    profile: 'coach',
    text: '(Coach) Coachings de 30 min entre deux formations',
  },
  {
    id: 'seed-accompagnement-stop-3',
    themeId: 'accompagnement',
    column: 'stop',
    profile: 'coach',
    text: '(Coach) Pression et correction plutôt qu\'appui',
  },

  // THÉMATIQUE 3 — Apports du dispositif
  {
    id: 'seed-apports-keep-1',
    themeId: 'apports',
    column: 'keep',
    profile: 'participant',
    text: 'NPS +87 et méthodes réutilisables (15/15)',
  },
  {
    id: 'seed-apports-keep-2',
    themeId: 'apports',
    column: 'keep',
    profile: 'participant',
    text: 'IA, vrai accélérateur (4,6/5)',
  },
  {
    id: 'seed-apports-keep-3',
    themeId: 'apports',
    column: 'keep',
    profile: 'participant',
    text: 'Réseau et liens durables',
  },
  {
    id: 'seed-apports-keep-4',
    themeId: 'apports',
    column: 'keep',
    profile: 'coach',
    text: '(Coach) Belle progression, pitchs plus assurés',
  },
  {
    id: 'seed-apports-keep-5',
    themeId: 'apports',
    column: 'keep',
    profile: 'coach',
    text: '(Coach) Prototypes de qualité, IA agentique démontrée',
  },
  {
    id: 'seed-apports-improve-1',
    themeId: 'apports',
    column: 'improve',
    profile: 'participant',
    text: 'Business plan : compétence la moins acquise (3,9/5)',
  },
  {
    id: 'seed-apports-improve-2',
    themeId: 'apports',
    column: 'improve',
    profile: 'participant',
    text: 'Livrables alignés sur la commande Groupama',
  },
  {
    id: 'seed-apports-improve-3',
    themeId: 'apports',
    column: 'improve',
    profile: 'participant',
    text: 'Clarté des attendus',
  },
  {
    id: 'seed-apports-improve-4',
    themeId: 'apports',
    column: 'improve',
    profile: 'coach',
    text: '(Coach) Alignement des sponsors sur le résultat attendu',
  },
  {
    id: 'seed-apports-improve-5',
    themeId: 'apports',
    column: 'improve',
    profile: 'coach',
    text: '(Coach) Visibilité sur les projets adjacents',
  },
  {
    id: 'seed-apports-start-1',
    themeId: 'apports',
    column: 'start',
    profile: 'participant',
    text: 'Plus de latitude sur la problématique',
  },
  {
    id: 'seed-apports-start-2',
    themeId: 'apports',
    column: 'start',
    profile: 'participant',
    text: "Creuser davantage l'angle utilisateur",
  },
  {
    id: 'seed-apports-start-3',
    themeId: 'apports',
    column: 'start',
    profile: 'participant',
    text: 'Plus de temps pour prendre du recul',
  },
  {
    id: 'seed-apports-start-4',
    themeId: 'apports',
    column: 'start',
    profile: 'coach',
    text: '(Coach) Clarifier la vocation : accélérer des sujets stratégiques ?',
  },
  {
    id: 'seed-apports-start-5',
    themeId: 'apports',
    column: 'start',
    profile: 'coach',
    text: '(Coach) Sortir du solutionnisme : tests terrain',
  },
  {
    id: 'seed-apports-stop-1',
    themeId: 'apports',
    column: 'stop',
    profile: 'participant',
    text: 'Multiplier les sujets en parallèle',
  },
  {
    id: 'seed-apports-stop-2',
    themeId: 'apports',
    column: 'stop',
    profile: 'participant',
    text: 'Sujets uniquement orientés techno',
  },
  {
    id: 'seed-apports-stop-3',
    themeId: 'apports',
    column: 'stop',
    profile: 'coach',
    text: '(Coach) Sujets déjà ficelés, solution en tête',
  },
];

export function buildSeedNotesForTheme(themeId?: ThemeId): NoteItem[] {
  const baseTime = 1764000000000;
  return RAW_SEED_NOTES.filter((item) => !themeId || item.themeId === themeId).map(
    (item, idx) => ({
      id: item.id,
      themeId: item.themeId,
      column: item.column,
      text: item.text,
      profile: item.profile,
      authorId: item.profile === 'coach' ? 'seed-coach' : 'seed-participant',
      authorName:
        item.profile === 'coach' ? 'Entretiens REX coachs' : 'Questionnaire collab.',
      isPreFilled: true,
      voterIds: [],
      createdAt: baseTime + idx,
      updatedAt: baseTime + idx,
      rotation: computeRotationFromId(item.id),
    }),
  );
}

export function buildInitialTimer(): TimerState {
  return {
    durationSec: DEFAULT_TIMER_SECONDS,
    remainingSec: DEFAULT_TIMER_SECONDS,
    running: false,
    updatedAt: Date.now(),
  };
}

export function buildInitialTimers(): Record<ThemeId, TimerState> {
  return {
    cadrage: buildInitialTimer(),
    accompagnement: buildInitialTimer(),
    apports: buildInitialTimer(),
  };
}
