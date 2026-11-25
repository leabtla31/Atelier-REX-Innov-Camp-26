import React, { useState } from 'react';
import {
  AlertTriangle,
  Download,
  FileSpreadsheet,
  FileText,
  Lock,
  LogOut,
  RotateCcw,
  ShieldCheck,
  Unlock,
  X,
} from 'lucide-react';
import { PROFILES, THEMES } from '../types/workshop.ts';
import type { NoteItem, ThemeId } from '../types/workshop.ts';

interface FacilitatorModalProps {
  isOpen: boolean;
  isFacilitator: boolean;
  requiresClaim: boolean;
  activeThemeId: ThemeId | null;
  lockedThemes: Record<ThemeId, boolean>;
  onClose: () => void;
  onClaimPasscode: (passcode: string) => Promise<void>;
  onLogin: (passcode: string) => Promise<void>;
  onLogout: () => void;
  onResetTheme: (themeId: ThemeId) => Promise<void>;
  onToggleLock: (themeId: ThemeId, locked: boolean) => Promise<void>;
  onExportCSV: () => void;
  onExportPDF: () => void;
}

export function FacilitatorModal({
  isOpen,
  isFacilitator,
  requiresClaim,
  activeThemeId,
  lockedThemes,
  onClose,
  onClaimPasscode,
  onLogin,
  onLogout,
  onResetTheme,
  onToggleLock,
  onExportCSV,
  onExportPDF,
}: FacilitatorModalProps) {
  const [passcode, setPasscode] = useState('');
  const [confirmPasscode, setConfirmPasscode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmResetTheme, setConfirmResetTheme] = useState<ThemeId | null>(null);

  if (!isOpen) return null;

  async function handleAuthSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (requiresClaim) {
      if (passcode.trim().length < 4) {
        setError('Le code doit contenir au moins 4 caractères.');
        return;
      }
      if (passcode.trim() !== confirmPasscode.trim()) {
        setError('Les deux saisies ne correspondent pas.');
        return;
      }
      setSubmitting(true);
      try {
        await onClaimPasscode(passcode.trim());
        setPasscode('');
        setConfirmPasscode('');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur');
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (!passcode.trim()) {
      setError('Veuillez saisir le code animateur.');
      return;
    }

    setSubmitting(true);
    try {
      await onLogin(passcode.trim());
      setPasscode('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Code incorrect.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#00321C]/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="facilitator-modal-title"
    >
      <div className="w-full max-w-lg bg-white rounded-[16px] shadow-[0_12px_36px_rgba(34,33,28,0.18)] p-6 sm:p-7 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#E16C2A] mb-1">
              ATELIER REX
            </p>
            <h2
              id="facilitator-modal-title"
              className="font-display text-2xl sm:text-3xl font-bold text-[#00321C]"
            >
              Mode animateur
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-[10px] text-[#5E5B52] hover:bg-[#F5F2E6] hover:text-[#22211C] cursor-pointer"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {!isFacilitator ? (
          <form onSubmit={handleAuthSubmit} className="mt-5 space-y-4">
            <p className="text-[15px] text-[#5E5B52] leading-relaxed">
              {requiresClaim
                ? "Première activation : choisissez un code simple (4 caractères min.) pour protéger l'espace animateur."
                : 'Saisissez le code animateur pour verrouiller les ajouts, fusionner ou réinitialiser une thématique et exporter les résultats.'}
            </p>

            <div>
              <label
                htmlFor="facilitator-code"
                className="block text-sm font-semibold text-[#22211C] mb-1.5"
              >
                {requiresClaim ? 'Nouveau code animateur' : 'Code animateur'}
              </label>
              <input
                id="facilitator-code"
                type="password"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                autoFocus
                placeholder="••••"
                className="w-full rounded-[12px] border border-[#DDD8C8] bg-[#FAF8F2] px-4 py-2.5 text-[16px] text-[#22211C] focus:outline-none focus:ring-2 focus:ring-[#006341]"
              />
            </div>

            {requiresClaim && (
              <div>
                <label
                  htmlFor="facilitator-code-confirm"
                  className="block text-sm font-semibold text-[#22211C] mb-1.5"
                >
                  Confirmer le code
                </label>
                <input
                  id="facilitator-code-confirm"
                  type="password"
                  value={confirmPasscode}
                  onChange={(e) => setConfirmPasscode(e.target.value)}
                  placeholder="••••"
                  className="w-full rounded-[12px] border border-[#DDD8C8] bg-[#FAF8F2] px-4 py-2.5 text-[16px] text-[#22211C] focus:outline-none focus:ring-2 focus:ring-[#006341]"
                />
              </div>
            )}

            {error && (
              <p className="text-sm font-medium text-[#B91C1C]" role="alert">
                {error}
              </p>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-[10px] text-[14px] font-semibold text-[#5E5B52] hover:bg-[#F5F2E6] cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[10px] bg-[#00321C] hover:bg-[#004A2A] text-white text-[14px] font-semibold cursor-pointer disabled:opacity-60"
              >
                <ShieldCheck className="w-4 h-4 text-[#C7D530]" />
                <span>{requiresClaim ? 'Enregistrer et activer' : 'Déverrouiller'}</span>
              </button>
            </div>
          </form>
        ) : (
          <div className="mt-5 space-y-6">
            {/* Exports */}
            <div className="space-y-2.5">
              <h3 className="text-sm font-bold uppercase tracking-wider text-[#5E5B52]">
                Exports de l&apos;atelier complet
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={onExportCSV}
                  className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-[12px] bg-[#E2ECE7] hover:bg-[#D2E3DA] text-[#00321C] text-[14px] font-bold transition-colors cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Exporter en CSV</span>
                  <Download className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={onExportPDF}
                  className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-[12px] bg-[#006341] hover:bg-[#004D32] text-white text-[14px] font-bold transition-colors cursor-pointer"
                >
                  <FileText className="w-4 h-4" />
                  <span>Exporter en PDF (3 pages)</span>
                  <Download className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Contrôle par thématique */}
            <div className="space-y-2.5">
              <h3 className="text-sm font-bold uppercase tracking-wider text-[#5E5B52]">
                Contrôle des thématiques
              </h3>
              <div className="space-y-2.5">
                {THEMES.map((theme) => {
                  const isLocked = lockedThemes[theme.id];
                  const isCurrent = activeThemeId === theme.id;
                  const isConfirmingReset = confirmResetTheme === theme.id;

                  return (
                    <div
                      key={theme.id}
                      className={`rounded-[12px] border p-3.5 ${
                        isCurrent ? 'border-[#006341] bg-[#FAF8F2]' : 'border-[#E6E1D3] bg-white'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <div className="text-[12px] font-bold uppercase tracking-wider text-[#5E5B52]">
                            {theme.tabLabel}
                          </div>
                          <div className="text-[15px] font-bold text-[#22211C]">{theme.title}</div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => void onToggleLock(theme.id, !isLocked)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[13px] font-semibold transition-colors cursor-pointer ${
                              isLocked
                                ? 'bg-[#FBE7DB] text-[#C4561A] hover:bg-[#F7D7C4]'
                                : 'bg-[#F5F2E6] text-[#22211C] hover:bg-[#EAE5D3]'
                            }`}
                          >
                            {isLocked ? (
                              <>
                                <Unlock className="w-3.5 h-3.5" />
                                <span>Déverrouiller</span>
                              </>
                            ) : (
                              <>
                                <Lock className="w-3.5 h-3.5" />
                                <span>Verrouiller</span>
                              </>
                            )}
                          </button>

                          {!isConfirmingReset && (
                            <button
                              type="button"
                              onClick={() => setConfirmResetTheme(theme.id)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] bg-[#F5F2E6] hover:bg-[#FEE2E2] text-[#5E5B52] hover:text-[#B91C1C] text-[13px] font-semibold transition-colors cursor-pointer"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Réinitialiser</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {isConfirmingReset && (
                        <div className="mt-3 pt-3 border-t border-[#E6E1D3] flex flex-wrap items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#B91C1C]">
                            <AlertTriangle className="w-4 h-4 shrink-0" />
                            Supprimer les ajouts et restaurer les post-its pré-remplis ?
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setConfirmResetTheme(null)}
                              className="px-3 py-1 rounded-[8px] text-[13px] font-semibold text-[#5E5B52] hover:bg-[#EAE5D3] cursor-pointer"
                            >
                              Annuler
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                await onResetTheme(theme.id);
                                setConfirmResetTheme(null);
                              }}
                              className="px-3 py-1 rounded-[8px] bg-[#B91C1C] hover:bg-[#991B1B] text-white text-[13px] font-semibold cursor-pointer"
                            >
                              Confirmer
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-2 border-t border-[#E6E1D3] flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  onLogout();
                  onClose();
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[10px] text-[14px] font-semibold text-[#5E5B52] hover:bg-[#F5F2E6] cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Quitter le mode animateur</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 rounded-[10px] bg-[#00321C] text-white text-[14px] font-semibold hover:bg-[#004A2A] cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface MergeNotesModalProps {
  primaryNote: NoteItem;
  secondaryNote: NoteItem;
  onCancel: () => void;
  onConfirmMerge: (mergedText: string) => Promise<void>;
}

export function MergeNotesModal({
  primaryNote,
  secondaryNote,
  onCancel,
  onConfirmMerge,
}: MergeNotesModalProps) {
  const cleanSecondary = secondaryNote.text.replace(/^\(Coach\)\s*/i, '');
  const initialCombined = `${primaryNote.text} / ${cleanSecondary}`.slice(0, 160);
  const [mergedText, setMergedText] = useState(initialCombined);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const combinedVotesCount = new Set([...primaryNote.voterIds, ...secondaryNote.voterIds]).size;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!mergedText.trim()) {
      setError('Le texte fusionné ne peut pas être vide.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onConfirmMerge(mergedText.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la fusion.');
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#00321C]/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="merge-modal-title"
    >
      <div className="w-full max-w-lg bg-white rounded-[16px] shadow-[0_12px_36px_rgba(34,33,28,0.18)] p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#E16C2A] mb-1">
              MODE ANIMATEUR
            </p>
            <h2
              id="merge-modal-title"
              className="font-display text-2xl font-bold text-[#00321C]"
            >
              Fusionner 2 post-its
            </h2>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-2 rounded-[10px] text-[#5E5B52] hover:bg-[#F5F2E6] cursor-pointer"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div
            className="rounded-[8px] p-3 text-white text-[13px] font-bold"
            style={{ backgroundColor: PROFILES[primaryNote.profile].color }}
          >
            <div className="text-[11px] uppercase opacity-85 mb-1">Post-it conservé</div>
            {primaryNote.text}
          </div>
          <div
            className="rounded-[8px] p-3 text-white text-[13px] font-bold opacity-90"
            style={{ backgroundColor: PROFILES[secondaryNote.profile].color }}
          >
            <div className="text-[11px] uppercase opacity-85 mb-1">Post-it absorbé</div>
            {secondaryNote.text}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="merged-text" className="text-sm font-semibold text-[#22211C]">
                Texte du post-it fusionné
              </label>
              <span className="text-xs text-[#5E5B52] tabular-nums">
                {mergedText.length}/160 · {combinedVotesCount} vote(s) cumulés
              </span>
            </div>
            <textarea
              id="merged-text"
              value={mergedText}
              onChange={(e) => setMergedText(e.target.value)}
              maxLength={160}
              rows={3}
              className="w-full rounded-[12px] border border-[#DDD8C8] bg-[#FAF8F2] px-3.5 py-2.5 text-[15px] text-[#22211C] focus:outline-none focus:ring-2 focus:ring-[#006341]"
            />
          </div>

          {error && (
            <p className="text-sm font-medium text-[#B91C1C]" role="alert">
              {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 rounded-[10px] text-[14px] font-semibold text-[#5E5B52] hover:bg-[#F5F2E6] cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-[10px] bg-[#006341] hover:bg-[#004D32] text-white text-[14px] font-semibold cursor-pointer disabled:opacity-60"
            >
              Valider la fusion
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
