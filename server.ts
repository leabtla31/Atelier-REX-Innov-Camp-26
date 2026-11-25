import crypto from 'crypto';
import dotenv from 'dotenv';
import express from 'express';
import fs from 'fs';
import http from 'http';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { WebSocket, WebSocketServer } from 'ws';
import { buildInitialTimer, buildInitialTimers, buildSeedNotesForTheme } from './src/data/seed.ts';
import { computeRotationFromId } from './src/types/workshop.ts';
import type {
  KissColumn,
  NoteItem,
  PresenceUser,
  ThemeId,
  TimerState,
  UserProfile,
  WorkshopPublicState,
} from './src/types/workshop.ts';

dotenv.config();

const PORT = 3000;
const DATA_DIR = path.resolve(process.cwd(), 'data');
const STATE_FILE = path.join(DATA_DIR, 'workshop-state.json');

const VALID_THEMES: ThemeId[] = ['cadrage', 'accompagnement', 'apports'];
const VALID_COLUMNS: KissColumn[] = ['keep', 'improve', 'start', 'stop'];
const VALID_PROFILES: UserProfile[] = ['coach', 'participant', 'groupama'];

const EPHEMERAL_SESSION_SECRET = crypto.randomBytes(32).toString('hex');

interface StoredWorkshopState {
  notes: NoteItem[];
  lockedThemes: Record<ThemeId, boolean>;
  timers: Record<ThemeId, TimerState>;
  facilitatorPasscodeHash?: string;
}

function getSessionSecret(): string {
  const envSecret = process.env.SESSION_SECRET;
  if (envSecret && envSecret.trim().length >= 16) {
    return envSecret.trim();
  }
  return EPHEMERAL_SESSION_SECRET;
}

function getEnvFacilitatorPasscode(): string | null {
  const val = process.env.FACILITATOR_PASSCODE;
  if (typeof val === 'string' && val.trim().length > 0) {
    return val.trim();
  }
  return null;
}

function createDefaultState(): StoredWorkshopState {
  return {
    notes: buildSeedNotesForTheme(),
    lockedThemes: {
      cadrage: false,
      accompagnement: false,
      apports: false,
    },
    timers: buildInitialTimers(),
  };
}

function loadState(): StoredWorkshopState {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(STATE_FILE)) {
      const initial = createDefaultState();
      saveStateSync(initial);
      return initial;
    }
    const raw = fs.readFileSync(STATE_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<StoredWorkshopState>;
    const fallback = createDefaultState();
    return {
      notes: Array.isArray(parsed.notes) ? parsed.notes : fallback.notes,
      lockedThemes: {
        cadrage: Boolean(parsed.lockedThemes?.cadrage),
        accompagnement: Boolean(parsed.lockedThemes?.accompagnement),
        apports: Boolean(parsed.lockedThemes?.apports),
      },
      timers: {
        cadrage: parsed.timers?.cadrage ?? fallback.timers.cadrage,
        accompagnement: parsed.timers?.accompagnement ?? fallback.timers.accompagnement,
        apports: parsed.timers?.apports ?? fallback.timers.apports,
      },
      facilitatorPasscodeHash:
        typeof parsed.facilitatorPasscodeHash === 'string'
          ? parsed.facilitatorPasscodeHash
          : undefined,
    };
  } catch (err) {
    console.error('Failed to load workshop state, resetting to defaults:', err);
    return createDefaultState();
  }
}

function saveStateSync(nextState: StoredWorkshopState): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const tmpFile = `${STATE_FILE}.tmp`;
  fs.writeFileSync(tmpFile, JSON.stringify(nextState, null, 2), 'utf-8');
  fs.renameSync(tmpFile, STATE_FILE);
}

let state: StoredWorkshopState = loadState();

function getPublicState(): WorkshopPublicState {
  return {
    notes: state.notes,
    lockedThemes: state.lockedThemes,
    timers: state.timers,
  };
}

function hashPasscode(passcode: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(passcode, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

function verifyScryptPasscode(passcode: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, originalHex] = parts;
  if (!salt || !originalHex) return false;
  const derived = crypto.scryptSync(passcode, salt, 64);
  const original = Buffer.from(originalHex, 'hex');
  if (derived.length !== original.length) return false;
  return crypto.timingSafeEqual(derived, original);
}

function verifyPlainPasscodeTimingSafe(input: string, expected: string): boolean {
  const a = crypto.createHash('sha256').update(input).digest();
  const b = crypto.createHash('sha256').update(expected).digest();
  return crypto.timingSafeEqual(a, b);
}

function verifyFacilitatorPasscode(candidate: string): boolean {
  const envPass = getEnvFacilitatorPasscode();
  if (envPass !== null) {
    return verifyPlainPasscodeTimingSafe(candidate, envPass);
  }
  if (state.facilitatorPasscodeHash) {
    return verifyScryptPasscode(candidate, state.facilitatorPasscodeHash);
  }
  return false;
}

function issueFacilitatorToken(): string {
  const payload = {
    role: 'facilitator',
    iat: Date.now(),
    exp: Date.now() + 12 * 60 * 60 * 1000,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload), 'utf-8').toString('base64url');
  const signature = crypto
    .createHmac('sha256', getSessionSecret())
    .update(encodedPayload)
    .digest('base64url');
  return `${encodedPayload}.${signature}`;
}

function verifyFacilitatorToken(token: string): boolean {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return false;
    const [encodedPayload, sig] = parts;
    if (!encodedPayload || !sig) return false;

    const expectedSig = crypto
      .createHmac('sha256', getSessionSecret())
      .update(encodedPayload)
      .digest('base64url');

    const sigBuf = Buffer.from(sig, 'utf-8');
    const expBuf = Buffer.from(expectedSig, 'utf-8');
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return false;
    }

    const decoded = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf-8')) as {
      role?: string;
      exp?: number;
    };
    return decoded.role === 'facilitator' && typeof decoded.exp === 'number' && decoded.exp > Date.now();
  } catch {
    return false;
  }
}

function extractBearerToken(req: express.Request): string | null {
  const authHeader = req.headers.authorization;
  if (typeof authHeader !== 'string') return null;
  if (!authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice('Bearer '.length).trim();
  return token.length > 0 ? token : null;
}

function isFacilitatorRequest(req: express.Request): boolean {
  const token = extractBearerToken(req);
  return token !== null && verifyFacilitatorToken(token);
}

function isValidThemeId(value: unknown): value is ThemeId {
  return typeof value === 'string' && VALID_THEMES.includes(value as ThemeId);
}

function isValidColumn(value: unknown): value is KissColumn {
  return typeof value === 'string' && VALID_COLUMNS.includes(value as KissColumn);
}

function isValidProfile(value: unknown): value is UserProfile {
  return typeof value === 'string' && VALID_PROFILES.includes(value as UserProfile);
}

function isValidAuthorText(rawText: string): boolean {
  const cleaned = rawText.trim();
  return cleaned.length > 0 && cleaned.length <= 80;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '64kb' }));

  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws' });

  const clients = new Map<WebSocket, { connectionId: string; presence: PresenceUser | null }>();

  function getOnlineParticipants(): PresenceUser[] {
    const list: PresenceUser[] = [];
    for (const meta of clients.values()) {
      if (meta.presence) {
        list.push(meta.presence);
      }
    }
    return list;
  }

  function broadcast(event: string, payload: unknown) {
    const message = JSON.stringify({ event, payload });
    for (const [ws] of clients.entries()) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    }
  }

  wss.on('connection', (ws) => {
    const connectionId = crypto.randomUUID();
    clients.set(ws, { connectionId, presence: null });

    ws.send(
      JSON.stringify({
        event: 'state:init',
        payload: {
          state: getPublicState(),
          presence: getOnlineParticipants(),
        },
      }),
    );

    ws.on('message', (rawData) => {
      try {
        const parsed = JSON.parse(rawData.toString()) as {
          event?: string;
          payload?: Record<string, unknown>;
        };
        if (!parsed || typeof parsed.event !== 'string') return;

        if (parsed.event === 'presence:join' && parsed.payload) {
          const { participantId, name, profile, currentTheme } = parsed.payload;
          if (
            typeof participantId === 'string' &&
            participantId.trim().length > 0 &&
            typeof name === 'string' &&
            name.trim().length > 0 &&
            isValidProfile(profile)
          ) {
            const safeTheme = isValidThemeId(currentTheme) ? currentTheme : null;
            const entry = clients.get(ws);
            if (entry) {
              entry.presence = {
                connectionId,
                participantId: participantId.trim().slice(0, 80),
                name: name.trim().slice(0, 40),
                profile,
                currentTheme: safeTheme,
              };
              broadcast('presence:list', getOnlineParticipants());
            }
          }
        } else if (parsed.event === 'presence:leave') {
          const entry = clients.get(ws);
          if (entry && entry.presence) {
            entry.presence = null;
            broadcast('presence:list', getOnlineParticipants());
          }
        }
      } catch {
        // Ignore malformed WS packets
      }
    });

    ws.on('close', () => {
      const entry = clients.get(ws);
      const hadPresence = Boolean(entry?.presence);
      clients.delete(ws);
      if (hadPresence) {
        broadcast('presence:list', getOnlineParticipants());
      }
    });
  });

  // Public state & status
  app.get('/api/state', (req, res) => {
    const envPass = getEnvFacilitatorPasscode();
    const requiresClaim = envPass === null && !state.facilitatorPasscodeHash;
    res.json({
      state: getPublicState(),
      presence: getOnlineParticipants(),
      facilitator: {
        requiresClaim,
        authenticated: isFacilitatorRequest(req),
      },
    });
  });

  // Create a post-it note
  app.post('/api/notes', (req, res) => {
    const { themeId, column, text, profile, authorId, authorName } = req.body ?? {};
    if (
      !isValidThemeId(themeId) ||
      !isValidColumn(column) ||
      !isValidProfile(profile) ||
      typeof text !== 'string' ||
      typeof authorId !== 'string' ||
      typeof authorName !== 'string'
    ) {
      res.status(400).json({ error: 'Paramètres invalides.' });
      return;
    }

    const cleanAuthorName = authorName.trim().slice(0, 40);
    const cleanAuthorId = authorId.trim().slice(0, 80);
    if (!cleanAuthorName || !cleanAuthorId) {
      res.status(400).json({ error: 'Identité du participant requise.' });
      return;
    }

    if (state.lockedThemes[themeId] && !isFacilitatorRequest(req)) {
      res.status(403).json({ error: "L'ajout de post-its est verrouillé par l'animateur sur cette thématique." });
      return;
    }

    if (!isValidAuthorText(text)) {
      res.status(400).json({ error: 'Le texte doit contenir entre 1 et 80 caractères.' });
      return;
    }

    const finalText = text.trim();
    const id = `note-${crypto.randomUUID()}`;
    const now = Date.now();
    const newNote: NoteItem = {
      id,
      themeId,
      column,
      text: finalText,
      profile,
      authorId: cleanAuthorId,
      authorName: cleanAuthorName,
      isPreFilled: false,
      voterIds: [],
      createdAt: now,
      updatedAt: now,
      rotation: computeRotationFromId(id),
    };

    state.notes.push(newNote);
    saveStateSync(state);
    broadcast('note:created', newNote);
    res.status(201).json(newNote);
  });

  // Edit a post-it note
  app.patch('/api/notes/:id', (req, res) => {
    const noteId = req.params.id;
    const { text, authorId } = req.body ?? {};
    const note = state.notes.find((n) => n.id === noteId);
    if (!note) {
      res.status(404).json({ error: 'Post-it introuvable.' });
      return;
    }

    const isFacilitator = isFacilitatorRequest(req);
    if (
      !isFacilitator &&
      !note.isPreFilled &&
      (typeof authorId !== 'string' || authorId.trim() !== note.authorId)
    ) {
      res.status(403).json({ error: 'Vous ne pouvez modifier que vos propres post-its.' });
      return;
    }

    if (typeof text !== 'string' || text.trim().length === 0) {
      res.status(400).json({ error: 'Le texte ne peut pas être vide.' });
      return;
    }

    const maxLen = isFacilitator ? 160 : note.isPreFilled && note.profile === 'coach' ? 88 : 80;
    const formatted = text.trim();
    if (formatted.length > maxLen) {
      res.status(400).json({ error: `Le texte ne doit pas dépasser ${maxLen} caractères.` });
      return;
    }

    note.text = formatted;
    note.updatedAt = Date.now();
    saveStateSync(state);
    broadcast('note:updated', note);
    res.json(note);
  });

  // Move a post-it note across columns
  app.post('/api/notes/:id/move', (req, res) => {
    const noteId = req.params.id;
    const { column } = req.body ?? {};
    if (!isValidColumn(column)) {
      res.status(400).json({ error: 'Colonne KISS invalide.' });
      return;
    }

    const note = state.notes.find((n) => n.id === noteId);
    if (!note) {
      res.status(404).json({ error: 'Post-it introuvable.' });
      return;
    }

    note.column = column;
    note.updatedAt = Date.now();
    saveStateSync(state);
    broadcast('note:moved', { id: note.id, column: note.column, updatedAt: note.updatedAt });
    res.json(note);
  });

  // Delete a post-it note
  app.delete('/api/notes/:id', (req, res) => {
    const noteId = req.params.id;
    const { authorId } = req.body ?? {};
    const index = state.notes.findIndex((n) => n.id === noteId);
    if (index === -1) {
      res.status(404).json({ error: 'Post-it introuvable.' });
      return;
    }

    const note = state.notes[index];
    const isFacilitator = isFacilitatorRequest(req);
    if (!isFacilitator && (typeof authorId !== 'string' || authorId.trim() !== note.authorId)) {
      res.status(403).json({ error: 'Vous ne pouvez supprimer que vos propres post-its.' });
      return;
    }

    state.notes.splice(index, 1);
    saveStateSync(state);
    broadcast('note:deleted', { id: noteId });
    res.json({ ok: true, id: noteId });
  });

  // Toggle +1 vote on a post-it
  app.post('/api/notes/:id/vote', (req, res) => {
    const noteId = req.params.id;
    const { participantId } = req.body ?? {};
    if (typeof participantId !== 'string' || participantId.trim().length === 0) {
      res.status(400).json({ error: 'Identifiant du participant requis pour voter.' });
      return;
    }

    const cleanPid = participantId.trim().slice(0, 80);
    const note = state.notes.find((n) => n.id === noteId);
    if (!note) {
      res.status(404).json({ error: 'Post-it introuvable.' });
      return;
    }

    const existingIdx = note.voterIds.indexOf(cleanPid);
    if (existingIdx >= 0) {
      note.voterIds.splice(existingIdx, 1);
    } else {
      note.voterIds.push(cleanPid);
    }
    note.updatedAt = Date.now();
    saveStateSync(state);
    broadcast('note:updated', note);
    res.json(note);
  });

  // Shared 40-min timer per theme
  app.post('/api/timer/:themeId', (req, res) => {
    const { themeId } = req.params;
    const { action } = req.body ?? {};
    if (!isValidThemeId(themeId)) {
      res.status(400).json({ error: 'Thématique invalide.' });
      return;
    }
    if (action !== 'start' && action !== 'pause' && action !== 'reset') {
      res.status(400).json({ error: 'Action de minuteur invalide.' });
      return;
    }

    const current = state.timers[themeId];
    const now = Date.now();
    const elapsedSec = current.running ? Math.floor((now - current.updatedAt) / 1000) : 0;
    const effectiveRemaining = Math.max(0, current.remainingSec - elapsedSec);

    let nextTimer: TimerState;
    if (action === 'start') {
      nextTimer = {
        ...current,
        remainingSec: effectiveRemaining > 0 ? effectiveRemaining : current.durationSec,
        running: true,
        updatedAt: now,
      };
    } else if (action === 'pause') {
      nextTimer = {
        ...current,
        remainingSec: effectiveRemaining,
        running: false,
        updatedAt: now,
      };
    } else {
      nextTimer = buildInitialTimer();
    }

    state.timers[themeId] = nextTimer;
    saveStateSync(state);
    broadcast('timer:updated', { themeId, timer: nextTimer });
    res.json(nextTimer);
  });

  // Facilitator Auth: check status
  app.get('/api/facilitator/status', (req, res) => {
    const envPass = getEnvFacilitatorPasscode();
    res.json({
      requiresClaim: envPass === null && !state.facilitatorPasscodeHash,
      authenticated: isFacilitatorRequest(req),
    });
  });

  // Facilitator Auth: one-time setup when FACILITATOR_PASSCODE is not configured
  app.post('/api/facilitator/claim', (req, res) => {
    const envPass = getEnvFacilitatorPasscode();
    if (envPass !== null || state.facilitatorPasscodeHash) {
      res.status(409).json({ error: 'Un code animateur est déjà configuré.' });
      return;
    }

    const { passcode } = req.body ?? {};
    if (typeof passcode !== 'string' || passcode.trim().length < 4 || passcode.trim().length > 64) {
      res.status(400).json({ error: 'Le code animateur doit contenir entre 4 et 64 caractères.' });
      return;
    }

    state.facilitatorPasscodeHash = hashPasscode(passcode.trim());
    saveStateSync(state);
    const token = issueFacilitatorToken();
    res.json({ token });
  });

  // Facilitator Auth: login
  app.post('/api/facilitator/login', (req, res) => {
    const { passcode } = req.body ?? {};
    if (typeof passcode !== 'string' || passcode.trim().length === 0) {
      res.status(400).json({ error: 'Veuillez saisir le code animateur.' });
      return;
    }

    const envPass = getEnvFacilitatorPasscode();
    if (envPass === null && !state.facilitatorPasscodeHash) {
      res.status(409).json({ error: 'Aucun code animateur configuré pour le moment.' });
      return;
    }

    if (!verifyFacilitatorPasscode(passcode.trim())) {
      res.status(401).json({ error: 'Code animateur incorrect.' });
      return;
    }

    const token = issueFacilitatorToken();
    res.json({ token });
  });

  // Facilitator Action: reset a theme to initial seed notes
  app.post('/api/facilitator/reset-theme', (req, res) => {
    if (!isFacilitatorRequest(req)) {
      res.status(401).json({ error: 'Accès animateur requis.' });
      return;
    }

    const { themeId } = req.body ?? {};
    if (!isValidThemeId(themeId)) {
      res.status(400).json({ error: 'Thématique invalide.' });
      return;
    }

    const remainingNotes = state.notes.filter((n) => n.themeId !== themeId);
    const seedForTheme = buildSeedNotesForTheme(themeId);
    state.notes = [...remainingNotes, ...seedForTheme];
    state.lockedThemes[themeId] = false;
    state.timers[themeId] = buildInitialTimer();
    saveStateSync(state);

    broadcast('theme:reset', {
      themeId,
      notes: seedForTheme,
      locked: false,
      timer: state.timers[themeId],
    });
    res.json({ ok: true, notes: seedForTheme, timer: state.timers[themeId] });
  });

  // Facilitator Action: lock or unlock note creation on a theme
  app.post('/api/facilitator/toggle-lock', (req, res) => {
    if (!isFacilitatorRequest(req)) {
      res.status(401).json({ error: 'Accès animateur requis.' });
      return;
    }

    const { themeId, locked } = req.body ?? {};
    if (!isValidThemeId(themeId) || typeof locked !== 'boolean') {
      res.status(400).json({ error: 'Paramètres invalides.' });
      return;
    }

    state.lockedThemes[themeId] = locked;
    saveStateSync(state);
    broadcast('theme:lock', { themeId, locked });
    res.json({ ok: true, themeId, locked });
  });

  // Facilitator Action: merge two post-it notes
  app.post('/api/facilitator/merge-notes', (req, res) => {
    if (!isFacilitatorRequest(req)) {
      res.status(401).json({ error: 'Accès animateur requis.' });
      return;
    }

    const { primaryId, secondaryId, mergedText } = req.body ?? {};
    if (
      typeof primaryId !== 'string' ||
      typeof secondaryId !== 'string' ||
      primaryId === secondaryId ||
      typeof mergedText !== 'string' ||
      mergedText.trim().length === 0 ||
      mergedText.trim().length > 160
    ) {
      res.status(400).json({ error: 'Paramètres de fusion invalides (1 à 160 caractères).' });
      return;
    }

    const primaryNote = state.notes.find((n) => n.id === primaryId);
    const secondaryNote = state.notes.find((n) => n.id === secondaryId);
    if (!primaryNote || !secondaryNote || primaryNote.themeId !== secondaryNote.themeId) {
      res.status(404).json({ error: 'Post-its introuvables dans cette thématique.' });
      return;
    }

    const combinedVoters = Array.from(new Set([...primaryNote.voterIds, ...secondaryNote.voterIds]));
    primaryNote.text = mergedText.trim();
    primaryNote.voterIds = combinedVoters;
    primaryNote.isPreFilled = primaryNote.isPreFilled && secondaryNote.isPreFilled;
    primaryNote.updatedAt = Date.now();

    state.notes = state.notes.filter((n) => n.id !== secondaryId);
    saveStateSync(state);

    broadcast('notes:merged', {
      updatedNote: primaryNote,
      removedId: secondaryId,
    });
    res.json({ updatedNote: primaryNote, removedId: secondaryId });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Atelier REX — Innov'Camp 26 listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
