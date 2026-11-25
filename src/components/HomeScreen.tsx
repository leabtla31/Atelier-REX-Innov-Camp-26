import { ArrowRight, Check, Lock, Play, ShieldCheck, TrendingUp, UserCog, X } from 'lucide-react';
import { PROFILES, THEMES } from '../types/workshop.ts';
import type { NoteItem, ParticipantIdentity, ThemeId } from '../types/workshop.ts';
import { SignatureCirclesMotif } from './GroupamaMotif.tsx';

interface HomeScreenProps {
  participant: ParticipantIdentity;
  notes: NoteItem[];
  isFacilitator: boolean;
  onSelectTheme: (themeId: ThemeId) => void;
  onEditIdentity: () => void;
  onOpenFacilitator: () => void;
}

const KISS_INTRO = [
  {
    id: 'keep',
    title: 'Keep',
    subtitle: 'on garde',
    icon: Check,
  },
  {
    id: 'improve',
    title: 'Improve',
    subtitle: 'on améliore',
    icon: TrendingUp,
  },
  {
    id: 'start',
    title: 'Start',
    subtitle: 'on lance',
    icon: Play,
  },
  {
    id: 'stop',
    title: 'Stop',
    subtitle: 'on arrête',
    icon: X,
  },
];

const WORKSHOP_STEPS = [
  {
    tab: "AVANT L'ATELIER · c'est fait",
    tabBg: '#296654',
    tabText: '#FFFFFF',
    description:
      'retours collaborateurs (questionnaire) et coachs (entretiens REX) déjà posés en post-its',
  },
  {
    tab: 'EN SÉANCE · 40 min / thématique',
    tabBg: '#E16C2A',
    tabText: '#FFFFFF',
    description:
      'réagissez aux post-its pré-remplis, ajoutez vos idées (1 idée = 1 post-it)',
  },
  {
    tab: 'ENSEMBLE · on converge',
    tabBg: '#C7D530',
    tabText: '#22211C',
    description:
      'partagez collectivement les retours, priorisez pour la prochaine édition',
  },
];

export function HomeScreen({
  participant,
  notes,
  isFacilitator,
  onSelectTheme,
  onEditIdentity,
  onOpenFacilitator,
}: HomeScreenProps) {
  const userProfileCfg = PROFILES[participant.profile];

  return (
    <div className="relative overflow-hidden flex-1">
      {/* Motif signature des 3 cercles en haut à droite */}
      <SignatureCirclesMotif />

      {/* Top bar épurée (3 zones) */}
      <header className="relative z-10 max-w-[1360px] mx-auto px-4 sm:px-8 pt-5 pb-3 flex items-center justify-between gap-4">
        <div className="font-display text-xl sm:text-2xl font-bold text-[#00321C] tracking-tight whitespace-nowrap shrink-0">
          Innov&apos;Camp 26
        </div>

        <nav
          aria-label="Accès rapide aux thématiques"
          className="hidden lg:flex items-center gap-6 text-[15px] font-medium text-[#5E5B52]"
        >
          {THEMES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onSelectTheme(t.id)}
              className="hover:text-[#00321C] hover:underline underline-offset-4 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              {t.number}. {t.title}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onOpenFacilitator}
            className={`hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[12px] text-[14px] font-semibold shadow-[0_2px_8px_rgba(34,33,28,0.06)] transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              isFacilitator
                ? 'bg-[#00321C] text-white hover:bg-[#004A2A]'
                : 'bg-white text-[#22211C] hover:bg-[#FAF8F2]'
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

          <button
            type="button"
            onClick={onEditIdentity}
            className="inline-flex items-center gap-2.5 px-3.5 py-2 rounded-[12px] bg-white shadow-[0_2px_8px_rgba(34,33,28,0.06)] hover:bg-[#FAF8F2] transition-colors cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#006341]"
            title="Changer de prénom ou de profil"
          >
            <span
              className="w-3.5 h-3.5 rounded-[4px] shrink-0"
              style={{ backgroundColor: userProfileCfg.color }}
              aria-hidden="true"
            />
            <span className="text-[14px] font-semibold text-[#22211C] max-w-[140px] truncate">
              {participant.name}
            </span>
            <UserCog className="w-4 h-4 text-[#5E5B52]" />
          </button>
        </div>
      </header>

      <main className="relative z-10 max-w-[1360px] mx-auto px-4 sm:px-8 pt-6 pb-12 space-y-10">
        {/* Hero section */}
        <section className="max-w-3xl">
          <p className="text-xs sm:text-[13px] font-bold uppercase tracking-[0.18em] text-[#E16C2A] mb-2">
            ATELIER REX
          </p>

          <div className="flex flex-wrap items-center gap-4 sm:gap-5">
            <h1 className="font-display text-5xl sm:text-6xl font-bold text-[#00321C] tracking-tight leading-[1.02]">
              À vos post-its <span className="text-[#E16C2A]">!</span>
            </h1>

            <div
              className="inline-flex items-center justify-center w-20 h-20 sm:w-[88px] sm:h-[88px] rounded-full bg-[#E16C2A] text-white font-display font-bold text-center text-[14px] sm:text-[15px] leading-tight shadow-[0_4px_14px_rgba(225,108,42,0.28)] shrink-0"
              style={{ transform: 'rotate(-8deg)' }}
            >
              <span>
                2h
                <br />
                D&apos;ATELIER
              </span>
            </div>
          </div>

          <p className="mt-4 text-[17px] sm:text-[19px] text-[#5E5B52] leading-relaxed max-w-2xl">
            Échanger sur l&apos;édition 2026, tirer les enseignements et construire une version
            améliorée du programme
          </p>
        </section>

        {/* Bloc Le format KISS */}
        <section
          aria-labelledby="kiss-heading"
          className="bg-white rounded-[16px] shadow-[0_2px_12px_rgba(34,33,28,0.05)] p-6 sm:p-8"
        >
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#E16C2A] mb-1">
            ATELIER REX
          </p>
          <h2
            id="kiss-heading"
            className="font-display text-2xl sm:text-3xl font-bold text-[#296654] mb-6"
          >
            Le format KISS
          </h2>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
            {KISS_INTRO.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.id} className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-full bg-[#006341] text-white flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 stroke-[2.5]" />
                  </div>
                  <div>
                    <div className="font-display text-xl font-bold text-[#22211C] leading-tight">
                      {item.title}
                    </div>
                    <div className="text-[14px] text-[#5E5B52]">{item.subtitle}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Déroulé en 3 cartes à onglet coloré */}
        <section aria-labelledby="deroule-heading" className="space-y-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#E16C2A] mb-1">
              ATELIER REX
            </p>
            <h2
              id="deroule-heading"
              className="font-display text-2xl sm:text-3xl font-bold text-[#296654]"
            >
              Comment se déroule la séance
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-2">
            {WORKSHOP_STEPS.map((step) => (
              <div key={step.tab} className="flex flex-col">
                <div
                  className="self-start px-4 py-1.5 rounded-t-[12px] text-[13px] font-bold tracking-wide"
                  style={{ backgroundColor: step.tabBg, color: step.tabText }}
                >
                  {step.tab}
                </div>
                <div className="flex-1 bg-white rounded-b-[14px] rounded-tr-[14px] shadow-[0_2px_10px_rgba(34,33,28,0.05)] p-5 text-[15px] text-[#22211C] leading-relaxed">
                  {step.description}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 3 gros boutons-cartes thématiques */}
        <section aria-labelledby="themes-heading" className="space-y-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#E16C2A] mb-1">
              ATELIER REX
            </p>
            <h2
              id="themes-heading"
              className="font-display text-2xl sm:text-3xl font-bold text-[#296654]"
            >
              Choisissez une thématique pour ouvrir le tableau KISS
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2 items-stretch">
            {THEMES.map((theme) => {
              const count = notes.filter((n) => n.themeId === theme.id).length;
              return (
                <div key={theme.id} className="flex flex-col">
                  {/* Vignette onglet arrondie en haut */}
                  <div
                    className="self-start px-4 py-1.5 rounded-t-[12px] text-[13px] font-bold tracking-wider uppercase"
                    style={{
                      backgroundColor: theme.color,
                      color: theme.headerTextColor,
                    }}
                  >
                    {theme.tabLabel}
                  </div>

                  <button
                    type="button"
                    onClick={() => onSelectTheme(theme.id)}
                    style={{ backgroundColor: theme.tintedBg }}
                    className="group flex-1 text-left rounded-b-[16px] rounded-tr-[16px] p-6 shadow-[0_2px_12px_rgba(34,33,28,0.06)] hover:shadow-[0_8px_22px_rgba(34,33,28,0.11)] transition-all cursor-pointer flex flex-col justify-between focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#00321C]"
                  >
                    <div>
                      <h3
                        className="font-display text-2xl sm:text-[28px] font-bold leading-tight"
                        style={{ color: theme.titleColor }}
                      >
                        {theme.title}
                      </h3>

                      <p className="mt-2 text-[15px] font-semibold text-[#22211C] leading-snug">
                        {theme.definition}
                      </p>

                      <p className="mt-4 text-[14px] text-[#5E5B52] leading-relaxed">
                        {theme.subTopics.join(' · ')}
                      </p>
                    </div>

                    <div className="mt-6 pt-4 border-t border-black/10 flex items-center justify-between gap-3">
                      <span className="text-[14px] font-semibold text-[#22211C] tabular-nums">
                        {count} post-its
                      </span>

                      <span
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-[10px] text-[14px] font-bold transition-transform group-hover:translate-x-0.5"
                        style={{
                          backgroundColor: theme.color,
                          color: theme.headerTextColor,
                        }}
                      >
                        <span>Ouvrir le tableau</span>
                        <ArrowRight className="w-4 h-4" />
                      </span>
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        {/* Bandeau vert #296654 en bas */}
        <section
          aria-label="Retours déjà collectés"
          className="rounded-[14px] bg-[#296654] text-white px-6 py-4 flex flex-wrap items-center justify-between gap-3"
        >
          <p className="text-[15px] font-semibold">
            Ils ont déjà partagé leurs retours :
          </p>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[15px]">
            <span className="inline-flex items-center gap-2 font-medium">
              <Check className="w-4 h-4 text-[#C7D530] shrink-0" />
              <span>Collaborateurs (réponses questionnaire)</span>
            </span>
            <span className="inline-flex items-center gap-2 font-medium">
              <Check className="w-4 h-4 text-[#C7D530] shrink-0" />
              <span>Coachs (entretiens REX individuels)</span>
            </span>
          </div>
        </section>
      </main>
    </div>
  );
}
