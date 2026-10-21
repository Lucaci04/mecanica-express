import { put, get } from '@vercel/blob';
import { createHash, timingSafeEqual } from 'node:crypto';

export const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
});

// The admin password lives in the ADMIN_PIN environment variable, never in the page.
export function isAdmin(request) {
  const pin = process.env.ADMIN_PIN;
  if (!pin) return false;
  const hash = s => createHash('sha256').update(String(s)).digest();
  return timingSafeEqual(hash(pin), hash(request.headers.get('x-admin-pin') || ''));
}

// Request bodies are small JSON objects; anything larger is refused.
export async function body(request, max = 12000) {
  const text = await request.text();
  if (text.length > max) throw new Error('too large');
  return JSON.parse(text || '{}');
}

export const str = (v, max) => String(v ?? '').trim().slice(0, max);
export const strList = (v, max = 40, len = 80) => (Array.isArray(v) ? v : []).slice(0, max).map(x => str(x, len)).filter(Boolean);

// Data is stored as private JSON files in the project's Blob store.
export async function readJSON(pathname) {
  const r = await get(pathname, { access: 'private', useCache: false });
  if (!r || r.statusCode !== 200) return null;
  return JSON.parse(await new Response(r.stream).text());
}

export const writeJSON = (pathname, data) => put(pathname, JSON.stringify(data), {
  access: 'private', contentType: 'application/json', addRandomSuffix: false, allowOverwrite: true
});
