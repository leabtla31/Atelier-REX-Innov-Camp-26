import React, { useState } from 'react';
import { ArrowRightLeft, Check, Pencil, ThumbsUp, Trash2, X } from 'lucide-react';
import { KISS_COLUMNS, PROFILES } from '../types/workshop.ts';
import type { KissColumn, NoteItem } from '../types/workshop.ts';

interface PostItNoteProps {
  note: NoteItem;
  currentParticipantId: string;
  isFacilitator: boolean;
  mergeMode: boolean;
  isSelectedForMerge: boolean;
  onSelectForMerge: (note: NoteItem) => void;
  onVote: (noteId: string) => void;
  onEdit: (noteId: string, newText: string) => Promise<void>;
  onDelete: (noteId: string) => Promise<void>;
  onMoveColumn: (noteId: string, targetColumn: KissColumn) => Promise<void>;
  onDragStart: (e: React.DragEvent, noteId: string) => void;
}

export function PostItNote({
  note,
  currentParticipantId,
  isFacilitator,
  mergeMode,
  isSelectedForMerge,
  onSelectForMerge,
  onVote,
  onEdit,
  onDelete,
  onMoveColumn,
  onDragStart,
}: PostItNoteProps) {
  const [editing, setEditing] = useState(false);
  const [draftText, setDraftText] = useState(note.text);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [showMoveMenu, setShowMoveMenu] = useState(false);

  const profileCfg = PROFILES[note.profile];
  const hasVoted = note.voterIds.includes(currentParticipantId);
  const canEdit = isFacilitator || note.isPreFilled || note.authorId === currentParticipantId;
  const canDelete = isFacilitator || (!note.isPreFilled && note.authorId === currentParticipantId);
  const maxEditChars = isFacilitator ? 160 : note.isPreFilled && note.profile === 'coach' ? 88 : 80;

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    const cleaned = draftText.trim();
    if (!cleaned) {
      setEditError('Texte requis.');
      return;
    }
    setSaving(true);
    setEditError(null);
    try {
      await onEdit(note.id, cleaned);
      setEditing(false);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  }

  function handleCardClick() {
    if (mergeMode) {
      onSelectForMerge(note);
    }
  }

  return (
    <article
      draggable={!editing && !mergeMode}
      onDragStart={(e) => {
        if (editing || mergeMode) return;
        onDragStart(e, note.id);
      }}
      onClick={handleCardClick}
      style={{
        backgroundColor: profileCfg.color,
        transform: `rotate(${note.rotation}deg)`,
      }}
      className={`postit-paper relative rounded-[6px] p-3 min-h-[126px] flex flex-col justify-between text-white select-none ${
        mergeMode
          ? 'cursor-pointer ring-offset-2 ' +
            (isSelectedForMerge
              ? 'ring-4 ring-[#00321C] scale-[1.02]'
              : 'hover:ring-2 hover:ring-[#22211C]/40')
          : editing
          ? 'cursor-default'
          : 'cursor-grab active:cursor-grabbing'
      }`}
    >
      {/* Subtle folded paper corner */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-0 right-0 w-0 h-0 border-t-[12px] border-l-[12px] border-t-white/25 border-l-transparent rounded-bl-[2px]"
      />

      {editing ? (
        <form onSubmit={handleSaveEdit} className="flex flex-col gap-2 h-full">
          <textarea
            value={draftText}
            onChange={(e) => setDraftText(e.target.value)}
            maxLength={maxEditChars}
            rows={3}
            autoFocus
            className="w-full rounded-[6px] bg-white/95 text-[#22211C] text-[14px] font-medium p-1.5 leading-snug resize-none focus:outline-none focus:ring-2 focus:ring-[#00321C]"
          />
          {editError && <p className="text-[12px] text-white font-semibold">{editError}</p>}
          <div className="flex items-center justify-between gap-1">
            <span className="text-[11px] text-white/90 tabular-nums">
              {draftText.length}/{maxEditChars}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  setDraftText(note.text);
                  setEditError(null);
                }}
                className="p-1.5 rounded bg-black/20 hover:bg-black/35 text-white cursor-pointer"
                aria-label="Annuler la modification"
              >
                <X className="w-3.5 h-3.5" />
              </button>
              <button
                type="submit"
                disabled={saving}
                className="p-1.5 rounded bg-[#00321C] hover:bg-[#004A2A] text-white cursor-pointer disabled:opacity-60"
                aria-label="Valider la modification"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </form>
      ) : (
        <>
          {/* Text + top actions */}
          <div className="pr-2">
            <p className="text-[14px] font-bold leading-[1.32] text-white break-words">
              {note.text}
            </p>
          </div>

          {/* Bottom metadata + actions */}
          <div className="mt-3 pt-2 border-t border-white/20 flex items-end justify-between gap-1.5">
            <div className="min-w-0 flex flex-col gap-0.5">
              <span className="text-[12px] font-medium text-white/90 truncate">
                {note.isPreFilled
                  ? note.profile === 'coach'
                    ? 'coachs'
                    : note.profile === 'groupama'
                    ? 'groupama'
                    : 'participants'
                  : note.authorName}
              </span>
              {!mergeMode && (
                <div className="flex items-center gap-1">
                  {canEdit && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDraftText(note.text);
                        setEditing(true);
                      }}
                      className="p-1 rounded bg-black/15 hover:bg-black/30 text-white transition-colors cursor-pointer"
                      title="Modifier ce post-it"
                      aria-label="Modifier ce post-it"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                  )}
                  {canDelete && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        void onDelete(note.id);
                      }}
                      className="p-1 rounded bg-black/15 hover:bg-black/35 text-white transition-colors cursor-pointer"
                      title="Supprimer"
                      aria-label="Supprimer ce post-it"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowMoveMenu((prev) => !prev);
                      }}
                      className="p-1 rounded bg-black/15 hover:bg-black/30 text-white transition-colors cursor-pointer"
                      title="Déplacer vers une autre colonne"
                      aria-label="Déplacer vers une autre colonne"
                    >
                      <ArrowRightLeft className="w-3 h-3" />
                    </button>
                    {showMoveMenu && (
                      <div
                        className="absolute left-0 bottom-7 z-30 w-36 rounded-[10px] bg-white text-[#22211C] shadow-lg border border-[#E6E1D3] p-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="px-2 py-1 text-[11px] font-semibold text-[#5E5B52]">
                          Déplacer vers :
                        </div>
                        {KISS_COLUMNS.filter((c) => c.id !== note.column).map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              setShowMoveMenu(false);
                              void onMoveColumn(note.id, c.id);
                            }}
                            className="w-full text-left px-2 py-1.5 text-[13px] font-medium rounded-[6px] hover:bg-[#F5F2E6] cursor-pointer"
                          >
                            {c.label} ({c.shortAction})
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Bouton pouce levé (soutien) */}
            {!mergeMode && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onVote(note.id);
                }}
                aria-pressed={hasVoted}
                title={
                  hasVoted
                    ? 'Retirer mon soutien'
                    : 'Approuver cette idée'
                }
                aria-label={`Soutenir cette idée (${note.voterIds.length} votes)`}
                className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-[8px] text-[13px] font-bold tabular-nums transition-all active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
                  hasVoted
                    ? 'bg-white text-[#00321C] shadow-sm'
                    : 'bg-black/20 hover:bg-white/25 text-white'
                }`}
              >
                <ThumbsUp className={`w-3.5 h-3.5 ${hasVoted ? 'fill-current' : ''}`} />
                {note.voterIds.length > 0 && <span>{note.voterIds.length}</span>}
              </button>
            )}
          </div>
        </>
      )}
    </article>
  );
}
