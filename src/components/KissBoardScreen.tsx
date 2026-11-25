import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowUpDown,
  Check,
  Clock,
  FileSpreadsheet,
  FileText,
  Lock,
  Merge,
  Pause,
  Play,
  Plus,
  RotateCcw,
  ShieldCheck,
  TrendingUp,
  Unlock,
  UserCog,
  X,
} from 'lucide-react';
import { KISS_COLUMNS, PROFILES, THEMES } from '../types/workshop.ts';
import type {
  KissColumn,
  NoteItem,
  ParticipantIdentity,
  ThemeId,
  TimerState,
  UserProfile,
} from '../types/workshop.ts';
import { MergeNotesModal } from './FacilitatorModal.tsx';
import { PostItNote } from './PostItNote.tsx';

interface KissBoardScreenProps {
  themeId: ThemeId;
  participant: ParticipantIdentity;
  notes: NoteItem[];
  locked: boolean;
  timer: TimerState;
  isFacilitator: boolean;
  onBackHome: () => void;
  onSwitchTheme: (themeId: ThemeId) => void;
  onEditIdentity: () => void;
  onCreateNote: (column: KissColumn, text: string) => Promise<void>;
  onEditNote: (noteId: string, newText: string) => Promise<void>;
  onDeleteNote: (noteId: string) => Promise<void>;
  onMoveNote: (noteId: string, column: KissColumn) => Promise<void>;
  onVoteNote: (noteId: string) => void;
  onControlTimer: (action: 'start' | 'pause' | 'reset') => Promise<void>;
  onToggleLock: (locked: boolean) => Promise<void>;
  onResetTheme: () => Promise<void>;
  onMergeNotes: (primaryId: string, secondaryId: string, mergedText: string) => Promise<void>;
  onExportCSV: () => void;
  onExportPDF: () => void;
  onOpenFacilitator: () => void;
}

const COLUMN_ICONS: Record<KissColumn, typeof Check> = {
  keep: Check,
  improve: TrendingUp,
  start: Play,
  stop: X,
};

function formatTimer(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function KissBoardScreen({
  themeId,
  participant,
  notes,
  locked,
  timer,
  isFacilitator,
  onBackHome,
  onSwitchTheme,
  onEditIdentity,
  onCreateNote,
  onEditNote,
  onDeleteNote,
  onMoveNote,
  onVoteNote,
  onControlTimer,
  onToggleLock,
  onResetTheme,
  onMergeNotes,
  onExportCSV,
  onExportPDF,
  onOpenFacilitator,
}: KissBoardScreenProps) {
  const theme = THEMES.find((t) => t.id === themeId) ?? THEMES[0];
  const isLightThemeHeader = theme.id === 'apports';
  const userProfileCfg = PROFILES[participant.profile];

  // Live ticking display synced from authoritative timer state
  const [displaySeconds, setDisplaySeconds] = useState<number>(timer.remainingSec);

  useEffect(() => {
    function computeRemaining() {
      if (!timer.running) return timer.remainingSec;
      const elapsed = Math.floor((Date.now() - timer.updatedAt) / 1000);
      return Math.max(0, timer.remainingSec - elapsed);
    }

    setDisplaySeconds(computeRemaining());
    if (!timer.running) return;

    const interval = window.setInterval(() => {
      setDisplaySeconds(computeRemaining());
    }, 500);
    return () => window.clearInterval(interval);
  }, [timer]);

  // Sorting, filtering, adding, drag-and-drop, merge mode
  const [sortByVotes, setSortByVotes] = useState(false);
  const [profileFilter, setProfileFilter] = useState<'all' | UserProfile>('all');
  const [addingColumn, setAddingColumn] = useState<KissColumn | null>(null);
  const [newNoteText, setNewNoteText] = useState('');
  const [addError, setAddError] = useState<string | null>(null);
  const [submittingNote, setSubmittingNote] = useState(false);
  const [dragOverColumn, setDragOverColumn] = useState<KissColumn | null>(null);

  // Merge mode state (facilitator)
  const [mergeMode, setMergeMode] = useState(false);
  const [mergeSelection, setMergeSelection] = useState<NoteItem[]>([]);
  const [confirmingReset, setConfirmingReset] = useState(false);

  // Reset transient UI states when switching themes
  useEffect(() => {
    setAddingColumn(null);
    setNewNoteText('');
    setAddError(null);
    setMergeMode(false);
    setMergeSelection([]);
    setConfirmingReset(false);
  }, [themeId]);

  const themeNotes = useMemo(() => {
    return notes.filter((n) => {
      if (n.themeId !== themeId) return false;
      if (profileFilter !== 'all' && n.profile !== profileFilter) return false;
      return true;
    });
  }, [notes, themeId, profileFilter]);

  function getNotesForColumn(col: KissColumn): NoteItem[] {
    const list = themeNotes.filter((n) => n.column === col);
    if (sortByVotes) {
      return [...list].sort(
        (a, b) => b.voterIds.length - a.voterIds.length || a.createdAt - b.createdAt,
      );
    }
    return [...list].sort((a, b) => a.createdAt - b.createdAt);
  }

  async function handleSubmitNewNote(e: React.FormEvent) {
    e.preventDefault();
    if (!addingColumn) return;
    const cleaned = newNoteText.trim();
    if (!cleaned) {
      setAddError('Veuillez écrire une idée avant de valider.');
      return;
    }

    setSubmittingNote(true);
    setAddError(null);
    try {
      await onCreateNote(addingColumn, cleaned);
      setNewNoteText('');
      setAddingColumn(null);
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Impossible d'ajouter le post-it.");
    } finally {
      setSubmittingNote(false);
    }
  }

  function handleDragStart(e: React.DragEvent, noteId: string) {
    e.dataTransfer.setData('text/plain', noteId);
    e.dataTransfer.effectAllowed = 'move';
  }

  function handleDrop(e: React.DragEvent, targetCol: KissColumn) {
    e.preventDefault();
    setDragOverColumn(null);
    const noteId = e.dataTransfer.getData('text/plain');
    if (!noteId) return;
    const note = notes.find((n) => n.id === noteId);
    if (note && note.column !== targetCol) {
      void onMoveNote(noteId, targetCol);
    }
  }

  function handleSelectForMerge(note: NoteItem) {
    setMergeSelection((prev) => {
      if (prev.some((n) => n.id === note.id)) {
        return prev.filter((n) => n.id !== note.id);
      }
      if (prev.length >= 2) {
        return [prev[1], note];
      }
      return [...prev, note];
    });
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* En-tête dans la couleur de la thématique */}
      <header
        style={{ backgroundColor: theme.color, color: theme.headerTextColor }}
        className="transition-colors duration-200"
      >
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 pt-4 pb-5 space-y-4">
          {/* Ligne navigation haute */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={onBackHome}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-[10px] text-[14px] font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                isLightThemeHeader
                  ? 'bg-[#22211C]/10 hover:bg-[#22211C]/18 text-[#22211C]'
                  : 'bg-white/15 hover:bg-white/25 text-white'
              }`}
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Retour aux thématiques</span>
            </button>

            {/* Onglets pour passer directement d'une thématique à l'autre */}
            <nav
              aria-label="Changer de thématique"
              className={`flex items-center gap-1 p-1 rounded-[12px] overflow-x-auto max-w-full ${
                isLightThemeHeader ? 'bg-[#22211C]/10' : 'bg-black/20'
              }`}
            >
              {THEMES.map((t) => {
                const active = t.id === themeId;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => onSwitchTheme(t.id)}
                    className={`px-3 py-1.5 rounded-[9px] text-[13px] font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                      active
                        ? 'bg-white text-[#22211C] shadow-sm'
                        : isLightThemeHeader
                        ? 'text-[#22211C]/80 hover:text-[#22211C] hover:bg-white/40'
                        : 'text-white/85 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {t.number}. {t.title}
                  </button>
                );
              })}
            </nav>

            {/* Identité participant */}
            <button
              type="button"
              onClick={onEditIdentity}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-[10px] bg-white text-[#22211C] text-[14px] font-semibold shadow-sm hover:bg-[#FAF8F2] cursor-pointer whitespace-nowrap shrink-0"
              title="Changer de prénom ou de profil"
            >
              <span
                className="w-3.5 h-3.5 rounded-[4px] shrink-0"
                style={{ backgroundColor: userProfileCfg.color }}
                aria-hidden="true"
              />
              <span className="max-w-[120px] truncate">{participant.name}</span>
              <UserCog className="w-4 h-4 text-[#5E5B52]" />
            </button>
          </div>

          {/* Titre thématique + Minuteur 40 min */}
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pt-1">
            <div>
              <div className="flex flex-wrap items-center gap-2.5 mb-1.5">
                <span
                  className={`text-[12px] font-bold uppercase tracking-[0.16em] ${
                    isLightThemeHeader ? 'text-[#22211C]/80' : 'text-[#F5F2E6]'
                  }`}
                >
                  ATELIER REX
                </span>
                <span
                  className="px-2.5 py-0.5 rounded-full text-[12px] font-bold tracking-wider uppercase"
                  style={{
                    backgroundColor: theme.tabBadgeBg,
                    color: theme.tabBadgeText,
                  }}
                >
                  {theme.tabLabel}
                </span>
              </div>

              <h1 className="font-display text-3xl sm:text-4xl font-bold leading-tight">
                {theme.title}
              </h1>
              <p
                className="mt-1 text-[15px] sm:text-[16px] font-medium"
                style={{ color: theme.headerSubtextColor }}
              >
                {theme.definition}
              </p>

              <div
                className={`mt-3 pt-3 border-t max-w-4xl space-y-1.5 text-[14px] leading-relaxed ${
                  isLightThemeHeader ? 'border-[#22211C]/15 text-[#22211C]' : 'border-white/20 text-white/95'
                }`}
              >
                <p>
                  <span className="font-bold">À explorer : </span>
                  <span className="opacity-95">{theme.subTopics.join(', ')}.</span>
                </p>
                <p className="opacity-90">
                  <span className="font-bold">Pistes de réflexion : </span>
                  <span>{theme.examples}</span>
                </p>
              </div>
            </div>

            {/* Minuteur 40 min */}
            <div
              className={`flex flex-wrap items-center gap-3 px-4 py-2.5 rounded-[14px] shrink-0 ${
                isLightThemeHeader
                  ? 'bg-white/85 text-[#22211C]'
                  : 'bg-black/22 text-white'
              }`}
            >
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 opacity-85" />
                <span className="font-display text-2xl sm:text-3xl font-bold tabular-nums leading-none">
                  {formatTimer(displaySeconds)}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                {!timer.running ? (
                  <button
                    type="button"
                    onClick={() => void onControlTimer('start')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[13px] font-bold cursor-pointer transition-colors ${
                      isLightThemeHeader
                        ? 'bg-[#00321C] text-white hover:bg-[#004A2A]'
                        : 'bg-white text-[#22211C] hover:bg-[#F5F2E6]'
                    }`}
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Démarrer</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => void onControlTimer('pause')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[13px] font-bold cursor-pointer transition-colors ${
                      isLightThemeHeader
                        ? 'bg-[#E16C2A] text-white hover:bg-[#C4561A]'
                        : 'bg-white text-[#22211C] hover:bg-[#F5F2E6]'
                    }`}
                  >
                    <Pause className="w-3.5 h-3.5" />
                    <span>Pause</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => void onControlTimer('reset')}
                  title="Réinitialiser le minuteur à 40:00"
                  aria-label="Réinitialiser le minuteur à 40 minutes"
                  className={`p-1.5 rounded-[8px] cursor-pointer transition-colors ${
                    isLightThemeHeader
                      ? 'bg-[#22211C]/10 hover:bg-[#22211C]/20 text-[#22211C]'
                      : 'bg-white/15 hover:bg-white/25 text-white'
                  }`}
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Barre d'outils (tri par votes, filtres, mode animateur) */}
      <div className="bg-white/80 border-b border-[#E6E1D3]">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Option Trier par votes */}
            <button
              type="button"
              onClick={() => setSortByVotes((prev) => !prev)}
              aria-pressed={sortByVotes}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-[10px] text-[14px] font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                sortByVotes
                  ? 'bg-[#00321C] text-white'
                  : 'bg-[#F5F2E6] text-[#22211C] hover:bg-[#EAE5D3]'
              }`}
            >
              <ArrowUpDown className="w-4 h-4" />
              <span>Trier par votes</span>
            </button>

            {/* Filtre par profil */}
            <div className="flex items-center gap-1 p-1 rounded-[10px] bg-[#F5F2E6]">
              <button
                type="button"
                onClick={() => setProfileFilter('all')}
                className={`px-2.5 py-1 rounded-[7px] text-[13px] font-semibold cursor-pointer whitespace-nowrap ${
                  profileFilter === 'all'
                    ? 'bg-white text-[#22211C] shadow-sm'
                    : 'text-[#5E5B52] hover:text-[#22211C]'
                }`}
              >
                Tous ({notes.filter((n) => n.themeId === themeId).length})
              </button>
              {(['participant', 'coach', 'groupama'] as const).map((pKey) => (
                <button
                  key={pKey}
                  type="button"
                  onClick={() => setProfileFilter(pKey)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[7px] text-[13px] font-semibold cursor-pointer whitespace-nowrap ${
                    profileFilter === pKey
                      ? 'bg-white text-[#22211C] shadow-sm'
                      : 'text-[#5E5B52] hover:text-[#22211C]'
                  }`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-[3px]"
                    style={{ backgroundColor: PROFILES[pKey].color }}
                    aria-hidden="true"
                  />
                  <span>{PROFILES[pKey].shortLabel}</span>
                </button>
              ))}
            </div>

            {locked && (
              <span className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-[#C4561A]">
                <Lock className="w-4 h-4" />
                <span>Ajout verrouillé par l&apos;animateur</span>
              </span>
            )}
          </div>

          {/* Barre d'actions Animateur */}
          {isFacilitator ? (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setMergeMode((prev) => !prev);
                  setMergeSelection([]);
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[9px] text-[13px] font-bold cursor-pointer transition-colors ${
                  mergeMode
                    ? 'bg-[#E16C2A] text-white'
                    : 'bg-[#F5F2E6] hover:bg-[#EAE5D3] text-[#22211C]'
                }`}
              >
                <Merge className="w-4 h-4" />
                <span>{mergeMode ? 'Annuler fusion' : 'Fusionner 2 post-its'}</span>
              </button>

              <button
                type="button"
                onClick={() => void onToggleLock(!locked)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[9px] bg-[#F5F2E6] hover:bg-[#EAE5D3] text-[#22211C] text-[13px] font-bold cursor-pointer"
              >
                {locked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                <span>{locked ? 'Déverrouiller' : 'Verrouiller'}</span>
              </button>

              {!confirmingReset ? (
                <button
                  type="button"
                  onClick={() => setConfirmingReset(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[9px] bg-[#F5F2E6] hover:bg-[#FEE2E2] text-[#22211C] hover:text-[#B91C1C] text-[13px] font-bold cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Réinitialiser</span>
                </button>
              ) : (
                <div className="inline-flex items-center gap-1.5 bg-[#FEE2E2] px-2.5 py-1 rounded-[9px]">
                  <span className="text-[12px] font-bold text-[#B91C1C]">Confirmer ?</span>
                  <button
                    type="button"
                    onClick={async () => {
                      await onResetTheme();
                      setConfirmingReset(false);
                    }}
                    className="px-2 py-0.5 rounded bg-[#B91C1C] text-white text-[12px] font-bold cursor-pointer"
                  >
                    Oui
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmingReset(false)}
                    className="px-2 py-0.5 rounded bg-white text-[#22211C] text-[12px] font-bold cursor-pointer"
                  >
                    Non
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={onExportCSV}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[9px] bg-[#E2ECE7] hover:bg-[#D2E3DA] text-[#00321C] text-[13px] font-bold cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>CSV</span>
              </button>

              <button
                type="button"
                onClick={onExportPDF}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[9px] bg-[#006341] hover:bg-[#004D32] text-white text-[13px] font-bold cursor-pointer"
              >
                <FileText className="w-4 h-4" />
                <span>PDF</span>
              </button>

              <button
                type="button"
                onClick={onOpenFacilitator}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[9px] bg-[#00321C] hover:bg-[#004A2A] text-white text-[13px] font-bold cursor-pointer"
                title="Ouvrir le panneau complet du mode animateur"
              >
                <ShieldCheck className="w-4 h-4 text-[#C7D530]" />
                <span>Animateur</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onOpenFacilitator}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[10px] bg-[#F5F2E6] hover:bg-[#EAE5D3] text-[#22211C] text-[13px] font-bold cursor-pointer whitespace-nowrap"
            >
              <Lock className="w-3.5 h-3.5 text-[#5E5B52]" />
              <span>Mode animateur</span>
            </button>
          )}
        </div>

        {/* Bandeau guide fusion */}
        {mergeMode && (
          <div className="bg-[#FBE7DB] border-t border-[#E16C2A]/20 px-4 sm:px-6 py-2.5">
            <div className="max-w-[1440px] mx-auto flex flex-wrap items-center justify-between gap-2 text-[14px] font-semibold text-[#C4561A]">
              <span>
                Mode fusion actif : cliquez sur le 1er post-it à conserver, puis sur le 2e à
                fusionner ({mergeSelection.length}/2 sélectionné).
              </span>
              <button
                type="button"
                onClick={() => {
                  setMergeMode(false);
                  setMergeSelection([]);
                }}
                className="underline cursor-pointer"
              >
                Quitter
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 4 colonnes blanches KISS */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 py-5">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3.5 items-start">
          {KISS_COLUMNS.map((col) => {
            const Icon = COLUMN_ICONS[col.id];
            const colNotes = getNotesForColumn(col.id);
            const isDropTarget = dragOverColumn === col.id;
            const canAddHere = !locked || isFacilitator;

            return (
              <section
                key={col.id}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                  if (dragOverColumn !== col.id) setDragOverColumn(col.id);
                }}
                onDragLeave={() => {
                  if (dragOverColumn === col.id) setDragOverColumn(null);
                }}
                onDrop={(e) => handleDrop(e, col.id)}
                className={`bg-white rounded-[16px] shadow-[0_2px_10px_rgba(34,33,28,0.05)] p-3.5 flex flex-col min-h-[340px] transition-colors ${
                  isDropTarget ? 'ring-2 ring-[#006341] bg-[#FAF8F2]' : ''
                }`}
              >
                {/* En-tête de colonne */}
                <div className="pb-3 border-b border-[#EFECE0]">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-[#006341] text-white flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4 stroke-[2.5]" />
                      </div>
                      <h2 className="font-display text-2xl font-bold text-[#00321C] leading-none">
                        {col.label}
                      </h2>
                    </div>
                    <span className="text-[13px] font-semibold text-[#5E5B52] tabular-nums">
                      {colNotes.length}
                    </span>
                  </div>
                  <p className="mt-2 text-[14px] text-[#5E5B52] leading-snug">
                    {col.description}
                  </p>
                </div>

                {/* Bouton + Ajouter un post-it ou formulaire inline */}
                <div className="pt-3 pb-3">
                  {addingColumn === col.id ? (
                    <form
                      onSubmit={handleSubmitNewNote}
                      className="rounded-[12px] p-3 border-2 border-[#006341] bg-[#FAF8F2] space-y-2.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1.5 text-[12px] font-bold text-[#22211C]">
                          <span
                            className="w-3 h-3 rounded-[3px]"
                            style={{ backgroundColor: userProfileCfg.color }}
                            aria-hidden="true"
                          />
                          <span>{userProfileCfg.label}</span>
                        </span>
                        <span className="text-[12px] font-semibold text-[#5E5B52] tabular-nums">
                          {newNoteText.length}/80
                        </span>
                      </div>

                      <textarea
                        value={newNoteText}
                        onChange={(e) => {
                          setNewNoteText(e.target.value);
                          if (addError) setAddError(null);
                        }}
                        maxLength={80}
                        rows={3}
                        autoFocus
                        placeholder="1 idée = 1 post-it (80 car. max)"
                        className="w-full rounded-[8px] border border-[#DDD8C8] bg-white p-2.5 text-[14px] text-[#22211C] placeholder:text-[#8B877B] resize-none focus:outline-none focus:ring-2 focus:ring-[#006341]"
                      />

                      {addError && (
                        <p className="text-[13px] font-medium text-[#B91C1C]" role="alert">
                          {addError}
                        </p>
                      )}

                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setAddingColumn(null);
                            setNewNoteText('');
                            setAddError(null);
                          }}
                          className="px-3 py-1.5 rounded-[8px] text-[13px] font-semibold text-[#5E5B52] hover:bg-[#EAE5D3] cursor-pointer"
                        >
                          Annuler
                        </button>
                        <button
                          type="submit"
                          disabled={submittingNote}
                          style={{ backgroundColor: userProfileCfg.color }}
                          className="px-4 py-1.5 rounded-[8px] text-white text-[13px] font-bold hover:opacity-90 cursor-pointer disabled:opacity-60"
                        >
                          Poser le post-it
                        </button>
                      </div>
                    </form>
                  ) : (
                    <button
                      type="button"
                      disabled={!canAddHere}
                      onClick={() => {
                        setAddingColumn(col.id);
                        setNewNoteText('');
                        setAddError(null);
                      }}
                      className={`w-full py-2.5 px-3 rounded-[10px] border-2 border-dashed text-[14px] font-bold inline-flex items-center justify-center gap-2 transition-colors ${
                        canAddHere
                          ? 'border-[#C8C2B0] text-[#00321C] hover:border-[#006341] hover:bg-[#F5F2E6] cursor-pointer'
                          : 'border-[#E6E1D3] text-[#9A9589] bg-[#FAF8F2] cursor-not-allowed'
                      }`}
                    >
                      <Plus className="w-4 h-4" />
                      <span>{canAddHere ? 'Ajouter un post-it' : 'Ajout verrouillé'}</span>
                    </button>
                  )}
                </div>

                {/* Grille des post-its (~160×120 px) */}
                {colNotes.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center py-8 px-3 text-center text-[14px] text-[#8B877B]">
                    Aucun post-it dans cette colonne pour le moment.
                  </div>
                ) : (
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(146px,1fr))] gap-2.5 pt-1">
                    {colNotes.map((note) => (
                      <PostItNote
                        key={note.id}
                        note={note}
                        currentParticipantId={participant.id}
                        isFacilitator={isFacilitator}
                        mergeMode={mergeMode}
                        isSelectedForMerge={mergeSelection.some((n) => n.id === note.id)}
                        onSelectForMerge={handleSelectForMerge}
                        onVote={onVoteNote}
                        onEdit={onEditNote}
                        onDelete={onDeleteNote}
                        onMoveColumn={onMoveNote}
                        onDragStart={handleDragStart}
                      />
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      </main>

      {/* Modale de fusion lorsque 2 post-its sont sélectionnés */}
      {mergeSelection.length === 2 && (
        <MergeNotesModal
          primaryNote={mergeSelection[0]}
          secondaryNote={mergeSelection[1]}
          onCancel={() => {
            setMergeSelection([]);
          }}
          onConfirmMerge={async (mergedText) => {
            await onMergeNotes(mergeSelection[0].id, mergeSelection[1].id, mergedText);
            setMergeSelection([]);
            setMergeMode(false);
          }}
        />
      )}
    </div>
  );
}
