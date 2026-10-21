import { json, isAdmin, body, str, readJSON, writeJSON } from './_lib.js';

const TYPES = ['from', 'fixed', 'percent', 'text'];

// Public: announcement and offers shown on the site.
export async function GET() {
  return json((await readJSON('content.json').catch(() => null)) || {});
}

// Admin: save them.
export async function PUT(request) {
  if (!isAdmin(request)) return json({ error: 'Parolă greșită.' }, 401);
  let b;
  try { b = await body(request); } catch (e) { return json({ error: 'Cerere invalidă.' }, 400); }
  const c = { announce: str(b.announce, 200), offerNote: str(b.offerNote, 300) };
  if (Array.isArray(b.offers)) {
    c.offers = b.offers.slice(0, 20).map(o => ({
      name: str(o.name, 100), type: TYPES.includes(o.type) ? o.type : 'text', value: str(o.value, 60),
      until: /^\d{4}-\d{2}-\d{2}$/.test(o.until || '') ? o.until : '', price: str(o.price, 80)
    })).filter(o => o.name && o.value);
  }
  await writeJSON('content.json', c);
  return json(c);
}
