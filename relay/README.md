# Nora relay (Cloudflare Worker)

This is Nora's optional **central server** — the piece that makes the game
work across *different* networks (home, office, VPN, phone data), the way
online Codenames does. Without it, the game only connects players on the same
wifi.

It's a tiny [Cloudflare Worker](https://workers.cloudflare.com/): every
player's browser makes ordinary HTTPS calls to it, so nothing gets blocked by
firewalls. One [Durable Object](https://developers.cloudflare.com/durable-objects/)
per room code holds that room's live state in memory, and each room
self-destructs a few hours after its last activity. It stores only trivial
game data — display names, which card was played, votes — and nothing else.

Runs comfortably on Cloudflare's **free plan**.

## Deploy it (about 10 minutes)

You need [Node.js](https://nodejs.org) installed and a free Cloudflare account.

1. **Make a free Cloudflare account:** https://dash.cloudflare.com/sign-up
   (no credit card for the free plan).

2. From this `relay/` folder, install and log in:

   ```sh
   npm install
   npx wrangler login      # opens a browser to authorize your account
   ```

   *(On a locked-down network where the login browser flow won't complete,
   create an API token instead — Cloudflare dashboard → My Profile → API
   Tokens → "Edit Cloudflare Workers" template — and run with
   `CLOUDFLARE_API_TOKEN=<token> npx wrangler deploy`.)*

3. **Deploy:**

   ```sh
   npm run deploy
   ```

   Wrangler prints the live URL, e.g. `https://nora-relay.<your-subdomain>.workers.dev`.

4. **Point the game at it.** Open `../index.html`, find `const WORKER_URL = ""`
   near the top of the script, and paste the URL:

   ```js
   const WORKER_URL = "https://nora-relay.your-subdomain.workers.dev";
   ```

   Commit and push. From then on every player uses the relay automatically —
   they still just open the join link and type the room code.

## Notes

- **Allowed sites.** The Worker only accepts browser requests from the domains
  in `ALLOW_ORIGINS` at the top of `src/worker.js`. It already lists the
  GitHub Pages site and localhost — add any other domain you serve the game
  from.
- **Test locally first (optional):** `npm run dev` runs the Worker on
  `http://127.0.0.1:8787`, and you can point the game at it with
  `?relay=http://127.0.0.1:8787` in the page URL.
- **Free-plan headroom.** Each poll is one request. A ~6-player game is on the
  order of tens of thousands of requests per hour, so a few game nights a day
  sit well inside the free 100k requests/day. Heavy daily use would want the
  $5/month Workers plan.
- **Wiping data.** Rooms auto-expire after 6 hours of inactivity
  (`ROOM_TTL_MS`). Ending a game from the host toolbar clears its room
  immediately.
