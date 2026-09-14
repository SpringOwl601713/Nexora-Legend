import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

type Member = {
  id: string;
  tiktok: string;
  enabled: boolean;
  createdAt: number;
  revokedAt?: number;
  note?: string;
};

type AuditEntry = {
  at: number;
  action: string;
  actor: string;
  target?: string;
  ip?: string;
};

type Store = {
  founderPasswordHash: string;
  members: Member[];
  audit: AuditEntry[];
};

const PORT = Number(process.env.NEXORA_ACCESS_PORT || 8787);
const HOST = process.env.NEXORA_ACCESS_HOST || '127.0.0.1';
const JWT_SECRET = process.env.NEXORA_JWT_SECRET || crypto.randomBytes(48).toString('hex');
const DATA_FILE = process.env.NEXORA_ACCESS_DATA || path.resolve('server', 'agency-access.json');
const FOUNDER_PASSWORD = process.env.NEXORA_FOUNDER_PASSWORD || '';

function normalizeTikTok(value: string) {
  return value.trim().replace(/^@+/, '').toLowerCase();
}

function loadStore(): Store {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) as Store;
  } catch {
    if (!FOUNDER_PASSWORD) {
      throw new Error('NEXORA_FOUNDER_PASSWORD is required on first start.');
    }
    const store: Store = {
      founderPasswordHash: bcrypt.hashSync(FOUNDER_PASSWORD, 12),
      members: [],
      audit: []
    };
    saveStore(store);
    return store;
  }
}

function saveStore(store: Store) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), 'utf8');
}

function json(res: http.ServerResponse, status: number, body: unknown) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'content-type, authorization',
    'access-control-allow-methods': 'GET,POST,DELETE,OPTIONS'
  });
  res.end(JSON.stringify(body));
}

function readBody(req: http.IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 1024 * 128) reject(new Error('Payload too large'));
    });
    req.on('end', () => {
      try { resolve(body ? JSON.parse(body) : {}); } catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

function tokenFrom(req: http.IncomingMessage) {
  const auth = req.headers.authorization || '';
  return auth.startsWith('Bearer ') ? auth.slice(7) : '';
}

function founderFrom(req: http.IncomingMessage) {
  try {
    const payload = jwt.verify(tokenFrom(req), JWT_SECRET) as { role?: string; sub?: string };
    return payload.role === 'founder' ? payload : null;
  } catch {
    return null;
  }
}

function audit(store: Store, action: string, actor: string, target: string | undefined, req: http.IncomingMessage) {
  store.audit.unshift({ at: Date.now(), action, actor, target, ip: req.socket.remoteAddress });
  store.audit = store.audit.slice(0, 1000);
  saveStore(store);
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return json(res, 204, {});
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  let store: Store;
  try { store = loadStore(); } catch (e: any) { return json(res, 500, { ok: false, error: e?.message || 'Server not initialized' }); }

  if (req.method === 'GET' && url.pathname === '/health') {
    return json(res, 200, { ok: true, service: 'nexora-access' });
  }

  if (req.method === 'POST' && url.pathname === '/founder/login') {
    try {
      const body = await readBody(req);
      const ok = bcrypt.compareSync(String(body.password || ''), store.founderPasswordHash);
      if (!ok) return json(res, 401, { ok: false, error: 'Identifiants invalides' });
      const token = jwt.sign({ role: 'founder', sub: 'founder' }, JWT_SECRET, { expiresIn: '15m' });
      audit(store, 'founder-login', 'founder', undefined, req);
      return json(res, 200, { ok: true, token, expiresInSeconds: 900 });
    } catch {
      return json(res, 400, { ok: false, error: 'Requête invalide' });
    }
  }

  if (req.method === 'POST' && url.pathname === '/founder/password') {
    if (!founderFrom(req)) return json(res, 401, { ok: false, error: 'Non autorisé' });
    try {
      const body = await readBody(req);
      const currentPassword = String(body.currentPassword || '');
      const newPassword = String(body.newPassword || '');
      if (!bcrypt.compareSync(currentPassword, store.founderPasswordHash)) {
        return json(res, 401, { ok: false, error: 'Mot de passe actuel incorrect' });
      }
      if (newPassword.length < 12) {
        return json(res, 400, { ok: false, error: 'Le nouveau mot de passe doit contenir au moins 12 caractères' });
      }
      store.founderPasswordHash = bcrypt.hashSync(newPassword, 12);
      audit(store, 'founder-password-changed', 'founder', undefined, req);
      return json(res, 200, { ok: true });
    } catch {
      return json(res, 400, { ok: false, error: 'Requête invalide' });
    }
  }

  if (req.method === 'GET' && url.pathname === '/members') {
    if (!founderFrom(req)) return json(res, 401, { ok: false, error: 'Non autorisé' });
    return json(res, 200, { ok: true, members: store.members, audit: store.audit.slice(0, 100) });
  }

  if (req.method === 'POST' && url.pathname === '/members') {
    if (!founderFrom(req)) return json(res, 401, { ok: false, error: 'Non autorisé' });
    try {
      const body = await readBody(req);
      const tiktok = normalizeTikTok(String(body.tiktok || ''));
      if (!tiktok) return json(res, 400, { ok: false, error: '@TikTok requis' });
      let member = store.members.find(m => m.tiktok === tiktok);
      if (member) {
        member.enabled = true;
        member.revokedAt = undefined;
        member.note = String(body.note || member.note || '');
      } else {
        member = { id: crypto.randomUUID(), tiktok, enabled: true, createdAt: Date.now(), note: String(body.note || '') };
        store.members.push(member);
      }
      audit(store, 'member-enabled', 'founder', tiktok, req);
      return json(res, 200, { ok: true, member });
    } catch {
      return json(res, 400, { ok: false, error: 'Requête invalide' });
    }
  }

  if (req.method === 'DELETE' && url.pathname.startsWith('/members/')) {
    if (!founderFrom(req)) return json(res, 401, { ok: false, error: 'Non autorisé' });
    const tiktok = normalizeTikTok(decodeURIComponent(url.pathname.slice('/members/'.length)));
    const member = store.members.find(m => m.tiktok === tiktok);
    if (!member) return json(res, 404, { ok: false, error: 'Créateur introuvable' });
    member.enabled = false;
    member.revokedAt = Date.now();
    audit(store, 'member-revoked', 'founder', tiktok, req);
    return json(res, 200, { ok: true, member });
  }

  if (req.method === 'POST' && url.pathname === '/access/check') {
    try {
      const body = await readBody(req);
      const tiktok = normalizeTikTok(String(body.tiktok || ''));
      const member = store.members.find(m => m.tiktok === tiktok);
      const allowed = !!member?.enabled;
      audit(store, allowed ? 'access-allowed' : 'access-denied', tiktok || 'unknown', tiktok || undefined, req);
      return json(res, allowed ? 200 : 403, { ok: allowed, allowed, member: allowed ? member : undefined, checkedAt: Date.now() });
    } catch {
      return json(res, 400, { ok: false, allowed: false, error: 'Requête invalide' });
    }
  }

  return json(res, 404, { ok: false, error: 'Not found' });
});

server.listen(PORT, HOST, () => {
  console.log(`Nexora access server listening on http://${HOST}:${PORT}`);
});
