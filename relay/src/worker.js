/* ============================================================
   Nora relay — a tiny central server, the way online Codenames works.

   Every player's browser connects OUT to this one Worker over HTTPS, so it
   works on any network (home, office, VPN, phone data) — no browser-to-
   browser hole-punching, nothing to get blocked by a firewall.

   One Durable Object per room code holds that room's live state (host
   state, each player's record, each player's hand). Rooms auto-purge after
   a few idle hours, so nothing lingers. The Worker stores only trivial game
   data: display names, which card was played, votes.
   ============================================================ */

// Only these sites may use the relay from a browser (Origin can't be spoofed
// by a browser). Add your own domain here if you serve the game elsewhere.
const ALLOW_ORIGINS = [
  'https://taliaf-northpointe.github.io',
  'http://localhost:8471',
  'http://127.0.0.1:8471'
];
const ROOM_TTL_MS = 6 * 60 * 60 * 1000;   // purge a room this long after its last write
const MAX_VALUE_BYTES = 64 * 1024;         // cap a single value
const MAX_KEYS = 500;                       // cap keys per room (a game uses a few dozen)

function corsHeaders(origin){
  const allow = ALLOW_ORIGINS.indexOf(origin) > -1 ? origin : ALLOW_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'content-type',
    'Vary': 'Origin'
  };
}
function reply(obj, origin, status){
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: Object.assign({ 'content-type': 'application/json' }, corsHeaders(origin))
  });
}

export default {
  async fetch(req, env){
    const origin = req.headers.get('Origin') || '';
    if(req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders(origin) });

    // a browser request from a site we don't serve — turn it away
    if(origin && ALLOW_ORIGINS.indexOf(origin) === -1) return reply({ error: 'forbidden' }, origin, 403);

    const url = new URL(req.url);
    const m = /^\/r\/([A-Za-z0-9]{1,8})\/(set|get|list|del)$/.exec(url.pathname);
    if(!m || req.method !== 'POST') return reply({ error: 'not found' }, origin, 404);

    const code = m[1].toUpperCase();
    const op = m[2];
    let body = {};
    try { body = JSON.parse((await req.text()) || '{}'); } catch(e){}

    // hand off to the Durable Object that owns this room
    const stub = env.ROOMS.get(env.ROOMS.idFromName(code));
    const doResp = await stub.fetch('https://do/' + op, { method: 'POST', body: JSON.stringify(body) });
    const data = await doResp.json();
    return reply(data, origin, doResp.status);
  }
};

export class Room {
  constructor(state){ this.storage = state.storage; }

  async fetch(req){
    const op = new URL(req.url).pathname.slice(1);
    let body = {};
    try { body = await req.json(); } catch(e){}

    if(op === 'set'){
      if(!body.key) return this.j({ error: 'no key' }, 400);
      if(JSON.stringify(body.value).length > MAX_VALUE_BYTES) return this.j({ error: 'too big' }, 413);
      const existing = await this.storage.list();
      if(!existing.has(body.key) && existing.size >= MAX_KEYS) return this.j({ error: 'room full' }, 429);
      await this.storage.put(body.key, body.value);
      await this.touch();
      return this.j({ ok: true });
    }
    if(op === 'get'){
      const v = await this.storage.get(body.key);
      return this.j({ value: v === undefined ? null : v });
    }
    if(op === 'list'){
      const map = await this.storage.list({ prefix: body.prefix || '' });
      return this.j({ keys: Array.from(map.keys()) });
    }
    if(op === 'del'){
      await this.storage.delete(body.key);
      await this.touch();
      return this.j({ ok: true });
    }
    return this.j({ error: 'bad op' }, 400);
  }

  // slide the self-destruct alarm forward on every write
  async touch(){ await this.storage.setAlarm(Date.now() + ROOM_TTL_MS); }
  async alarm(){ await this.storage.deleteAll(); }

  j(obj, status){
    return new Response(JSON.stringify(obj), { status: status || 200, headers: { 'content-type': 'application/json' } });
  }
}
