export type ThemeId = 'cadrage' | 'accompagnement' | 'apports';

export type KissColumn = 'keep' | 'improve' | 'start' | 'stop';

export type UserProfile = 'coach' | 'participant' | 'groupama';

export interface ProfileConfig {
  id: UserProfile;
  label: string;
  shortLabel: string;
  description: string;
  color: string;
  hoverColor: string;
}

export interface ThemeConfig {
  id: ThemeId;
  number: 1 | 2 | 3;
  tabLabel: string;
  title: string;
  definition: string;
  subTopics: string[];
  examples: string;
  color: string;
  tintedBg: string;
  titleColor: string;
  headerTextColor: string;
  headerSubtextColor: string;
  tabBadgeBg: string;
  tabBadgeText: string;
}

export interface KissColumnConfig {
  id: KissColumn;
  label: string;
  shortAction: string;
  description: string;
}

export interface NoteItem {
  id: string;
  themeId: ThemeId;
  column: KissColumn;
  text: string;
  profile: UserProfile;
  authorId: string;
  authorName: string;
  isPreFilled: boolean;
  voterIds: string[];
  createdAt: number;
  updatedAt: number;
  rotation: number;
}

export interface TimerState {
  durationSec: number;
  remainingSec: number;
  running: boolean;
  updatedAt: number;
}

export interface PresenceUser {
  connectionId: string;
  participantId: string;
  name: string;
  profile: UserProfile;
  currentTheme: ThemeId | null;
}

export interface WorkshopPublicState {
  notes: NoteItem[];
  lockedThemes: Record<ThemeId, boolean>;
  timers: Record<ThemeId, TimerState>;
}

export interface ParticipantIdentity {
  id: string;
  name: string;
  profile: UserProfile;
}

export const DEFAULT_TIMER_SECONDS = 40 * 60;

export const PROFILES: Record<UserProfile, ProfileConfig> = {
  coach: {
    id: 'coach',
    label: 'Onepoint',
    shortLabel: 'Onepoint',
    description: 'Formatrices et coachs Onepoint',
    color: '#1F6FD1',
    hoverColor: '#195EB3',
  },
  participant: {
    id: 'participant',
    label: 'Participants',
    shortLabel: 'Participants',
    description: 'Intrapreneurs de la promotion 2026',
    color: '#E16C2A',
    hoverColor: '#C85B1E',
  },
  groupama: {
    id: 'groupama',
    label: 'Équipe Groupama',
    shortLabel: 'Groupama',
    description: 'Sponsors, équipe Transformation & DTDG',
    color: '#3E9B3A',
    hoverColor: '#338430',
  },
};

export const THEMES: ThemeConfig[] = [
  {
    id: 'cadrage',
    number: 1,
    tabLabel: 'THÉMATIQUE 1',
    title: 'Cadrage et organisation',
    definition: 'Comment le programme a été préparé et piloté',
    subTopics: [
      'Préparation amont et communication',
      'Animation des temps forts',
      'Logistique (salles, plannings)',
      'Casting des équipes',
      'Rythme et durée du programme',
    ],
    examples:
      "La charge de travail annoncée était-elle réaliste ? L'enchaînement des sprints, les livrables et les salles facilitaient-ils votre avancée ?",
    color: '#296654',
    tintedBg: '#E2ECE7',
    titleColor: '#296654',
    headerTextColor: '#FFFFFF',
    headerSubtextColor: '#E2ECE7',
    tabBadgeBg: '#FFFFFF',
    tabBadgeText: '#296654',
  },
  {
    id: 'accompagnement',
    number: 2,
    tabLabel: 'THÉMATIQUE 2',
    title: 'Accompagnement',
    definition: "L'appui reçu par les équipes : posture, disponibilité, apports",
    subTopics: [
      'DTDG',
      'Coachs équipes',
      'Charles-Henri',
      'Formations',
      'Sponsors',
    ],
    examples:
      'Le format et le rythme des coachings vous ont-ils aidé ? Les sponsors étaient-ils disponibles ? Quelles masterclass ou temps d’échange ont été les plus utiles ?',
    color: '#E16C2A',
    tintedBg: '#FBE7DB',
    titleColor: '#C4561A',
    headerTextColor: '#FFFFFF',
    headerSubtextColor: '#FFF3EC',
    tabBadgeBg: '#FFFFFF',
    tabBadgeText: '#C4561A',
  },
  {
    id: 'apports',
    number: 3,
    tabLabel: 'THÉMATIQUE 3',
    title: 'Apports du dispositif',
    definition: "L'efficacité du programme pour les sujets et la suite",
    subTopics: [
      'Approfondissement et exploration des sujets',
      'Alignement entre les parties prenantes',
      'Utilité des travaux pour préparer et orienter la suite',
    ],
    examples:
      "Quel impact ont eu l'IA et le prototypage sur votre projet ? Les attendus Groupama étaient-ils clairs ? Qu'est-ce qui a manqué pour préparer l'après-camp ?",
    color: '#C7D530',
    tintedBg: '#F2F5D6',
    titleColor: '#5F6E0C',
    headerTextColor: '#22211C',
    headerSubtextColor: '#3F470A',
    tabBadgeBg: '#22211C',
    tabBadgeText: '#FFFFFF',
  },
];

export const KISS_COLUMNS: KissColumnConfig[] = [
  {
    id: 'keep',
    label: 'Keep',
    shortAction: 'on garde',
    description: "Ce qui a bien fonctionné et que l'on garde",
  },
  {
    id: 'improve',
    label: 'Improve',
    shortAction: 'on améliore',
    description: 'Ce qui doit être amélioré ou ajusté',
  },
  {
    id: 'start',
    label: 'Start',
    shortAction: 'on lance',
    description: "Ce que l'on devrait commencer à faire",
  },
  {
    id: 'stop',
    label: 'Stop',
    shortAction: 'on arrête',
    description: "Ce que l'on doit arrêter",
  },
];

export function computeRotationFromId(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) % 997;
  }
  const normalized = (hash % 41) / 10 - 2; // -2.0 to +2.0 degrees
  return Math.round(normalized * 10) / 10;
}
