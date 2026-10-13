import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseChord, transposeChord, nashville, voiceSequence, fingering, bassOctave,
  pianoTranspose, parseSectionText, sectionsToText, triadPitchClasses, splitChords
} from '../engine.js';
import { SONGS } from '../songs.js';

test('parses chart symbols', () => {
  assert.equal(parseChord('C#m').quality, 'min');
  assert.equal(parseChord('Gbmaj7').quality, 'maj');
  assert.equal(parseChord('Dsus').quality, 'maj');
  assert.equal(parseChord('B5/C#').bass, 'C#');
  assert.equal(parseChord('N.C.'), null);
});

test('transposes into the key of C with the right spelling', () => {
  assert.equal(transposeChord('C#m', 'E', 'C'), 'Am');
  assert.equal(transposeChord('B/D#', 'B', 'C'), 'C/E');
  assert.equal(transposeChord('Gbmaj7', 'Db', 'C'), 'Fmaj7');
  assert.equal(transposeChord('Em7', 'G', 'C'), 'Am7');
  assert.equal(transposeChord('C', 'C', 'Bb'), 'Bb');
  assert.equal(transposeChord('Am', 'C', 'E'), 'C#m');
});

test('Nashville numbers', () => {
  assert.equal(nashville('C#m', 'E'), '6m');
  assert.equal(nashville('B/D#', 'B'), '1/3');
  assert.equal(nashville('Ab6', 'Db'), '5');
  assert.equal(nashville('F', 'C'), '4');
});

test('the day-one loop voices exactly as taught', () => {
  const v = voiceSequence(['C', 'G', 'Am', 'F']);
  assert.deepEqual(v.map(x => x.rh), [[60, 64, 67], [59, 62, 67], [60, 64, 69], [60, 65, 69]]);
  assert.deepEqual(v.map(x => x.fingers), [[1, 3, 5], [1, 2, 5], [1, 2, 5], [1, 3, 5]]);
  assert.deepEqual(v.map(x => x.lh), [[36, 48], [43, 55], [45, 57], [41, 53]]);
});

test('every voicing is a three-note close triad in range', () => {
  for (const s of ['C', 'C#m', 'Db', 'Eb', 'F#', 'Bbm', 'B', 'G#m']) {
    const [v] = voiceSequence([s]);
    assert.equal(v.rh.length, 3);
    assert.ok(v.rh[2] - v.rh[0] <= 9, s + ' spread');
    assert.ok(v.rh[0] >= 55 && v.rh[2] <= 77, s + ' range');
    const pcs = new Set(v.rh.map(n => n % 12));
    assert.deepEqual([...pcs].sort(), [...triadPitchClasses(s)].sort());
  }
});

test('slash chords put the slash note in the left hand', () => {
  assert.deepEqual(bassOctave('C/E'), [40, 52]);
});

test('fingering rule', () => {
  assert.deepEqual(fingering([60, 64, 67]), [1, 3, 5]);
  assert.deepEqual(fingering([59, 62, 67]), [1, 2, 5]);
  assert.deepEqual(fingering([60, 65, 69]), [1, 3, 5]);
});

test('piano transpose picks the smaller move', () => {
  assert.equal(pianoTranspose('C', 'G'), -5);
  assert.equal(pianoTranspose('C', 'E'), 4);
  assert.equal(pianoTranspose('C', 'Db'), 1);
  assert.equal(pianoTranspose('C', 'B'), -1);
  assert.equal(pianoTranspose('C', 'C'), 0);
});

test('edit sheet round-trips and reports bad chords', () => {
  const { sections, errors } = parseSectionText('Verse: C G Am F x2\nChorus: F C G');
  assert.equal(errors.length, 0);
  assert.equal(sections[0].times, 2);
  assert.equal(sectionsToText(sections), 'Verse: C G Am F x2\nChorus: F C G');
  const bad = parseSectionText('Verse: C Hm\nno colon here');
  assert.equal(bad.errors.length, 2);
});

test('every song chord in the songbook parses', () => {
  for (const s of SONGS) for (const sec of s.sections)
    for (const c of splitChords(sec.chords)) assert.ok(parseChord(c), `${s.title} ${sec.name}: ${c}`);
});
