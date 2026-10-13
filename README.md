# Nada

Merrick's piano practice room for house worship, built for the iPad in landscape
next to the Kawai ES60. It's a vanilla JS PWA with no build step, uses the
carpe-kit v2.0.0 design, and is local-first (everything is kept in
localStorage on the device).

*Nada* is Indonesian for a musical tone or pitch.

## What it does

- **The stage** (on every screen) is a 24-key keyboard, C2–E5, that shows
  which keys to press. The right hand is blue, the left hand is ember, and the
  numbers are fingers. Below it are a chord strip with Nashville numbers, a
  hands switch (Right / Left / Both), tempo, "each chord" length, "Bass on 3",
  and a click track that plays the loop.
- **Practice** is Level 1, the 1-5-6-4 loop in C, with a guided 15-minute
  session. The stages switch the hands view for you.
- **Songs** holds the five songs: Highlands, Wondrous Cross, If It Wasn't For
  Jesus, Remembrance and Know You Will.
  - Every song is stored in its original key and shown in **the key your hands
    play in (C by default)**, along with the piano transpose setting that makes
    the C shapes sound in the original key.
  - Tap **Practise** on a section to load it onto the stage.
  - **Edit chords** overrides a chart on this device. Wondrous Cross starts
    empty, because no free chart was found for that version.
- **Log** shows minutes per day, counted while the loop plays or a session
  runs. It also shows a 15-minute streak and the last 14 days.

## Deliberate Level 1 limits

- Every chord is played as its plain triad (Em7 becomes Em, Dsus becomes D,
  Fsus2 becomes F), voiced to move as little as possible from the last chord.
  The chart symbol stays visible on the chip. Colour chords belong in a later
  level.
- The source charts don't give bar lengths, so every chord gets one bar by
  default. Change this with "Each chord".

## Adding levels later

Append to `LEVELS` in `songs.js` (key, chords, stages, goal). The Practice
view currently renders `LEVELS[0]`, so it will need a level picker once there
are two levels.

## Run locally

```bash
python3 -m http.server 8080   # open http://localhost:8080
npm test                      # engine tests (node --test)
npm run check
```

On the iPad over Wi-Fi, open `http://<mac-ip>:8080`. It runs without the
service worker there. Installing it ("Add to Home Screen" with offline
support) needs HTTPS.

## Deploy (GitHub Pages, same as Nett)

```bash
gh repo create merrickjo/nada-pwa --private --source=. --push
```

Turn on Pages from `main` / root. The app URL will be
`https://merrickjo.github.io/nada-pwa/`. Open it in Safari on the iPad, then
Share → Add to Home Screen.

Bump `VERSION` in `sw.js` for every shell change.

## Song sources

Chords come from the Essential Worship charts linked in `songs.js`. Writers,
key and time signature come from PraiseCharts. Only chords are stored, never
lyrics.

The If It Wasn't For Jesus chart prints "Gmaj7" in two places where every
other line has Gbmaj7. Nada treats it as Gbmaj7.

## Files

| File | What it is |
|---|---|
| `index.html` | the shell |
| `app.js` | UI, audio, storage |
| `engine.js` | chord parsing, transposition, Nashville numbers, voicing (tested) |
| `songs.js` | the songbook and levels |
| `styles.css` | the Nada palette |
| `sw.js` | cache-first shell |
| `carpe-kit.*` and `fonts/` | copied from `../carpe-kit`; never edit the copies |
