/* Nada songbook. Chords only, never lyrics. Each song is stored in its
   original key exactly as the source chart prints it; the app transposes.
   Source for chords: Essential Worship chord charts (key, BPM, chords per
   section). PraiseCharts for writers and time signature. Sections that
   repeat are listed once with a repeat count. Bar lengths aren't in the
   sources, so the player gives each chord one bar unless you change it. */

export const SONGS = [
  {
    id: 'highlands',
    title: 'Highlands (Song of Ascent)',
    artist: 'Hillsong UNITED',
    writers: 'Joel Houston, Benjamin Hastings',
    key: 'G', bpm: 92, meter: 4,
    source: 'https://essentialworship.com/songs/hillsong-worship/highlands-song-of-ascent/',
    sections: [
      { name: 'Intro', chords: 'Em7 Dsus C2 G5', times: 2 },
      { name: 'Verse', chords: 'Em7 Dsus C2 G', times: 2 },
      { name: 'Pre-Chorus', chords: 'C Dsus Em7 | G2 Dsus | C Dsus Em7 | C2', times: 1 },
      { name: 'Chorus', chords: 'G D | Em | D C | G | D | Em | D C | Em D C G', times: 1 },
      { name: 'Bridge', chords: 'Em7 D C2 G', times: 4 },
      { name: 'End', chords: 'G', times: 1 }
    ],
    note: 'Verses 1–4 all use the verse loop. Order: Intro, V1, V2, Pre, Chorus, V3, V4, Pre, Chorus, Bridge, Tag (bridge loop), End.'
  },
  {
    id: 'wondrous-cross',
    title: 'Wondrous Cross (When I Survey)',
    artist: 'Aodhan King, Benjamin William Hastings, Cody Carnes',
    writers: 'Isaac Watts, Jason Ingram, Cody Carnes, Aodhan King, Benjamin Hastings',
    key: 'C', bpm: null, meter: 4,
    source: 'https://www.praisecharts.com/songs/details/90327/wondrous-cross-when-i-survey-chords',
    sections: [],
    note: 'Original key C, so it is already in your C shapes. No free chord chart was found for this version: tap Edit chords and type them in from your chart.'
  },
  {
    id: 'if-it-wasnt-for-jesus',
    title: "If It Wasn't For Jesus",
    artist: 'Benjamin William Hastings',
    writers: 'David Leonard, Benjamin Hastings, Hank Bentley',
    key: 'Db', bpm: 69, meter: 4,
    source: 'https://essentialworship.com/?p=40244',
    sections: [
      { name: 'Intro', chords: 'Db Ab6 Bbm Gbmaj7', times: 1 },
      { name: 'Verse', chords: 'Db Ab6 Bbm Gbmaj7', times: 2 },
      { name: 'Chorus', chords: 'Db Ab6 Bbm Gbmaj7', times: 3 },
      { name: 'Bridge', chords: 'Db Absus Bbm Gb', times: 2 },
      { name: 'Outro', chords: 'Db Absus Bbm Gb | Db Absus Bbm Gb | Gb Db', times: 1 }
    ],
    note: 'This whole song is the 1‑5‑6‑4 loop. The source chart prints the chorus chord as "Gmaj7" in two places and "Gbmaj7" elsewhere; it is treated here as Gbmaj7 (the 4 chord).'
  },
  {
    id: 'remembrance',
    title: 'Remembrance',
    artist: 'Hillsong Worship',
    writers: 'Chris Davenport, Benjamin Hastings',
    key: 'B', bpm: 70, meter: 3,
    source: 'https://essentialworship.com/songs/hillsong-worship/remembrance/',
    sections: [
      { name: 'Verse', chords: 'B5 B5/C# Esus2 G#m7 F# Esus2 | B5 B5/C# Esus2 G#m7 F# B5', times: 1 },
      { name: 'Chorus', chords: 'E B F#', times: 2 },
      { name: 'Post-Chorus', chords: 'E F# G#m B/D# E C#m9 F# B', times: 1 },
      { name: 'Instrumental', chords: 'F# G#m E B F# G#m E', times: 1 },
      { name: 'Bridge', chords: 'B F# G#m E | B F# G#m F# E', times: 1 },
      { name: 'Tag', chords: 'E F# G#m B/D# E C#m7 F# C#m7 F# C#m7 F# B', times: 1 }
    ],
    note: 'In 3/4. The intro uses the verse chords. Slash chords (B/D#) put the note after the slash in your left hand.'
  },
  {
    id: 'know-you-will',
    title: 'Know You Will',
    artist: 'Hillsong UNITED',
    writers: 'Joel Houston, Benjamin Hastings, Dylan Thomas',
    key: 'E', bpm: 64, meter: 4,
    source: 'https://essentialworship.com/?p=49087',
    sections: [
      { name: 'Intro', chords: 'C#m A E', times: 2 },
      { name: 'Verse', chords: 'C#m A E', times: 4 },
      { name: 'Chorus', chords: 'C#m A E | C#m A E | C#m B A E | C#m A E', times: 1 },
      { name: 'Bridge', chords: 'A B C#m B E G#m', times: 2 }
    ],
    note: 'Ends with no chord (N.C.).'
  }
];

/** Level 1: the day-one loop. Later levels go in this list. */
export const LEVELS = [
  {
    id: 'l1',
    name: 'Level 1',
    title: 'The 1‑5‑6‑4 loop in C',
    key: 'C', bpm: 60, meter: 4,
    chords: 'C G Am F',
    goal: 'Four loops, both hands, at 60 BPM, without stopping.',
    stages: [
      { from: 0, to: 2, title: 'Set up', mode: 'both', text: 'Bench so your forearms are level with the keys. Pedal plugged in, foot off it. Find middle C.' },
      { from: 2, to: 6, title: 'Right hand only', mode: 'rh', text: 'Loop the four chords. Your thumb barely moves (C B C C), and so does your pinky (G G A A).' },
      { from: 6, to: 9, title: 'Left hand only', mode: 'lh', text: 'Octaves below middle C: pinky on the low note, thumb on the high one. Four beats each.' },
      { from: 9, to: 14, title: 'Both hands', mode: 'both', text: 'Land together on beat 1 and hold for four beats. After four clean loops, turn on "Bass on 3".' },
      { from: 14, to: 15, title: 'Add the pedal', mode: 'both', text: 'Same loop. Lift the pedal exactly as each new chord lands, then press down again.' }
    ]
  }
];
