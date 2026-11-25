import { useEffect, useState } from 'react';
import { ArrivalModal } from './components/ArrivalModal.tsx';
import { BottomLegendBar } from './components/BottomLegendBar.tsx';
import { FacilitatorModal } from './components/FacilitatorModal.tsx';
import { HomeScreen } from './components/HomeScreen.tsx';
import { KissBoardScreen } from './components/KissBoardScreen.tsx';
import { useWorkshopSocket } from './hooks/useWorkshopSocket.ts';
import type { KissColumn, ParticipantIdentity, ThemeId } from './types/workshop.ts';
import { exportWorkshopCSV, exportWorkshopPDF } from './utils/exportUtils.ts';

const PARTICIPANT_STORAGE_KEY = 'innovcamp26_participant_v1';

function loadStoredParticipant(): ParticipantIdentity | null {
  try {
    const raw = window.localStorage.getItem(PARTICIPANT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ParticipantIdentity>;
    if (
      typeof parsed.id === 'string' &&
      typeof parsed.name === 'string' &&
      parsed.name.trim().length >= 2 &&
      (parsed.profile === 'coach' ||
        parsed.profile === 'participant' ||
        parsed.profile === 'groupama')
    ) {
      return {
        id: parsed.id,
        name: parsed.name.trim(),
        profile: parsed.profile,
      };
    }
    return null;
  } catch {
    return null;
  }
}

function getThemeFromHash(): ThemeId | null {
  const hash = window.location.hash.replace('#', '');
  if (hash === 'cadrage' || hash === 'accompagnement' || hash === 'apports') {
    return hash;
  }
  return null;
}

export default function App() {
  const [participant, setParticipant] = useState<ParticipantIdentity | null>(() =>
    loadStoredParticipant(),
  );
  const [editingIdentity, setEditingIdentity] = useState(false);
  const [activeTheme, setActiveTheme] = useState<ThemeId | null>(() => getThemeFromHash());

  // Facilitator Bearer token kept strictly in React memory (never persisted in Web Storage)
  const [facilitatorToken, setFacilitatorToken] = useState<string | null>(null);
  const [facilitatorModalOpen, setFacilitatorModalOpen] = useState(false);

  const {
    notes,
    lockedThemes,
    timers,
    presence,
    connected,
    requiresClaim,
    createNote,
    updateNote,
    moveNote,
    deleteNote,
    toggleVote,
    controlTimer,
    claimFacilitatorPasscode,
    loginFacilitator,
    resetTheme,
    toggleThemeLock,
    mergeNotes,
  } = useWorkshopSocket(participant, activeTheme);

  useEffect(() => {
    function onHashChange() {
      setActiveTheme(getThemeFromHash());
    }
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  function navigateToTheme(themeId: ThemeId | null) {
    setActiveTheme(themeId);
    if (themeId) {
      window.history.pushState(null, '', `#${themeId}`);
    } else {
      window.history.pushState(null, '', window.location.pathname + window.location.search);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleConfirmParticipant(identity: ParticipantIdentity) {
    setParticipant(identity);
    try {
      window.localStorage.setItem(PARTICIPANT_STORAGE_KEY, JSON.stringify(identity));
    } catch {
      // Ignore storage quota issues
    }
    setEditingIdentity(false);
  }

  if (!participant) {
    return <ArrivalModal initialIdentity={null} onConfirm={handleConfirmParticipant} />;
  }

  const isFacilitator = facilitatorToken !== null;
  const uniqueOnlineCount = Math.max(
    1,
    new Set(presence.map((p) => p.participantId)).size,
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F2E6] text-[#22211C]">
      {activeTheme === null ? (
        <HomeScreen
          participant={participant}
          notes={notes}
          isFacilitator={isFacilitator}
          onSelectTheme={(id) => navigateToTheme(id)}
          onEditIdentity={() => setEditingIdentity(true)}
          onOpenFacilitator={() => setFacilitatorModalOpen(true)}
        />
      ) : (
        <KissBoardScreen
          themeId={activeTheme}
          participant={participant}
          notes={notes}
          locked={lockedThemes[activeTheme]}
          timer={timers[activeTheme]}
          isFacilitator={isFacilitator}
          onBackHome={() => navigateToTheme(null)}
          onSwitchTheme={(id) => navigateToTheme(id)}
          onEditIdentity={() => setEditingIdentity(true)}
          onCreateNote={async (column: KissColumn, text: string) => {
            await createNote(
              {
                themeId: activeTheme,
                column,
                text,
                profile: participant.profile,
                authorId: participant.id,
                authorName: participant.name,
              },
              facilitatorToken,
            );
          }}
          onEditNote={async (noteId: string, newText: string) => {
            await updateNote(noteId, newText, participant.id, facilitatorToken);
          }}
          onDeleteNote={async (noteId: string) => {
            await deleteNote(noteId, participant.id, facilitatorToken);
          }}
          onMoveNote={moveNote}
          onVoteNote={(noteId: string) => {
            void toggleVote(noteId, participant.id);
          }}
          onControlTimer={(action) => controlTimer(activeTheme, action)}
          onToggleLock={async (locked: boolean) => {
            if (!facilitatorToken) return;
            await toggleThemeLock(activeTheme, locked, facilitatorToken);
          }}
          onResetTheme={async () => {
            if (!facilitatorToken) return;
            await resetTheme(activeTheme, facilitatorToken);
          }}
          onMergeNotes={async (primaryId: string, secondaryId: string, mergedText: string) => {
            if (!facilitatorToken) return;
            await mergeNotes(primaryId, secondaryId, mergedText, facilitatorToken);
          }}
          onExportCSV={() => exportWorkshopCSV(notes)}
          onExportPDF={() => exportWorkshopPDF(notes)}
          onOpenFacilitator={() => setFacilitatorModalOpen(true)}
        />
      )}

      <BottomLegendBar
        onlineCount={uniqueOnlineCount}
        connected={connected}
        isFacilitator={isFacilitator}
        onOpenFacilitator={() => setFacilitatorModalOpen(true)}
      />

      {editingIdentity && (
        <ArrivalModal
          initialIdentity={participant}
          isEditing
          onConfirm={handleConfirmParticipant}
          onCancel={() => setEditingIdentity(false)}
        />
      )}

      <FacilitatorModal
        isOpen={facilitatorModalOpen}
        isFacilitator={isFacilitator}
        requiresClaim={requiresClaim}
        activeThemeId={activeTheme}
        lockedThemes={lockedThemes}
        onClose={() => setFacilitatorModalOpen(false)}
        onClaimPasscode={async (code: string) => {
          const token = await claimFacilitatorPasscode(code);
          setFacilitatorToken(token);
        }}
        onLogin={async (code: string) => {
          const token = await loginFacilitator(code);
          setFacilitatorToken(token);
        }}
        onLogout={() => setFacilitatorToken(null)}
        onResetTheme={async (tId: ThemeId) => {
          if (!facilitatorToken) return;
          await resetTheme(tId, facilitatorToken);
        }}
        onToggleLock={async (tId: ThemeId, locked: boolean) => {
          if (!facilitatorToken) return;
          await toggleThemeLock(tId, locked, facilitatorToken);
        }}
        onExportCSV={() => exportWorkshopCSV(notes)}
        onExportPDF={() => exportWorkshopPDF(notes)}
      />
    </div>
  );
}
