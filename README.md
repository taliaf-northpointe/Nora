# Nora — Game Show Host

A fill-in-the-blank party game for the team. One person hosts on a shared
screen, everyone else plays from their phone. Nora reads every card out loud.

**Play it:** https://taliaf-northpointe.github.io/Nora/

Everything is one file. `index.html` holds the game, the deck, the styling and
Nora's avatar — no build step, no dependencies, nothing to install.

---

## Setup

### 1. Publish the page

Repo → **Settings** → **Pages** → Source: *Deploy from a branch*, Branch:
`main`, folder `/ (root)`. Save. A minute later the game is live.

### 2. Make a database for the rooms

Phones and the host screen need somewhere to meet. This is once, ever.

1. https://console.firebase.google.com → create a project. Decline Google
   Analytics, it isn't needed.
2. Sidebar: **Build** → **Realtime Database** → **Create Database**. Nearest
   region, start in **test mode**.
3. **Rules** tab, paste this, Publish:

   ```json
   {
     "rules": {
       "ngs": {
         ".read": true,
         ".write": true
       }
     }
   }
   ```

4. Note the database name from the top of the page — the part before
   `.firebaseio.com`, usually `yourproject-default-rtdb`.

No API key, no SDK, no login. The game talks to it over plain HTTPS.

### 3. Type it in once

Open the game, click **Host on this screen**, and put that database name in the
**Room sync database** box. That's the last time anyone needs to think about
it: the host screen builds a join link with the database baked into it, and
that link is what you share from then on. Bookmark it.

If you'd rather bake it into the page instead, set `FIREBASE_URL` near the top
of the script in `index.html` and the box disappears.

### About those rules

They let anyone who knows the database name read and write under `ngs/`, and
that name is visible in the join link. Treat the database as public and keep
nothing else in the project. The rules scope access to the `ngs` branch only.

---

## Running a game

1. Open the link on the computer you're sharing. **Host on this screen** →
   **Open the room**.
2. Share your screen in Teams **with computer sound on**, or nobody hears her.
3. The lobby shows a four-character code, a QR code, and the join link.
   Players scan the QR, or open the link — which drops them straight onto the
   name screen with the code already filled in. No sign-in, no app, no account.
4. Two players is enough to start.

**Host in Microsoft Edge** if you want the Ava voice. She's an Edge-only voice;
elsewhere Nora falls back to the best British or Australian voice installed.

**Add practice player** in the host toolbar drops in a bot that submits and
votes on its own, so you can test the whole loop alone first.

**Close submissions**, **Close voting** and **Skip to voting** are always
available, so a phone that wandered off can never stall the game.

---

## Editing the cards

In `index.html`, find `const DECK_PROMPTS` (host cards) or `const DECK_ANSWERS`
(player cards). One card per line, no quotes or commas. Host cards use `___`
for the blank.

`CARDS.md` is the current player deck, alphabetized, for easier reading.

## Nora's dialogue

Search for `const NORA`. Every line she says is a list, picked from at random
so she doesn't repeat herself. `{n}` is a player name, `{r}` the round, `{s}` a
score.

---

## How it works

The host browser is the referee. It holds the real game state and writes it to
a few shared keys; phones poll those keys every couple of seconds and write
only their own submission and vote.

- `ngs/CODE/host` — game state. Host writes, everyone reads.
- `ngs/CODE/pl/<id>` — one key per player. That player writes, host reads.
- `ngs/CODE/hand/<id>` — a player's six cards, written by the host.

Hands live in separate keys rather than inside the shared state, so nobody can
open dev tools and read the room's cards.

Two interchangeable backends provide those keys, chosen automatically:
`window.storage` when the game runs inside a Claude artifact, and Firebase over
REST everywhere else. The game logic doesn't know which is in use, so the same
file works in both places.

The QR code is drawn by a small library loaded from a CDN. If that's blocked,
the QR is skipped and the printed join link still works.

Comfortable up to about a dozen players. Past that the host's polling interval
stretches automatically and it'll feel slower.
