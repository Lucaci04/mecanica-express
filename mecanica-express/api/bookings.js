import { list, del } from '@vercel/blob';
import { json, isAdmin, body, str, strList, readJSON, writeJSON } from './_lib.js';

const STATUSES = ['noua', 'confirmata', 'finalizata', 'anulata'];
const ID = /^[a-z0-9]{6,24}$/;
const path = id => `bookings/${id}.json`;

// Public: the booking form sends a new request here.
export async function POST(request) {
  let b;
  try { b = await body(request); } catch (e) { return json({ error: 'Cerere invalidă.' }, 400); }
  const item = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
    created: new Date().toISOString(),
    status: 'noua',
    canal: str(b.canal, 20),
    services: strList(b.services),
    symptoms: strList(b.symptoms),
    date: str(b.date, 10), time: str(b.time, 5),
    vehicul: str(b.vehicul, 20), combustibil: str(b.combustibil, 20),
    marca: str(b.marca, 40), model: str(b.model, 40), an: str(b.an, 20), nr: str(b.nr, 15),
    vin: str(b.vin, 17), km: str(b.km, 12),
    nume: str(b.nume, 80), telefon: str(b.telefon, 25), email: str(b.email, 120)
  };
  if (b.demo && isAdmin(request)) item.demo = true;
  if (!item.nume || !(item.telefon || item.email) || !item.marca || !item.model || !/^\d{4}-\d{2}-\d{2}$/.test(item.date) || !/^\d{2}:\d{2}$/.test(item.time) || !item.services.length) {
    return json({ error: 'Lipsesc date obligatorii.' }, 400);
  }
  await writeJSON(path(item.id), item);
  return json({ ok: true, id: item.id }, 201);
}

// Admin: every booking.
export async function GET(request) {
  if (!isAdmin(request)) return json({ error: 'Parolă greșită.' }, 401);
  const files = [];
  let cursor;
  do {
    const page = await list({ prefix: 'bookings/', cursor, limit: 1000 });
    files.push(...page.blobs);
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  const items = await Promise.all(files.map(f => readJSON(f.pathname).catch(() => null)));
  return json(items.filter(Boolean));
}

// Admin: change status.
export async function PATCH(request) {
  if (!isAdmin(request)) return json({ error: 'Parolă greșită.' }, 401);
  let b;
  try { b = await body(request, 500); } catch (e) { return json({ error: 'Cerere invalidă.' }, 400); }
  if (!ID.test(b.id || '') || !STATUSES.includes(b.status)) return json({ error: 'Cerere invalidă.' }, 400);
  const item = await readJSON(path(b.id));
  if (!item) return json({ error: 'Nu există.' }, 404);
  item.status = b.status;
  await writeJSON(path(b.id), item);
  return json(item);
}

// Admin: delete.
export async function DELETE(request) {
  if (!isAdmin(request)) return json({ error: 'Parolă greșită.' }, 401);
  const id = new URL(request.url).searchParams.get('id') || '';
  if (!ID.test(id)) return json({ error: 'Cerere invalidă.' }, 400);
  await del(path(id));
  return json({ ok: true });
}
