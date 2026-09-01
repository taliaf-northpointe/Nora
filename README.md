# Nora — Game Show Host

A fill-in-the-blank party game for the team. One person hosts on a shared
screen, everyone else plays from their phone. Nora reads every card out loud.

**Play it:** https://taliaf-northpointe.github.io/Nora/

Everything is one file. `index.html` holds the game, the deck, the styling and
Nora's avatar — no build step, no dependencies, nothing to install.

---

## Setup

Repo → **Settings** → **Pages** → Source: *Deploy from a branch*, Branch:
`main`, folder `/ (root)`. Save. A minute later the game is live.

That's the whole setup. There is no database and no account: the host's
browser *is* the room, and phones connect straight to it over a
browser-to-browser channel (WebRTC — the same thing Teams calls run on). The
room code doubles as the address, so the code on screen is all anyone needs.

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

Three interchangeable backends provide those keys, chosen automatically:
`window.storage` when the game runs inside a Claude artifact; a direct
browser-to-browser connection (WebRTC via PeerJS) everywhere else, where the
host's browser holds the keys and players' reads and writes travel over the
data channel; and, only if you pass `?db=your-database` in the URL or set
`FIREBASE_URL` in the script, a Firebase Realtime Database over REST. The game
logic doesn't know which is in use, so the same file works in all three places.

Browser-to-browser mode uses PeerJS's free public broker once, to introduce
each phone to the host; after the handshake, game traffic flows directly
between the devices. If the host closes their tab, the room is gone — open a
new one.

The QR code and the connection library are loaded from a CDN. If the CDN is
blocked, the QR is skipped and the printed join link still works.

Comfortable up to about a dozen players. Past that the host's polling interval
stretches automatically and it'll feel slower.
