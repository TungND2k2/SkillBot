// Payload REST client — JWT auth, CRUD helpers.
const API_BASE = '/api';
const TOKEN_KEY = 'of-portal-token';
const USER_KEY = 'of-portal-user';

let _token = null;
let _user = null;
const _listeners = new Set();

if (typeof window !== 'undefined') {
  try {
    _token = window.localStorage.getItem(TOKEN_KEY) ?? null;
    const u = window.localStorage.getItem(USER_KEY);
    if (u) _user = JSON.parse(u);
  } catch { _token = null; _user = null; }
}

function notify() {
  for (const cb of _listeners) { try { cb({ token: _token, user: _user }); } catch {} }
}

export function subscribeAuth(cb) { _listeners.add(cb); return () => _listeners.delete(cb); }
export function getAuthState() { return { token: _token, user: _user }; }

function persist(token, user) {
  _token = token ?? null; _user = user ?? null;
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token); else localStorage.removeItem(TOKEN_KEY);
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user)); else localStorage.removeItem(USER_KEY);
  } catch {}
  notify();
}

export async function login(email, password) {
  const res = await fetch(`${API_BASE}/users/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.token) throw new Error(json?.errors?.[0]?.message || json?.message || 'Sai email/mật khẩu');
  persist(json.token, json.user ?? null);
  return json.user ?? null;
}

export function logout() { persist(null, null); }

export async function fetchPayload(path, init = {}) {
  const headers = { ...(init.headers || {}) };
  if (_token) headers.Authorization = `JWT ${_token}`;
  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (res.status === 401 && _token) persist(null, null);
  return res;
}

function flattenWhere(where, params, prefix = 'where') {
  for (const [k, v] of Object.entries(where ?? {})) {
    if (v == null) continue;
    const key = `${prefix}[${k}]`;
    if (Array.isArray(v)) {
      if (v.length > 0 && typeof v[0] === 'object' && v[0] !== null) {
        v.forEach((item, idx) => flattenWhere(item, params, `${key}[${idx}]`));
      } else { params.set(key, v.join(',')); }
    } else if (typeof v === 'object') { flattenWhere(v, params, key); }
    else { params.set(key, String(v)); }
  }
}

export async function countDocs(collection, where = {}) {
  const params = new URLSearchParams({ limit: '0', depth: '0' });
  flattenWhere(where, params);
  const res = await fetchPayload(`/${collection}?${params}`);
  if (!res.ok) return null;
  const j = await res.json();
  return typeof j.totalDocs === 'number' ? j.totalDocs : null;
}

export async function listDocs(collection, opts = {}) {
  const { where = {}, limit = 25, page = 1, sort, depth = 1 } = opts;
  const params = new URLSearchParams({ limit: String(limit), page: String(page), depth: String(depth) });
  if (sort) params.set('sort', sort);
  flattenWhere(where, params);
  const res = await fetchPayload(`/${collection}?${params}`);
  if (!res.ok) return { docs: [], totalDocs: 0, totalPages: 1, page };
  return res.json();
}

export async function getDoc(collection, id, depth = 2) {
  const res = await fetchPayload(`/${collection}/${encodeURIComponent(id)}?depth=${depth}`);
  if (!res.ok) return null;
  return res.json();
}

export async function createDoc(collection, body) {
  const res = await fetchPayload(`/${collection}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.errors?.[0]?.message || json?.message || `HTTP ${res.status}`);
  return json.doc ?? json;
}

export async function updateDoc(collection, id, body) {
  const res = await fetchPayload(`/${collection}/${encodeURIComponent(id)}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.errors?.[0]?.message || json?.message || `HTTP ${res.status}`);
  return json.doc ?? json;
}

export async function deleteDoc(collection, id) {
  const res = await fetchPayload(`/${collection}/${encodeURIComponent(id)}`, { method: 'DELETE' });
  if (!res.ok) { const j = await res.json().catch(() => ({})); throw new Error(j?.errors?.[0]?.message || `HTTP ${res.status}`); }
  return true;
}
