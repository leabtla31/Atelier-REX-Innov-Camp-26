import { Lock, ShieldCheck, Users } from 'lucide-react';
import { PROFILES } from '../types/workshop.ts';

interface BottomLegendBarProps {
  onlineCount: number;
  connected: boolean;
  isFacilitator: boolean;
  onOpenFacilitator: () => void;
}

export function BottomLegendBar({
  onlineCount,
  connected,
  isFacilitator,
  onOpenFacilitator,
}: BottomLegendBarProps) {
  return (
    <footer className="sticky bottom-0 z-30 bg-white/95 backdrop-blur-sm border-t border-[#E6E1D3]">
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
        {/* Légende code couleur toujours visible */}
        <div
          className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[14px]"
          aria-label="Légende du code couleur des post-its"
        >
          <span className="font-semibold text-[#22211C] hidden sm:inline">
            Couleurs des post-its :
          </span>
          {(['coach', 'participant', 'groupama'] as const).map((profileKey) => {
            const p = PROFILES[profileKey];
            return (
              <span key={profileKey} className="inline-flex items-center gap-2 text-[#22211C]">
                <span
                  className="w-4 h-4 rounded-[4px] shrink-0 shadow-[0_1px_2px_rgba(0,0,0,0.18)]"
                  style={{ backgroundColor: p.color }}
                  aria-hidden="true"
                />
                <span className="font-medium whitespace-nowrap">{p.label}</span>
              </span>
            );
          })}
        </div>

        {/* Participants connectés & Mode animateur */}
        <div className="flex items-center gap-3 ml-auto">
          <span
            className="inline-flex items-center gap-1.5 text-[14px] text-[#5E5B52] whitespace-nowrap tabular-nums"
            title={connected ? 'Synchronisation en direct active' : 'Reconnexion en cours'}
          >
            <Users className="w-4 h-4 text-[#296654]" />
            <span>
              {onlineCount} en ligne
            </span>
          </span>

          <button
            type="button"
            onClick={onOpenFacilitator}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-[10px] text-[14px] font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#006341] ${
              isFacilitator
                ? 'bg-[#00321C] text-white hover:bg-[#004A2A]'
                : 'bg-[#F5F2E6] text-[#22211C] hover:bg-[#EAE5D3]'
            }`}
          >
            {isFacilitator ? (
              <>
                <ShieldCheck className="w-4 h-4 text-[#C7D530]" />
                <span>Animateur actif</span>
              </>
            ) : (
              <>
                <Lock className="w-3.5 h-3.5 text-[#5E5B52]" />
                <span>Mode animateur</span>
              </>
            )}
          </button>
        </div>
      </div>
    </footer>
  );
}
