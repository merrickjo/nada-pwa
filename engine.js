/* Nada engine — pure music maths, no DOM. Tested in tests/engine.test.js.
   Chords are parsed from chart symbols (Em7, Dsus, B5/C#, Gbmaj7),
   transposed between keys, labelled with Nashville numbers and voiced as
   simple close-position triads that move as little as possible. */

const LETTER = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const SHARPS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLATS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const FLAT_KEYS = new Set(['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb']);

/** The twelve keys offered in the key picker, spelled the way charts spell them. */
export const KEYS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

export function pc(name) {
  const m = /^([A-G])([#b]?)$/.exec(name);
  if (!m) throw new Error('Not a note name: ' + name);
  return (LETTER[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + 12) % 12;
}

export function spell(pitchClass, key) {
  return (FLAT_KEYS.has(key) ? FLATS : SHARPS)[((pitchClass % 12) + 12) % 12];
}

/** Parse a chart symbol. Returns null for "N.C." or anything unreadable. */
export function parseChord(sym) {
  const m = /^([A-G][#b]?)([^/\s]*)(?:\/([A-G][#b]?))?$/.exec(String(sym).trim());
  if (!m) return null;
  const [, root, suffix, bass] = m;
  let quality = 'maj';
  if (/^(m(?!aj)|min|-)/.test(suffix)) quality = 'min';
  if (/^(dim|°)/.test(suffix)) quality = 'dim';
  if (/^(aug|\+)/.test(suffix)) quality = 'aug';
  return { symbol: String(sym).trim(), root, suffix, bass: bass || null, quality };
}

/** Transpose a chart symbol from one key to another (spelled for the new key). */
export function transposeChord(sym, fromKey, toKey) {
  const c = parseChord(sym);
  if (!c) return sym;
  const shift = pc(toKey) - pc(fromKey);
  const root = spell(pc(c.root) + shift, toKey);
  const bass = c.bass ? '/' + spell(pc(c.bass) + shift, toKey) : '';
  return root + c.suffix + bass;
}

const DEGREES = ['1', 'b2', '2', 'b3', '3', '4', '#4', '5', 'b6', '6', 'b7', '7'];

/** Nashville number of a chord in a key: C#m in E → "6m", B/D# in B → "1/3". */
export function nashville(sym, key) {
  const c = parseChord(sym);
  if (!c) return '–';
  const d = DEGREES[(pc(c.root) - pc(key) + 12) % 12];
  const q = c.quality === 'min' ? 'm' : c.quality === 'dim' ? '°' : c.quality === 'aug' ? '+' : '';
  const b = c.bass ? '/' + DEGREES[(pc(c.bass) - pc(key) + 12) % 12] : '';
  return d + q + b;
}

const TRIAD = { maj: [0, 4, 7], min: [0, 3, 7], dim: [0, 3, 6], aug: [0, 4, 8] };

/** The plain triad under any chart symbol: Em7 → E G B, Dsus → D F# A, B5 → B D# F#.
    Level 1 deliberately plays every chord as its triad; colours come later. */
export function triadPitchClasses(sym) {
  const c = parseChord(sym);
  if (!c) return null;
  const r = pc(c.root);
  return TRIAD[c.quality].map(i => (r + i) % 12);
}

const RH_LO = 55, RH_HI = 77;        // G3 … F5: the right hand stays around middle C
const HOME = [60, 64, 67];           // C E G, where every sequence starts from

function closedVoicings(pcs) {
  const out = [];
  for (let inv = 0; inv < 3; inv++) {
    const order = [pcs[inv], pcs[(inv + 1) % 3], pcs[(inv + 2) % 3]];
    for (let start = RH_LO; start < RH_LO + 12; start++) {
      if (start % 12 !== order[0]) continue;
      for (let base = start; base <= RH_HI; base += 12) {
        const notes = [base];
        for (let i = 1; i < 3; i++) {
          let n = notes[i - 1] + 1;
          while (n % 12 !== order[i]) n++;
          notes.push(n);
        }
        if (notes[2] <= RH_HI) out.push(notes);
      }
    }
  }
  return out;
}

function distance(a, b) { return a.reduce((s, n, i) => s + Math.abs(n - b[i]), 0); }

/** Right-hand notes (MIDI) for a chord, closest to the previous voicing. */
export function voiceTriad(sym, prev = HOME) {
  const pcs = triadPitchClasses(sym);
  if (!pcs) return null;
  let best = null, bestScore = Infinity;
  for (const v of closedVoicings(pcs)) {
    const centre = Math.abs((v[0] + v[2]) / 2 - 64);
    const score = distance(v, prev) * 10 + centre;
    if (score < bestScore) { best = v; bestScore = score; }
  }
  return best;
}

/** Right-hand fingering for a three-note close voicing (1 thumb … 5 pinky). */
export function fingering(notes) {
  const g1 = notes[1] - notes[0], g2 = notes[2] - notes[1];
  return g1 <= 4 && g2 >= 5 ? [1, 2, 5] : [1, 3, 5];
}

/** Left-hand octave on the chord's bass note (the slash note if there is one), C2–B3. */
export function bassOctave(sym) {
  const c = parseChord(sym);
  if (!c) return null;
  const low = 36 + pc(c.bass || c.root);
  return [low, low + 12];
}

/** Voice a whole sequence so each chord moves as little as possible from the last. */
export function voiceSequence(symbols) {
  let prev = HOME;
  return symbols.map(sym => {
    const rh = voiceTriad(sym, prev);
    if (!rh) return { symbol: sym, rh: null, lh: null, fingers: null };
    prev = rh;
    return { symbol: sym, rh, lh: bassOctave(sym), fingers: fingering(rh) };
  });
}

/** Semitones to set on the piano's transpose so C-shape playing sounds in the song's key.
    Picks the smaller move: G is +7 or −5 → −5. */
export function pianoTranspose(playKey, soundKey) {
  let d = (pc(soundKey) - pc(playKey) + 12) % 12;
  if (d > 6) d -= 12;
  return d;
}

/** Split a chart line into chord symbols, ignoring bar lines. */
export function splitChords(line) {
  return String(line).split(/[\s|]+/).filter(Boolean);
}

/** Parse the edit sheet: one section per line, "Name: chords", optional "x2" at the end.
    Returns { sections, errors } where errors name the line and the symbol. */
export function parseSectionText(text) {
  const sections = [], errors = [];
  String(text).split('\n').forEach((raw, i) => {
    const line = raw.trim();
    if (!line) return;
    const m = /^([^:]+):\s*(.*)$/.exec(line);
    if (!m) { errors.push(`Line ${i + 1}: start with a section name and a colon, like "Verse: C G Am F".`); return; }
    let body = m[2].trim(), times = 1;
    const rep = /\s[x×](\d+)$/i.exec(body);
    if (rep) { times = +rep[1]; body = body.slice(0, rep.index).trim(); }
    const bad = splitChords(body).filter(s => !parseChord(s));
    if (bad.length) errors.push(`Line ${i + 1}: can't read ${bad.map(b => '"' + b + '"').join(', ')}.`);
    sections.push({ name: m[1].trim(), chords: body, times });
  });
  return { sections, errors };
}

export function sectionsToText(sections) {
  return sections.map(s => `${s.name}: ${s.chords}${s.times > 1 ? ' x' + s.times : ''}`).join('\n');
}

/** MIDI → name with octave, e.g. 60 → "C4". */
export function noteName(m, key = 'C') { return spell(m % 12, key) + (Math.floor(m / 12) - 1); }
