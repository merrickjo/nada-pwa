/* Nada — UI, audio and storage. Music maths lives in engine.js. */
import {
  KEYS, parseChord, transposeChord, nashville, voiceSequence, pianoTranspose,
  splitChords, parseSectionText, sectionsToText
} from './engine.js';
import { SONGS, LEVELS } from './songs.js';

const VERSION = 'Nada 0.1.0';
const $ = id => document.getElementById(id);
const LO = 36, HI = 76, MIDDLE_C = 60;   // keyboard drawn C2 … E5
const GOAL_MIN = 15;

/* ── storage (per device, localStorage) ── */
const STORE = 'nada.v1';
const state = Object.assign({
  view: 'practice', mode: 'both', bpm: 60, bars: 1, bass3: false,
  songId: SONGS[0].id, playKey: {}, overrides: {}, log: {}
}, load());
function load() { try { return JSON.parse(localStorage.getItem(STORE)) || {}; } catch { return {}; } }
function save() { try { localStorage.setItem(STORE, JSON.stringify(state)); } catch { /* private mode: run without saving */ } }

/* ── the current loop ── */
let seq = { label: '', title: '', items: [], meter: 4, songBpm: null, sectionKey: null };
let cur = 0;

function loadLoop({ label, title, symbols, key, origKey, meter, songBpm, sectionKey }) {
  const voiced = voiceSequence(symbols);
  seq = {
    label, title, meter, songBpm: songBpm || null, sectionKey: sectionKey || null,
    items: voiced.map((v, i) => ({
      ...v,
      num: nashville(symbols[i], key),
      orig: origKey && origKey !== key ? transposeChord(symbols[i], key, origKey) : null
    }))
  };
  cur = 0;
  if (playing) restartLoop();
  renderStage();
}

function loadLevel(level) {
  loadLoop({ label: level.name, title: level.title, symbols: splitChords(level.chords), key: level.key, meter: level.meter });
}

/* ── keyboard ── */
const isBlack = m => [1, 3, 6, 8, 10].includes(m % 12);
const keyEl = {};
function buildKeyboard() {
  const kb = $('kb');
  const whites = [];
  for (let m = LO; m <= HI; m++) if (!isBlack(m)) whites.push(m);
  const W = 100 / whites.length;
  whites.forEach((m, i) => {
    const d = document.createElement('div');
    d.className = 'w'; d.style.left = (i * W) + '%'; d.style.width = W + '%';
    d.dataset.m = m; kb.appendChild(d); keyEl[m] = d;
    if (m % 12 === 0) {
      const t = document.createElement('span');
      t.className = 'oct' + (m === MIDDLE_C ? ' mid' : '');
      t.style.left = ((i + .5) * W) + '%';
      t.textContent = m === MIDDLE_C ? 'Middle C' : 'C' + (m / 12 - 1);
      kb.appendChild(t);
    }
  });
  for (let m = LO; m <= HI; m++) if (isBlack(m)) {
    const i = whites.indexOf(m - 1);
    const d = document.createElement('div');
    d.className = 'b'; d.style.left = ((i + 1) * W - W * .32) + '%'; d.style.width = (W * .64) + '%';
    d.dataset.m = m; kb.appendChild(d); keyEl[m] = d;
  }
  kb.addEventListener('pointerdown', e => {
    const m = +e.target.closest('[data-m]')?.dataset.m;
    if (m) { ensureAudio(); tone(m, audio.currentTime + .01, .12); }
  });
}

function paintKeys() {
  for (const m in keyEl) { keyEl[m].classList.remove('rh', 'lh'); keyEl[m].textContent = ''; }
  const it = seq.items[cur];
  if (!it || !it.rh) return;
  const mark = (m, cls, label) => {
    const e = keyEl[m]; if (!e) return;
    e.classList.add(cls);
    const f = document.createElement('span'); f.className = 'fn'; f.textContent = label; e.appendChild(f);
  };
  if (state.mode !== 'rh') { mark(it.lh[0], 'lh', 5); mark(it.lh[1], 'lh', 1); }
  if (state.mode !== 'lh') it.rh.forEach((m, i) => mark(m, 'rh', it.fingers[i]));
  const p = parseChord(it.symbol);
  $('voicing-note').textContent = p && p.suffix && !/^(m|5)$/.test(p.suffix)
    ? `${it.symbol} is played as a plain ${p.root}${p.quality === 'min' ? 'm' : ''} triad for now.` : '';
}

/* Power chords (B5) would read like a note in octave 5, so show them as the plain letter. */
const show5 = sym => sym.replace(/^([A-G][#b]?)5(?=\/|$)/, '$1');

/* ── stage ── */
function chipHTML(it, i) {
  return `<span class="n">${it.num}${it.orig ? ' · ' + it.orig : ''}</span><span class="c">${show5(it.symbol)}</span>`;
}
function renderStage() {
  $('seq-label').textContent = seq.label;
  $('seq-title').textContent = seq.title;
  $('chips').innerHTML = '';
  seq.items.forEach((it, i) => {
    const li = document.createElement('li');
    li.className = 'chip' + (i === cur ? ' now' : ''); li.tabIndex = 0;
    li.innerHTML = chipHTML(it, i);
    li.addEventListener('click', () => { cur = i; renderStage(); ensureAudio(); strike(i, audio.currentTime + .01); });
    $('chips').appendChild(li);
  });
  document.querySelectorAll('#hands button').forEach(b => b.classList.toggle('on', b.dataset.m === state.mode));
  $('bpm').textContent = state.bpm;
  const per = $('per-chord');
  const opts = seq.meter === 4 ? [[.5, 'Half bar (2 beats)'], [1, '1 bar (4 beats)'], [2, '2 bars (8 beats)']]
                               : [[1, '1 bar (3 beats)'], [2, '2 bars (6 beats)']];
  if (!opts.some(o => o[0] === state.bars)) state.bars = 1;
  per.innerHTML = opts.map(([v, t]) => `<option value="${v}"${v === state.bars ? ' selected' : ''}>${t}</option>`).join('');
  $('b3-wrap').hidden = seq.meter !== 4;
  $('beats').innerHTML = Array.from({ length: seq.meter }, (_, i) => `<i class="beat${i === 0 ? ' one' : ''}"></i>`).join('');
  paintKeys();
}

/* ── audio: a soft synth piano + click, scheduled ahead ── */
let audio = null;
function ensureAudio() {
  if (!audio) audio = new (window.AudioContext || window.webkitAudioContext)();
  if (audio.state === 'suspended') audio.resume();
}
const hz = m => 440 * Math.pow(2, (m - 69) / 12);
function tone(m, t, vel) {
  const o = audio.createOscillator(), o2 = audio.createOscillator(), g2 = audio.createGain();
  const f = audio.createBiquadFilter(), g = audio.createGain();
  o.type = 'triangle'; o.frequency.value = hz(m);
  o2.type = 'sine'; o2.frequency.value = hz(m) * 2; g2.gain.value = .25;
  f.type = 'lowpass'; f.frequency.value = 2400;
  o.connect(f); o2.connect(g2); g2.connect(f); f.connect(g); g.connect(audio.destination);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vel, t + .008);
  g.gain.exponentialRampToValueAtTime(.0008, t + 2.2);
  o.start(t); o2.start(t); o.stop(t + 2.3); o2.stop(t + 2.3);
}
function strike(i, t, bassOnly = false) {
  const it = seq.items[i]; if (!it || !it.rh) return;
  if (!bassOnly && state.mode !== 'lh') it.rh.forEach(m => tone(m, t, .09));
  if (state.mode !== 'rh') it.lh.forEach(m => tone(m, t, .11));
}
function click(t, accent) {
  const o = audio.createOscillator(), g = audio.createGain();
  o.type = 'square'; o.frequency.value = accent ? 1600 : 1100;
  o.connect(g); g.connect(audio.destination);
  g.gain.setValueAtTime(accent ? .12 : .07, t); g.gain.exponentialRampToValueAtTime(.0005, t + .05);
  o.start(t); o.stop(t + .06);
}

let playing = false, nextT = 0, beat = 0, timer = null;
function schedule() {
  const spb = 60 / state.bpm;
  const perChord = Math.max(1, Math.round(seq.meter * state.bars));
  while (nextT < audio.currentTime + .12) {
    const b = beat % perChord, idx = Math.floor(beat / perChord) % seq.items.length, t = nextT;
    const inBar = b % seq.meter;
    click(t, inBar === 0);
    if (b === 0) strike(idx, t);
    else if (state.bass3 && seq.meter === 4 && inBar === 2) strike(idx, t, true);
    const delay = Math.max(0, (t - audio.currentTime) * 1000);
    setTimeout(() => {
      if (!playing) return;
      document.querySelectorAll('.beat').forEach((e, i) => e.classList.toggle('on', i === inBar));
      if (b === 0 && cur !== idx) { cur = idx; markNow(); }
    }, delay);
    nextT += spb; beat++;
  }
}
function markNow() {
  document.querySelectorAll('#chips .chip').forEach((c, i) => c.classList.toggle('now', i === cur));
  paintKeys();
}
function startLoop() {
  if (!seq.items.length) return;
  ensureAudio(); playing = true; beat = 0; cur = 0; markNow();
  nextT = audio.currentTime + .1; timer = setInterval(schedule, 25);
  $('play').textContent = 'Stop'; wake(true);
}
function stopLoop() {
  playing = false; clearInterval(timer);
  document.querySelectorAll('.beat').forEach(e => e.classList.remove('on'));
  $('play').textContent = 'Play loop'; wake(sessT !== null);
}
function restartLoop() { stopLoop(); startLoop(); }

/* ── screen wake lock (tolerates refusal) ── */
let lock = null;
async function wake(on) {
  try {
    if (on && !lock && navigator.wakeLock) lock = await navigator.wakeLock.request('screen');
    if (!on && lock) { await lock.release(); lock = null; }
  } catch { lock = null; }
}

/* ── practice log: seconds per day while the loop plays or a session runs ── */
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
let unsaved = 0;
setInterval(() => {
  if ((playing || sessT !== null) && document.visibilityState === 'visible') {
    const k = today(); state.log[k] = (state.log[k] || 0) + 1;
    if (++unsaved >= 10) { save(); unsaved = 0; }
    renderToday();
    if (state.view === 'log' && state.log[k] % 30 === 0) renderLog();
  }
}, 1000);
function renderToday() {
  const m = Math.floor((state.log[today()] || 0) / 60);
  $('today-strip').textContent = `${m} / ${GOAL_MIN} min today · ${streak()}‑day streak`;
}
function streak() {
  let n = 0; const d = new Date();
  if (!((state.log[today()] || 0) >= GOAL_MIN * 60)) d.setDate(d.getDate() - 1); // today still counts once met
  for (;;) {
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if ((state.log[k] || 0) >= GOAL_MIN * 60) { n++; d.setDate(d.getDate() - 1); } else return n;
  }
}
function renderLog() {
  const secs = state.log[today()] || 0;
  $('log-today').textContent = `${Math.floor(secs / 60)} min`;
  const s = streak();
  $('log-streak').textContent = s ? `${s}‑day streak of ${GOAL_MIN}+ minutes.` : `Reach ${GOAL_MIN} minutes today to start a streak.`;
  const total = Object.values(state.log).reduce((a, b) => a + b, 0);
  $('log-total').textContent = `${Math.round(total / 60)} minutes in total across ${Object.keys(state.log).length} days.`;
  const box = $('log-days'); box.innerHTML = '';
  const max = Math.max(GOAL_MIN * 60 * 1.5, ...Object.values(state.log));
  for (let i = 13; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const v = state.log[k] || 0;
    const col = document.createElement('div'); col.className = 'day';
    col.innerHTML = `<i class="${v >= GOAL_MIN * 60 ? 'met' : ''}" style="height:${(v / max) * 110}px" title="${Math.round(v / 60)} min"></i><span>${'SMTWTFS'[d.getDay()]}</span>`;
    box.appendChild(col);
  }
  const line = document.createElement('div'); line.className = 'goal-line';
  line.style.bottom = (18 + (GOAL_MIN * 60 / max) * 110) + 'px'; box.appendChild(line);
}

/* ── 15-minute session (Level 1) ── */
const L = LEVELS[0];
let sessT = null, elapsed = 0, lastStage = -1;
function renderLevel() {
  $('lvl-name').textContent = L.name; $('lvl-title').textContent = L.title; $('lvl-goal').textContent = L.goal;
  $('stages').innerHTML = L.stages.map((s, i) =>
    `<li class="stage-row" data-i="${i}" tabindex="0"><span class="t">${s.from}–${s.to} min</span><div><h3>${s.title}</h3><p>${s.text}</p></div></li>`).join('');
  document.querySelectorAll('.stage-row').forEach(r => r.addEventListener('click', () => {
    setMode(L.stages[+r.dataset.i].mode); if (seq.label !== L.name) loadLevel(L);
  }));
}
function paintSession() {
  const left = Math.max(0, GOAL_MIN * 60 - elapsed);
  $('clock').textContent = `${String(Math.floor(left / 60)).padStart(2, '0')}:${String(left % 60).padStart(2, '0')}`;
  const min = elapsed / 60;
  document.querySelectorAll('.stage-row').forEach((r, i) => {
    const s = L.stages[i];
    r.classList.toggle('now', sessT !== null && min >= s.from && min < s.to);
    r.classList.toggle('done', min >= s.to);
  });
  const si = L.stages.findIndex(s => min >= s.from && min < s.to);
  if (sessT !== null && si !== lastStage && si >= 0) {
    lastStage = si; setMode(L.stages[si].mode);
    if (audio) click(audio.currentTime + .01, true);
  }
}
$('sess').addEventListener('click', () => {
  if (sessT !== null) { clearInterval(sessT); sessT = null; $('sess').textContent = 'Resume'; wake(playing); paintSession(); return; }
  ensureAudio(); if (seq.label !== L.name) loadLevel(L);
  sessT = setInterval(() => {
    elapsed++;
    if (elapsed >= GOAL_MIN * 60) { clearInterval(sessT); sessT = null; $('sess').textContent = 'Done'; stopLoop(); save(); }
    paintSession();
  }, 1000);
  $('sess').textContent = 'Pause'; wake(true); paintSession();
});
$('sess-reset').addEventListener('click', () => {
  clearInterval(sessT); sessT = null; elapsed = 0; lastStage = -1; $('sess').textContent = 'Start 15 min'; paintSession();
});
$('load-l1').addEventListener('click', () => loadLevel(L));

/* ── songs ── */
function songSections(song) { return state.overrides[song.id] || song.sections; }
function playKeyOf(song) { return state.playKey[song.id] || 'C'; }

function renderSongList() {
  $('song-list').innerHTML = SONGS.map(s =>
    `<li><button data-id="${s.id}" class="${s.id === state.songId ? 'on' : ''}"><span class="nm">${s.title}</span><span class="k">${s.key}${s.meter === 3 ? ' · 3/4' : ''}</span></button></li>`).join('');
  document.querySelectorAll('#song-list button').forEach(b => b.addEventListener('click', () => {
    state.songId = b.dataset.id; save(); renderSongList(); renderSong();
  }));
}

function renderSong() {
  const s = SONGS.find(x => x.id === state.songId) || SONGS[0];
  const pk = playKeyOf(s);
  const tr = pianoTranspose(pk, s.key);
  const secs = songSections(s);
  const keyOpts = KEYS.map(k => `<option value="${k}"${k === pk ? ' selected' : ''}>${k}${k === s.key ? ' (original)' : ''}</option>`).join('');
  const trText = tr === 0 ? 'Piano transpose off: you are playing in the original key.'
    : `To sound in ${s.key} with these shapes, set the piano's transpose to ${tr > 0 ? '+' : '−'}${Math.abs(tr)}.`;

  const rows = secs.map((sec, i) => {
    const lines = sec.chords.split('|').map(l => splitChords(l));
    const chips = lines.map(line => line.map(sym => {
      const play = transposeChord(sym, s.key, pk);
      return `<li class="chip"><span class="n">${nashville(play, pk)}${pk !== s.key ? ' · ' + sym : ''}</span><span class="c">${show5(play)}</span></li>`;
    }).join('')).join('<li class="bar-break" aria-hidden="true"></li>');
    const on = seq.sectionKey === `${s.id}:${i}:${pk}`;
    return `<li class="sec${on ? ' on' : ''}"><div><h3>${sec.name}</h3>${sec.times > 1 ? `<span class="times">×${sec.times}</span>` : ''}</div>
      <ol class="row">${chips}</ol>
      <button class="btn${on ? ' primary' : ''}" data-sec="${i}">${on ? 'Loaded' : 'Practise'}</button></li>`;
  }).join('');

  $('song').innerHTML = `
    <p class="ck-label">${s.artist}</p>
    <h2 class="ck-title">${s.title}</h2>
    <p class="meta by">Original key ${s.key} · ${s.meter}/4 · ${s.bpm ? s.bpm + ' BPM' : 'tempo not listed'} · Writers: ${s.writers}</p>
    <div class="keyline">
      <label class="field">Your hands play in <select id="play-key">${keyOpts}</select></label>
      <span class="tr">${trText}</span>
      ${s.bpm ? `<button class="btn" id="song-tempo">Use song tempo (${s.bpm})</button>` : ''}
    </div>
    ${secs.length ? `<ol class="sections">${rows}</ol>`
      : `<div class="empty"><p><b>No chords yet.</b> ${s.note}</p></div>`}
    <div class="foot">
      <div class="actions"><button class="btn" id="edit-chords">Edit chords</button></div>
      ${secs.length ? `<p class="meta">${s.note || ''}</p>` : ''}
      <p class="meta">Chords: <a href="${s.source}" target="_blank" rel="noopener">source chart</a>${state.overrides[s.id] ? ' · edited on this device' : ''}. Big letters are what your hands play; the small line shows the number and the chord as charted.</p>
    </div>`;

  $('play-key').addEventListener('change', e => { state.playKey[s.id] = e.target.value; save(); renderSong(); });
  $('edit-chords').addEventListener('click', () => openSheet(s));
  $('song-tempo')?.addEventListener('click', () => setBpm(s.bpm));
  document.querySelectorAll('[data-sec]').forEach(b => b.addEventListener('click', () => {
    const i = +b.dataset.sec, sec = secs[i];
    loadLoop({
      label: `${s.title} · ${sec.name}`, title: `${sec.name} in ${pk}`,
      symbols: splitChords(sec.chords).map(c => transposeChord(c, s.key, pk)),
      key: pk, origKey: s.key, meter: s.meter, songBpm: s.bpm, sectionKey: `${s.id}:${i}:${pk}`
    });
    renderSong();
    window.scrollTo({ top: 0 });
  }));
}

/* ── chord editor ── */
let editing = null;
function openSheet(song) {
  editing = song;
  $('sheet-title').textContent = song.title; $('sheet-key').textContent = song.key;
  $('sheet-text').value = sectionsToText(songSections(song));
  $('sheet-errors').innerHTML = ''; $('sheet').hidden = false; $('sheet-text').focus();
}
$('sheet-cancel').addEventListener('click', () => { $('sheet').hidden = true; });
$('sheet-reset').addEventListener('click', () => {
  delete state.overrides[editing.id]; save(); $('sheet').hidden = true; renderSong();
});
$('sheet-form').addEventListener('submit', e => {
  e.preventDefault();
  const { sections, errors } = parseSectionText($('sheet-text').value);
  if (errors.length) { $('sheet-errors').innerHTML = errors.map(x => `<li>${x}</li>`).join(''); return; }
  state.overrides[editing.id] = sections; save(); $('sheet').hidden = true; renderSong();
});

/* ── controls ── */
function setMode(m) { state.mode = m; save(); document.querySelectorAll('#hands button').forEach(b => b.classList.toggle('on', b.dataset.m === m)); paintKeys(); }
document.querySelectorAll('#hands button').forEach(b => b.addEventListener('click', () => setMode(b.dataset.m)));
function setBpm(v) { state.bpm = Math.min(140, Math.max(40, v)); $('bpm').textContent = state.bpm; save(); }
$('bpm-down').addEventListener('click', () => setBpm(state.bpm - 4));
$('bpm-up').addEventListener('click', () => setBpm(state.bpm + 4));
$('per-chord').addEventListener('change', e => { state.bars = +e.target.value; save(); if (playing) restartLoop(); });
$('b3').checked = state.bass3;
$('b3').addEventListener('change', e => { state.bass3 = e.target.checked; save(); });
$('play').addEventListener('click', () => playing ? stopLoop() : startLoop());

/* ── views ── */
function show(view) {
  state.view = view; save();
  for (const v of ['practice', 'songs', 'log']) $('view-' + v).hidden = v !== view;
  window.NavKit ? NavKit.setActive(view) : document.querySelectorAll('.gn-item').forEach(b =>
    b.toggleAttribute('aria-current', b.dataset.gn === view));
  if (view === 'songs') { renderSongList(); renderSong(); }
  if (view === 'log') renderLog();
}
document.querySelectorAll('.gn-item').forEach(b => b.addEventListener('click', () => show(b.dataset.gn)));
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') save(); });

/* ── boot ── */
buildKeyboard();
renderLevel();
loadLevel(L);
paintSession();
renderToday();
show(state.view);
$('version').textContent = VERSION;
if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('./sw.js').catch(() => {});
