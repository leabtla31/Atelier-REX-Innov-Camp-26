import React, { useState } from 'react';
import { Check, ArrowRight } from 'lucide-react';
import { PROFILES } from '../types/workshop.ts';
import type { ParticipantIdentity, UserProfile } from '../types/workshop.ts';
import { SignatureCirclesMotif } from './GroupamaMotif.tsx';

interface ArrivalModalProps {
  initialIdentity: ParticipantIdentity | null;
  onConfirm: (identity: ParticipantIdentity) => void;
  onCancel?: () => void;
  isEditing?: boolean;
}

const PROFILE_ORDER: UserProfile[] = ['participant', 'coach', 'groupama'];

export function ArrivalModal({
  initialIdentity,
  onConfirm,
  onCancel,
  isEditing = false,
}: ArrivalModalProps) {
  const [name, setName] = useState(initialIdentity?.name ?? '');
  const [profile, setProfile] = useState<UserProfile>(initialIdentity?.profile ?? 'participant');
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cleaned = name.trim();
    if (cleaned.length < 2) {
      setError('Merci de saisir votre prénom (2 caractères minimum).');
      return;
    }

    const id =
      initialIdentity?.id ??
      (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);

    onConfirm({
      id,
      name: cleaned.slice(0, 40),
      profile,
    });
  }

  return (
    <div
      className={
        isEditing
          ? 'fixed inset-0 z-50 flex items-center justify-center bg-[#00321C]/50 p-4'
          : 'min-h-screen bg-[#F5F2E6] flex items-center justify-center p-4 sm:p-8 relative overflow-hidden'
      }
      role="dialog"
      aria-modal="true"
      aria-labelledby="arrival-title"
    >
      {!isEditing && <SignatureCirclesMotif />}

      <div className="relative z-10 w-full max-w-xl bg-white rounded-[16px] shadow-[0_6px_28px_rgba(34,33,28,0.08)] p-6 sm:p-10">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#E16C2A] mb-2">
          ATELIER REX
        </p>

        <h1
          id="arrival-title"
          className="font-display text-3xl sm:text-4xl font-bold text-[#00321C] leading-tight"
        >
          {isEditing ? 'Modifier votre profil' : "Bienvenue à l'atelier Innov'Camp 26"}
        </h1>

        <p className="mt-2 text-[15px] text-[#5E5B52] leading-relaxed">
          Aucun compte requis. Indiquez simplement votre prénom et votre rôle pour que vos
          post-its prennent automatiquement la bonne couleur.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          <div>
            <label
              htmlFor="participant-name"
              className="block text-sm font-semibold text-[#22211C] mb-2"
            >
              Votre prénom
            </label>
            <input
              id="participant-name"
              type="text"
              value={name}
              maxLength={40}
              autoFocus
              placeholder="Ex. Camille"
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError(null);
              }}
              className="w-full rounded-[12px] border border-[#DDD8C8] bg-[#FAF8F2] px-4 py-3 text-[16px] text-[#22211C] placeholder:text-[#8B877B] focus:outline-none focus:ring-2 focus:ring-[#006341] focus:border-[#006341]"
            />
          </div>

          <div>
            <span className="block text-sm font-semibold text-[#22211C] mb-2.5">
              Votre profil
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {PROFILE_ORDER.map((profileKey) => {
                const cfg = PROFILES[profileKey];
                const selected = profile === profileKey;
                return (
                  <button
                    key={profileKey}
                    type="button"
                    onClick={() => setProfile(profileKey)}
                    className={`text-left rounded-[12px] p-3.5 border-2 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#006341] ${
                      selected
                        ? 'border-[#00321C] bg-[#FAF8F2]'
                        : 'border-[#E6E2D6] bg-white hover:border-[#C5BFB0]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span
                        className="inline-block w-5 h-5 rounded-[5px] shrink-0"
                        style={{ backgroundColor: cfg.color }}
                        aria-hidden="true"
                      />
                      {selected && (
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#00321C] text-white">
                          <Check className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </div>
                    <div className="text-[15px] font-bold text-[#22211C] leading-snug">
                      {cfg.label}
                    </div>
                    <div className="mt-1 text-[13px] text-[#5E5B52] leading-snug">
                      {cfg.description}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {error && (
            <p className="text-sm font-medium text-[#B91C1C]" role="alert">
              {error}
            </p>
          )}

          <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
            {isEditing && onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="px-5 py-3 rounded-[12px] text-[15px] font-semibold text-[#5E5B52] hover:bg-[#F5F2E6] transition-colors cursor-pointer"
              >
                Annuler
              </button>
            )}
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-[12px] bg-[#006341] hover:bg-[#004D32] text-white text-[15px] font-semibold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#006341]"
            >
              <span>{isEditing ? 'Enregistrer' : "Rejoindre l'atelier"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
