import { useCallback, useEffect, useRef, useState } from 'react';
import { buildInitialTimers, buildSeedNotesForTheme } from '../data/seed.ts';
import { isSupabaseEnabled, supabase } from '../lib/supabaseClient.ts';
import { computeRotationFromId } from '../types/workshop.ts';
import type {
  KissColumn,
  NoteItem,
  ParticipantIdentity,
  PresenceUser,
  ThemeId,
  TimerState,
  UserProfile,
  WorkshopPublicState,
} from '../types/workshop.ts';

interface ServerMessage {
  event: string;
  payload: unknown;
}

interface SupabaseNoteRow {
  id: string;
  theme_id: ThemeId;
  column_id: KissColumn;
  text: string;
  profile: UserProfile;
  author_id: string;
  author_name: string;
  is_pre_filled: boolean;
  voter_ids: string[] | null;
  created_at: number;
  updated_at: number;
  rotation: number;
}

interface SupabaseSettingsRow {
  theme_id: ThemeId;
  locked: boolean;
  seeded: boolean;
  timer_duration_sec: number;
  timer_remaining_sec: number;
  timer_running: boolean;
  timer_updated_at: number;
}

function mapSupabaseNote(row: SupabaseNoteRow): NoteItem {
  return {
    id: row.id,
    themeId: row.theme_id,
    column: row.column_id,
    text: row.text,
    profile: row.profile,
    authorId: row.author_id,
    authorName: row.author_name,
    isPreFilled: Boolean(row.is_pre_filled),
    voterIds: Array.isArray(row.voter_ids) ? row.voter_ids : [],
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
    rotation: Number(row.rotation),
  };
}

function mapSupabaseTimer(row: SupabaseSettingsRow): TimerState {
  return {
    durationSec: Number(row.timer_duration_sec),
    remainingSec: Number(row.timer_remaining_sec),
    running: Boolean(row.timer_running),
    updatedAt: Number(row.timer_updated_at),
  };
}


export function useWorkshopSocket(
  participant: ParticipantIdentity | null,
  activeTheme: ThemeId | null,
) {
  const [notes, setNotes] = useState<NoteItem[]>(() => buildSeedNotesForTheme());
  const [lockedThemes, setLockedThemes] = useState<Record<ThemeId, boolean>>({
    cadrage: false,
    accompagnement: false,
    apports: false,
  });
  const [timers, setTimers] = useState<Record<ThemeId, TimerState>>(() => buildInitialTimers());
  const [presence, setPresence] = useState<PresenceUser[]>([]);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [requiresClaim, setRequiresClaim] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const supabaseChannelRef = useRef<ReturnType<NonNullable<typeof supabase>['channel']> | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const participantRef = useRef(participant);
  const activeThemeRef = useRef(activeTheme);

  participantRef.current = participant;
  activeThemeRef.current = activeTheme;

  const applyFullState = useCallback((nextState: WorkshopPublicState) => {
    setNotes(nextState.notes);
    setLockedThemes(nextState.lockedThemes);
    setTimers(nextState.timers);
  }, []);

  // --------------------------------------------------------------------------
  // SUPABASE REALTIME MODE (Static hosting / GitHub Pages)
  // --------------------------------------------------------------------------
  const loadSupabaseInitial = useCallback(async () => {
    if (!supabase) return;
    try {
      const [notesRes, settingsRes, statusRes] = await Promise.all([
        supabase.from('workshop_notes').select('*').order('created_at', { ascending: true }),
        supabase.from('workshop_settings').select('*'),
        supabase.rpc('facilitator_status'),
      ]);

      const settingsRows = (settingsRes.data ?? []) as SupabaseSettingsRow[];
      const anySeeded = settingsRows.some((s) => s.seeded);

      if (!anySeeded && (!notesRes.data || notesRes.data.length === 0)) {
        const seedNotes = buildSeedNotesForTheme();
        await supabase.rpc('seed_initial_notes', { p_notes: seedNotes });
        const refetched = await supabase
          .from('workshop_notes')
          .select('*')
          .order('created_at', { ascending: true });
        if (refetched.data) {
          setNotes((refetched.data as SupabaseNoteRow[]).map(mapSupabaseNote));
        }
      } else if (notesRes.data) {
        setNotes((notesRes.data as SupabaseNoteRow[]).map(mapSupabaseNote));
      }

      if (settingsRows.length > 0) {
        setLockedThemes((prev) => {
          const next = { ...prev };
          for (const row of settingsRows) next[row.theme_id] = Boolean(row.locked);
          return next;
        });
        setTimers((prev) => {
          const next = { ...prev };
          for (const row of settingsRows) next[row.theme_id] = mapSupabaseTimer(row);
          return next;
        });
      }

      if (statusRes.data && typeof (statusRes.data as { requiresClaim?: boolean }).requiresClaim === 'boolean') {
        setRequiresClaim(Boolean((statusRes.data as { requiresClaim?: boolean }).requiresClaim));
      }
    } catch (err) {
      console.error('Erreur de chargement Supabase:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isSupabaseEnabled || !supabase) return;
    const client = supabase;

    void loadSupabaseInitial();

    const channel = client.channel('atelier-rex-innovcamp26', {
      config: {
        presence: {
          key: participantRef.current?.id ?? `anon-${Math.random().toString(36).slice(2, 8)}`,
        },
      },
    });
    supabaseChannelRef.current = channel;

    channel
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'workshop_notes' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const created = mapSupabaseNote(payload.new as SupabaseNoteRow);
            setNotes((prev) => (prev.some((n) => n.id === created.id) ? prev : [...prev, created]));
          } else if (payload.eventType === 'UPDATE') {
            const updated = mapSupabaseNote(payload.new as SupabaseNoteRow);
            setNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
          } else if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as { id?: string }).id;
            if (deletedId) {
              setNotes((prev) => prev.filter((n) => n.id !== deletedId));
            }
          }
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'workshop_settings' },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const row = payload.new as SupabaseSettingsRow;
            setLockedThemes((prev) => ({ ...prev, [row.theme_id]: Boolean(row.locked) }));
            setTimers((prev) => ({ ...prev, [row.theme_id]: mapSupabaseTimer(row) }));
          }
        },
      )
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<PresenceUser>();
        const users: PresenceUser[] = [];
        for (const entries of Object.values(state)) {
          for (const entry of entries) {
            if (entry && entry.participantId) {
              users.push(entry);
            }
          }
        }
        setPresence(users);
      })
      .subscribe((status) => {
        const isJoined = status === 'SUBSCRIBED';
        setConnected(isJoined);
        if (isJoined && participantRef.current) {
          void channel.track({
            connectionId: participantRef.current.id,
            participantId: participantRef.current.id,
            name: participantRef.current.name,
            profile: participantRef.current.profile,
            currentTheme: activeThemeRef.current,
          });
        }
      });

    return () => {
      void client.removeChannel(channel);
      supabaseChannelRef.current = null;
    };
  }, [loadSupabaseInitial]);

  // Track presence updates in Supabase mode
  useEffect(() => {
    if (!isSupabaseEnabled || !supabaseChannelRef.current || !connected) return;
    if (!participant) {
      void supabaseChannelRef.current.untrack();
      return;
    }
    void supabaseChannelRef.current.track({
      connectionId: participant.id,
      participantId: participant.id,
      name: participant.name,
      profile: participant.profile,
      currentTheme: activeTheme,
    });
  }, [participant, activeTheme, connected]);

  // --------------------------------------------------------------------------
  // EXPRESS + WEBSOCKET MODE (Local / Cloud Run full-stack)
  // --------------------------------------------------------------------------
  const fetchInitialState = useCallback(async () => {
    if (isSupabaseEnabled) return;
    try {
      const res = await fetch('/api/state');
      if (!res.ok) return;
      const data = (await res.json()) as {
        state: WorkshopPublicState;
        presence: PresenceUser[];
        facilitator?: { requiresClaim?: boolean };
      };
      applyFullState(data.state);
      if (Array.isArray(data.presence)) {
        setPresence(data.presence);
      }
      if (typeof data.facilitator?.requiresClaim === 'boolean') {
        setRequiresClaim(data.facilitator.requiresClaim);
      }
    } catch {
      // Initial HTTP fallback fails gracefully; WS reconnect will sync
    } finally {
      setLoading(false);
    }
  }, [applyFullState]);

  const sendPresence = useCallback((ws: WebSocket | null) => {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    const p = participantRef.current;
    if (!p) {
      ws.send(JSON.stringify({ event: 'presence:leave' }));
      return;
    }
    ws.send(
      JSON.stringify({
        event: 'presence:join',
        payload: {
          participantId: p.id,
          name: p.name,
          profile: p.profile,
          currentTheme: activeThemeRef.current,
        },
      }),
    );
  }, []);

  useEffect(() => {
    if (isSupabaseEnabled) return;
    void fetchInitialState();
  }, [fetchInitialState]);

  useEffect(() => {
    if (isSupabaseEnabled) return;
    let unmounted = false;

    function connect() {
      if (unmounted) return;
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
      wsRef.current = ws;

      ws.onopen = () => {
        if (unmounted) return;
        setConnected(true);
        sendPresence(ws);
      };

      ws.onmessage = (evt) => {
        try {
          const msg = JSON.parse(evt.data as string) as ServerMessage;
          if (!msg || typeof msg.event !== 'string') return;

          switch (msg.event) {
            case 'state:init': {
              const p = msg.payload as {
                state: WorkshopPublicState;
                presence: PresenceUser[];
              };
              if (p?.state) applyFullState(p.state);
              if (Array.isArray(p?.presence)) setPresence(p.presence);
              setLoading(false);
              break;
            }
            case 'presence:list': {
              if (Array.isArray(msg.payload)) {
                setPresence(msg.payload as PresenceUser[]);
              }
              break;
            }
            case 'note:created': {
              const created = msg.payload as NoteItem;
              setNotes((prev) => {
                if (prev.some((n) => n.id === created.id)) return prev;
                return [...prev, created];
              });
              break;
            }
            case 'note:updated': {
              const updated = msg.payload as NoteItem;
              setNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
              break;
            }
            case 'note:moved': {
              const moved = msg.payload as {
                id: string;
                column: KissColumn;
                updatedAt: number;
              };
              setNotes((prev) =>
                prev.map((n) =>
                  n.id === moved.id
                    ? { ...n, column: moved.column, updatedAt: moved.updatedAt }
                    : n,
                ),
              );
              break;
            }
            case 'note:deleted': {
              const deleted = msg.payload as { id: string };
              setNotes((prev) => prev.filter((n) => n.id !== deleted.id));
              break;
            }
            case 'notes:merged': {
              const merged = msg.payload as {
                updatedNote: NoteItem;
                removedId: string;
              };
              setNotes((prev) =>
                prev
                  .filter((n) => n.id !== merged.removedId)
                  .map((n) => (n.id === merged.updatedNote.id ? merged.updatedNote : n)),
              );
              break;
            }
            case 'theme:reset': {
              const resetData = msg.payload as {
                themeId: ThemeId;
                notes: NoteItem[];
                locked: boolean;
                timer: TimerState;
              };
              setNotes((prev) => [
                ...prev.filter((n) => n.themeId !== resetData.themeId),
                ...resetData.notes,
              ]);
              setLockedThemes((prev) => ({
                ...prev,
                [resetData.themeId]: resetData.locked,
              }));
              setTimers((prev) => ({
                ...prev,
                [resetData.themeId]: resetData.timer,
              }));
              break;
            }
            case 'theme:lock': {
              const lockData = msg.payload as { themeId: ThemeId; locked: boolean };
              setLockedThemes((prev) => ({
                ...prev,
                [lockData.themeId]: lockData.locked,
              }));
              break;
            }
            case 'timer:updated': {
              const tData = msg.payload as { themeId: ThemeId; timer: TimerState };
              setTimers((prev) => ({
                ...prev,
                [tData.themeId]: tData.timer,
              }));
              break;
            }
            default:
              break;
          }
        } catch {
          // Ignore malformed message
        }
      };

      ws.onclose = () => {
        if (unmounted) return;
        setConnected(false);
        wsRef.current = null;
        reconnectTimerRef.current = window.setTimeout(connect, 2000);
      };

      ws.onerror = () => {
        ws.close();
      };
    }

    connect();

    return () => {
      unmounted = true;
      if (reconnectTimerRef.current !== null) {
        window.clearTimeout(reconnectTimerRef.current);
      }
      wsRef.current?.close();
    };
  }, [applyFullState, sendPresence]);

  useEffect(() => {
    if (isSupabaseEnabled) return;
    sendPresence(wsRef.current);
  }, [participant, activeTheme, sendPresence]);

  // --------------------------------------------------------------------------
  // UNIFIED MUTATION ACTIONS
  // --------------------------------------------------------------------------
  const createNote = useCallback(
    async (
      params: {
        themeId: ThemeId;
        column: KissColumn;
        text: string;
        profile: UserProfile;
        authorId: string;
        authorName: string;
      },
      facilitatorToken?: string | null,
    ) => {
      if (isSupabaseEnabled && supabase) {
        const finalText = params.text.trim();
        const id = `note-${crypto.randomUUID()}`;
        const now = Date.now();
        const rotation = computeRotationFromId(id);

        if (facilitatorToken) {
          const { data, error } = await supabase.rpc('facilitator_create_note', {
            p_token: facilitatorToken,
            p_note: {
              id,
              themeId: params.themeId,
              column: params.column,
              text: finalText,
              profile: params.profile,
              authorId: params.authorId,
              authorName: params.authorName,
              createdAt: now,
              updatedAt: now,
              rotation,
            },
          });
          if (error) throw new Error(error.message);
          const created = mapSupabaseNote(data as SupabaseNoteRow);
          setNotes((prev) => (prev.some((n) => n.id === created.id) ? prev : [...prev, created]));
          return created;
        }

        const { data, error } = await supabase
          .from('workshop_notes')
          .insert({
            id,
            theme_id: params.themeId,
            column_id: params.column,
            text: finalText,
            profile: params.profile,
            author_id: params.authorId,
            author_name: params.authorName,
            is_pre_filled: false,
            voter_ids: [],
            created_at: now,
            updated_at: now,
            rotation,
          })
          .select()
          .single();

        if (error) {
          throw new Error(
            error.message.includes('policy')
              ? "L'ajout de post-its est verrouillé sur cette thématique."
              : error.message,
          );
        }
        const created = mapSupabaseNote(data as SupabaseNoteRow);
        setNotes((prev) => (prev.some((n) => n.id === created.id) ? prev : [...prev, created]));
        return created;
      }

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (facilitatorToken) headers.Authorization = `Bearer ${facilitatorToken}`;

      const res = await fetch('/api/notes', {
        method: 'POST',
        headers,
        body: JSON.stringify(params),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? "Impossible d'ajouter le post-it.");
      }
      const created = (await res.json()) as NoteItem;
      setNotes((prev) => (prev.some((n) => n.id === created.id) ? prev : [...prev, created]));
      return created;
    },
    [],
  );

  const updateNote = useCallback(
    async (
      noteId: string,
      text: string,
      authorId: string,
      facilitatorToken?: string | null,
    ) => {
      if (isSupabaseEnabled && supabase) {
        const formatted = text.trim();
        const { data, error } = await supabase
          .from('workshop_notes')
          .update({ text: formatted, updated_at: Date.now() })
          .eq('id', noteId)
          .select()
          .single();
        if (error) throw new Error(error.message);
        const updated = mapSupabaseNote(data as SupabaseNoteRow);
        setNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
        return updated;
      }

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (facilitatorToken) headers.Authorization = `Bearer ${facilitatorToken}`;

      const res = await fetch(`/api/notes/${encodeURIComponent(noteId)}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ text, authorId }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? 'Impossible de modifier le post-it.');
      }
      const updated = (await res.json()) as NoteItem;
      setNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
      return updated;
    },
    [notes],
  );

  const moveNote = useCallback(
    async (noteId: string, column: KissColumn) => {
      setNotes((prev) =>
        prev.map((n) => (n.id === noteId ? { ...n, column, updatedAt: Date.now() } : n)),
      );

      if (isSupabaseEnabled && supabase) {
        const { error } = await supabase
          .from('workshop_notes')
          .update({ column_id: column, updated_at: Date.now() })
          .eq('id', noteId);
        if (error) await loadSupabaseInitial();
        return;
      }

      const res = await fetch(`/api/notes/${encodeURIComponent(noteId)}/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ column }),
      });
      if (!res.ok) {
        await fetchInitialState();
      }
    },
    [fetchInitialState, loadSupabaseInitial],
  );

  const deleteNote = useCallback(
    async (noteId: string, authorId: string, facilitatorToken?: string | null) => {
      if (isSupabaseEnabled && supabase) {
        if (facilitatorToken) {
          const { error } = await supabase.rpc('facilitator_delete_note', {
            p_token: facilitatorToken,
            p_note_id: noteId,
          });
          if (error) throw new Error(error.message);
        } else {
          const { error } = await supabase
            .from('workshop_notes')
            .delete()
            .eq('id', noteId)
            .eq('author_id', authorId);
          if (error) throw new Error(error.message);
        }
        setNotes((prev) => prev.filter((n) => n.id !== noteId));
        return;
      }

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (facilitatorToken) headers.Authorization = `Bearer ${facilitatorToken}`;

      const res = await fetch(`/api/notes/${encodeURIComponent(noteId)}`, {
        method: 'DELETE',
        headers,
        body: JSON.stringify({ authorId }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? 'Impossible de supprimer le post-it.');
      }
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
    },
    [],
  );

  const toggleVote = useCallback(async (noteId: string, participantId: string) => {
    setNotes((prev) =>
      prev.map((n) => {
        if (n.id !== noteId) return n;
        const exists = n.voterIds.includes(participantId);
        return {
          ...n,
          voterIds: exists
            ? n.voterIds.filter((id) => id !== participantId)
            : [...n.voterIds, participantId],
        };
      }),
    );

    if (isSupabaseEnabled && supabase) {
      const { data, error } = await supabase.rpc('toggle_note_vote', {
        p_note_id: noteId,
        p_participant_id: participantId,
      });
      if (!error && data) {
        const updated = mapSupabaseNote(data as SupabaseNoteRow);
        setNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
      }
      return;
    }

    const res = await fetch(`/api/notes/${encodeURIComponent(noteId)}/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ participantId }),
    });
    if (res.ok) {
      const updated = (await res.json()) as NoteItem;
      setNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
    }
  }, []);

  const controlTimer = useCallback(
    async (themeId: ThemeId, action: 'start' | 'pause' | 'reset') => {
      if (isSupabaseEnabled && supabase) {
        const { data, error } = await supabase.rpc('control_workshop_timer', {
          p_theme_id: themeId,
          p_action: action,
        });
        if (!error && data) {
          const nextTimer = mapSupabaseTimer(data as SupabaseSettingsRow);
          setTimers((prev) => ({ ...prev, [themeId]: nextTimer }));
        }
        return;
      }

      const res = await fetch(`/api/timer/${encodeURIComponent(themeId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        const nextTimer = (await res.json()) as TimerState;
        setTimers((prev) => ({ ...prev, [themeId]: nextTimer }));
      }
    },
    [],
  );

  const claimFacilitatorPasscode = useCallback(async (passcode: string) => {
    if (isSupabaseEnabled && supabase) {
      const { data, error } = await supabase.rpc('facilitator_claim', {
        p_passcode: passcode,
      });
      if (error || typeof data !== 'string') {
        throw new Error(error?.message ?? 'Impossible de configurer le code animateur.');
      }
      setRequiresClaim(false);
      return data;
    }

    const res = await fetch('/api/facilitator/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passcode }),
    });
    const data = (await res.json().catch(() => ({}))) as { token?: string; error?: string };
    if (!res.ok || !data.token) {
      throw new Error(data.error ?? 'Impossible de configurer le code animateur.');
    }
    setRequiresClaim(false);
    return data.token;
  }, []);

  const loginFacilitator = useCallback(async (passcode: string) => {
    if (isSupabaseEnabled && supabase) {
      const { data, error } = await supabase.rpc('facilitator_login', {
        p_passcode: passcode,
      });
      if (error || typeof data !== 'string') {
        throw new Error(error?.message ?? 'Code animateur incorrect.');
      }
      return data;
    }

    const res = await fetch('/api/facilitator/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passcode }),
    });
    const data = (await res.json().catch(() => ({}))) as { token?: string; error?: string };
    if (!res.ok || !data.token) {
      throw new Error(data.error ?? 'Code animateur incorrect.');
    }
    return data.token;
  }, []);

  const resetTheme = useCallback(async (themeId: ThemeId, token: string) => {
    if (isSupabaseEnabled && supabase) {
      const seedNotes = buildSeedNotesForTheme(themeId);
      const { error } = await supabase.rpc('facilitator_reset_theme', {
        p_token: token,
        p_theme_id: themeId,
        p_seed_notes: seedNotes,
      });
      if (error) throw new Error(error.message);
      setNotes((prev) => [...prev.filter((n) => n.themeId !== themeId), ...seedNotes]);
      setLockedThemes((prev) => ({ ...prev, [themeId]: false }));
      setTimers((prev) => ({ ...prev, [themeId]: buildInitialTimers()[themeId] }));
      return;
    }

    const res = await fetch('/api/facilitator/reset-theme', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ themeId }),
    });
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(err.error ?? 'Réinitialisation refusée.');
    }
    const data = (await res.json()) as { notes: NoteItem[]; timer: TimerState };
    setNotes((prev) => [...prev.filter((n) => n.themeId !== themeId), ...data.notes]);
    setLockedThemes((prev) => ({ ...prev, [themeId]: false }));
    setTimers((prev) => ({ ...prev, [themeId]: data.timer }));
  }, []);

  const toggleThemeLock = useCallback(
    async (themeId: ThemeId, locked: boolean, token: string) => {
      if (isSupabaseEnabled && supabase) {
        const { error } = await supabase.rpc('facilitator_toggle_lock', {
          p_token: token,
          p_theme_id: themeId,
          p_locked: locked,
        });
        if (error) throw new Error(error.message);
        setLockedThemes((prev) => ({ ...prev, [themeId]: locked }));
        return;
      }

      const res = await fetch('/api/facilitator/toggle-lock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ themeId, locked }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? 'Impossible de modifier le verrouillage.');
      }
      setLockedThemes((prev) => ({ ...prev, [themeId]: locked }));
    },
    [],
  );

  const mergeNotes = useCallback(
    async (primaryId: string, secondaryId: string, mergedText: string, token: string) => {
      if (isSupabaseEnabled && supabase) {
        const formatted = mergedText.trim();
        const { data, error } = await supabase.rpc('facilitator_merge_notes', {
          p_token: token,
          p_primary_id: primaryId,
          p_secondary_id: secondaryId,
          p_merged_text: formatted,
        });
        if (error) throw new Error(error.message);
        const updatedNote = mapSupabaseNote(data as SupabaseNoteRow);
        setNotes((prev) =>
          prev
            .filter((n) => n.id !== secondaryId)
            .map((n) => (n.id === updatedNote.id ? updatedNote : n)),
        );
        return;
      }

      const res = await fetch('/api/facilitator/merge-notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ primaryId, secondaryId, mergedText }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? 'Impossible de fusionner ces post-its.');
      }
      const data = (await res.json()) as { updatedNote: NoteItem; removedId: string };
      setNotes((prev) =>
        prev
          .filter((n) => n.id !== data.removedId)
          .map((n) => (n.id === data.updatedNote.id ? data.updatedNote : n)),
      );
    },
    [notes],
  );

  return {
    notes,
    lockedThemes,
    timers,
    presence,
    connected,
    loading,
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
  };
}
