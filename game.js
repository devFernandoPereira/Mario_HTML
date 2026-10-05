'use strict';
/* =========================================================
   SUPER MARIO WORLD — versão HTML (fan game feito em canvas)
   Tudo desenhado por código: sem imagens externas.
   ========================================================= */
const cv = document.getElementById('game');
const ctx = cv.getContext('2d');
const W = 256, H = 224, TS = 16, ROWS = 14;
const FONT = "'Press Start 2P', monospace";

function resize() {
  // Cabe a tela dentro da moldura do console; zoom inteiro deixa os pixels nítidos.
  const box = document.getElementById('console'), bezel = cv.closest('.bezel');
  let aw = innerWidth, ah = innerHeight;
  if (box && bezel) {
    const cs = getComputedStyle(box);
    const extraW = bezel.offsetWidth - cv.offsetWidth, extraH = bezel.offsetHeight - cv.offsetHeight;
    aw = box.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) - extraW;
    ah = box.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom) - extraH;
  }
  let s = Math.max(0.5, Math.min(aw / W, ah / H));
  if (s >= 2) s = Math.floor(s);
  cv.style.width = Math.floor(W * s) + 'px';
  cv.style.height = Math.floor(H * s) + 'px';
}
addEventListener('resize', resize); resize();
if (document.fonts) document.fonts.ready.then(resize);

/* ===================== ÁUDIO ===================== */
let AC = null, master = null, muted = false;
function audioInit() {
  if (AC) { if (AC.state === 'suspended') AC.resume(); return; }
  try {
    AC = new (window.AudioContext || window.webkitAudioContext)();
    master = AC.createGain(); master.gain.value = 0.22; master.connect(AC.destination);
  } catch (e) { AC = null; }
}
function nf(n) {
  const m = /^([A-G])(#?)(\d)$/.exec(n); if (!m) return 0;
  const idx = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]] + (m[2] ? 1 : 0);
  return 440 * Math.pow(2, ((+m[3] + 1) * 12 + idx - 69) / 12);
}
function toneAt(t, f, dur, type = 'square', vol = 0.3, slide = 0) {
  if (!AC || muted || !f) return;
  const o = AC.createOscillator(), g = AC.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0005, t + dur);
  o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.03);
}
function tone(f, dur, type, vol, delay = 0, slide = 0) { if (AC) toneAt(AC.currentTime + delay, f, dur, type, vol, slide); }
function noise(dur = 0.2, vol = 0.3) {
  if (!AC || muted) return;
  const n = Math.floor(AC.sampleRate * dur), b = AC.createBuffer(1, n, AC.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const s = AC.createBufferSource(); s.buffer = b;
  const g = AC.createGain(); g.gain.value = vol; s.connect(g); g.connect(master); s.start();
}
function seq(notes, step, type = 'square', vol = 0.16) {
  notes.split(' ').forEach((n, i) => { if (n !== '-') tone(nf(n), step * 0.95, type, vol, i * step); });
}
const SFX = {
  jump: () => tone(330, 0.16, 'square', 0.16, 0, 780),
  spin: () => { tone(500, 0.08, 'square', 0.14, 0, 900); tone(500, 0.08, 'square', 0.14, 0.08, 900); },
  coin: () => { tone(988, 0.06, 'square', 0.14); tone(1319, 0.3, 'square', 0.14, 0.06); },
  stomp: () => tone(600, 0.12, 'square', 0.2, 0, 120),
  bump: () => tone(140, 0.1, 'triangle', 0.5, 0, 90),
  brk: () => { noise(0.25, 0.4); tone(200, 0.1, 'square', 0.14, 0, 60); },
  sprout: () => tone(220, 0.45, 'square', 0.13, 0, 880),
  power: () => seq('G4 C5 E5 G5 C6 E6', 0.05),
  hurt: () => seq('A5 E5 A4 E4', 0.06),
  fire: () => tone(1200, 0.07, 'square', 0.12, 0, 300),
  kick: () => tone(900, 0.08, 'square', 0.2, 0, 300),
  oneup: () => seq('E5 G5 E6 C6 D6 G6', 0.08),
  die: () => seq('C5 - - G4 - - E4 - A4 B4 A4 G#4 A#4 G#4 G4', 0.1),
  clear: () => seq('G4 C5 E5 G5 C6 E6 G6 - E6 - C6 D6 E6 - - G6', 0.11),
  bossClear: () => seq('C5 E5 G5 C6 - G5 C6 E6 - - G6 - - - C7', 0.11),
  pause: () => seq('E6 C6 E6 C6', 0.05),
  hurry: () => seq('C6 C#6 D6 - C6 C#6 D6', 0.07),
  boom: () => { noise(0.3, 0.35); tone(120, 0.2, 'triangle', 0.4, 0, 50); },
  thwomp: () => { noise(0.35, 0.5); tone(80, 0.3, 'triangle', 0.5, 0, 40); },
  bossHit: () => seq('C4 G3 C3', 0.06, 'square', 0.25),
  midway: () => seq('C6 G6', 0.08),
  tick: () => tone(1800, 0.03, 'square', 0.06),
  map: () => tone(660, 0.05, 'square', 0.1),
  gameover: () => seq('C5 - G4 - E4 - A4 B4 A4 G#4 A#4 G#4 G4', 0.13),
};

const SONG_SRC = {
  over: { tempo: 150,
    mel: 'E5 - G5 E5 C5 D5 E5 - F5 - A5 F5 D5 E5 F5 - G5 - C6 G5 E5 F5 G5 A5 G5 F5 E5 D5 C5 - - -',
    bass: 'C3 - G3 - C3 - G3 - F2 - C3 - F2 - C3 - E2 - B2 - A2 - E3 - G2 - D3 - G2 - B2 -' },
  under: { tempo: 120,
    mel: 'A4 - C5 - E5 - D5 C5 B4 - - - G4 - B4 - A4 - - - E5 - - D5 C5 - B4 - A4 - - -',
    bass: 'A2 - A2 - E2 - E2 - G2 - G2 - D2 - D2 - F2 - F2 - C3 - C3 - E2 - E2 - E2 - B1 -' },
  sky: { tempo: 150,
    mel: 'C6 - G5 - E5 - G5 - A5 - F5 - C6 - - - D6 - B5 - G5 - B5 - C6 G5 E5 G5 C5 - - -',
    bass: 'C3 G3 C4 G3 F3 C4 F4 C4 F3 C4 F4 C4 C3 G3 C4 G3 G2 D3 G3 D3 G2 D3 G3 D3 C3 G3 C4 G3 C3 - - -' },
  castle: { tempo: 110,
    mel: 'E4 F4 E4 - D#4 E4 - - E4 F4 E4 - D#4 E4 - - G4 - F#4 - F4 - E4 - D#4 - - - B3 - - -',
    bass: 'E2 - E2 - E2 - E2 - E2 - E2 - E2 - E2 - C2 - C2 - C2 - C2 - B1 - B1 - B1 - B1 -' },
  boss: { tempo: 170,
    mel: 'E5 E5 - E5 D#5 - D5 - C#5 - C5 - B4 - - - E5 E5 - E5 F5 - F#5 - G5 - G#5 - A5 - - -',
    bass: 'E2 E3 E2 E3 E2 E3 E2 E3 A1 A2 A1 A2 A1 A2 A1 A2 E2 E3 E2 E3 E2 E3 E2 E3 B1 B2 B1 B2 B1 B2 B1 B2' },
  map: { tempo: 120,
    mel: 'G4 - C5 - E5 - D5 C5 - - A4 - C5 - F5 - E5 D5 - - G4 - B4 - D5 - C5 B4 C5 - - -',
    bass: 'C3 - E3 - G3 - E3 - F3 - A3 - C4 - A3 - G2 - B2 - D3 - B2 - C3 - G2 - C3 - - -' },
  star: { tempo: 190,
    mel: 'C5 C5 C5 - C5 - D5 C5 - C5 - D5 C5 D5 C5 - B4 B4 B4 - B4 - C5 B4 - B4 - C5 B4 C5 B4 -',
    bass: 'C3 - C3 - C3 - C3 - C3 - C3 - C3 - C3 - B2 - B2 - B2 - B2 - B2 - B2 - B2 - B2 -' },
  title: { tempo: 140,
    mel: 'C5 - E5 - G5 - E5 - A5 - G5 - E5 - - - D5 - F5 - A5 - F5 - G5 - - - C6 - - -',
    bass: 'C3 - C3 - E3 - E3 - F3 - F3 - C3 - C3 - D3 - D3 - F3 - F3 - G2 - G2 - C3 - C3 -' },
};
const SONGS = {};
for (const k in SONG_SRC) {
  const s = SONG_SRC[k];
  SONGS[k] = { tempo: s.tempo,
    mel: s.mel.split(/\s+/).map(n => n === '-' ? 0 : nf(n)),
    bass: s.bass.split(/\s+/).map(n => n === '-' ? 0 : nf(n)) };
}
let music = null;
function playMusic(name) { G.musicName = name; music = null; }
function stopMusic() { G.musicName = null; music = null; }
function musicTick() {
  if (!AC) return;
  if (!music) {
    if (G.musicName && SONGS[G.musicName]) music = { s: SONGS[G.musicName], step: 0, next: AC.currentTime + 0.05 };
    else return;
  }
  const s = music.s, dt = 60 / s.tempo / 2;
  if (music.next < AC.currentTime - 0.3) music.next = AC.currentTime + 0.02;
  while (music.next < AC.currentTime + 0.12) {
    const i = music.step;
    const m = s.mel[i % s.mel.length], b = s.bass[i % s.bass.length];
    if (m) toneAt(music.next, m, dt * 0.85, 'square', 0.06);
    if (b) toneAt(music.next, b, dt * 0.9, 'triangle', 0.15);
    music.step++; music.next += dt;
  }
}

/* ===================== ENTRADA ===================== */
const K = { left: 0, right: 0, up: 0, down: 0, jump: 0, run: 0, spin: 0, start: 0 };
let KPq = {}, KP = {};
const KEYMAP = {
  ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
  ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
  KeyZ: 'jump', Space: 'jump', KeyK: 'jump',
  KeyX: 'run', ShiftLeft: 'run', ShiftRight: 'run', KeyJ: 'run',
  KeyC: 'spin', KeyL: 'spin', Enter: 'start', KeyP: 'start',
};
function press(k) { if (!K[k]) KPq[k] = 1; K[k] = 1; }
addEventListener('keydown', e => {
  audioInit();
  if (e.code === 'KeyM' && !e.repeat) { muted = !muted; return; }
  const k = KEYMAP[e.code];
  if (k) { e.preventDefault(); press(k); }
});
addEventListener('keyup', e => { const k = KEYMAP[e.code]; if (k) K[k] = 0; });
addEventListener('blur', () => { for (const k in K) K[k] = 0; });
// Controles de toque (celular / tablet)
if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
  const tc = document.getElementById('touch'); tc.style.display = 'block';
  tc.querySelectorAll('.b').forEach(b => {
    const k = b.dataset.k;
    const on = e => { e.preventDefault(); audioInit(); press(k); b.classList.add('on'); };
    const off = e => { e.preventDefault(); K[k] = 0; b.classList.remove('on'); };
    b.addEventListener('pointerdown', on);
    b.addEventListener('pointerup', off);
    b.addEventListener('pointercancel', off);
    b.addEventListener('pointerleave', off);
  });
}
cv.addEventListener('pointerdown', () => { audioInit(); if (G.state !== 'level') press('start'); setTimeout(() => K.start = 0, 50); });

/* ===================== SPRITES ===================== */
function mk(rows, pal) {
  const w = Math.max(...rows.map(r => r.length)), h = rows.length;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d');
  rows.forEach((r, j) => {
    for (let i = 0; i < r.length; i++) { const col = pal[r[i]]; if (col) { x.fillStyle = col; x.fillRect(i, j, 1, 1); } }
  });
  return c;
}
const SMALL = {
  stand: [
    '...RRRRR....', '..RRRRRRRRR.', '..BBBSSKS...', '.BSBSSSKSSS.', '.BSBBSSSKSSS', '.BBSSSSKKKK.',
    '...SSSSSSS..', '..RRORRR....', '.RRRORRORRR.', 'RRRROOOORRRR', 'SSROYOOYORSS', 'SSSOOOOOOSSS',
    'SSOOOOOOOOSS', '..OOO..OOO..', '.BBB....BBB.', 'BBBB....BBBB'],
  walk: [
    '...RRRRR....', '..RRRRRRRRR.', '..BBBSSKS...', '.BSBSSSKSSS.', '.BSBBSSSKSSS', '.BBSSSSKKKK.',
    '...SSSSSSS..', '..RRRROR....', '.SRRRROORS..', 'SSRRRROOOSS.', 'SS.OOOOOOO..', '...OOOOOOOO.',
    '..OOOO.OOOO.', '.BBOO...OO..', '.BBB....BBB.', '..BB....BBBB'],
  jump: [
    '...RRRRR..SS', '..RRRRRRRRSS', '..BBBSSKS.RR', '.BSBSSSKSSRR', '.BSBBSSSKSSS', '.BBSSSSKKKK.',
    '...SSSSSSS..', 'SSRRORRRORR.', 'SSRRROOOORR.', '.RRROYOOYORB', '..OOOOOOOOBB', '.OOOOOOOOOBB',
    'BBOOOO..OO..', 'BBBOO.......', 'BB..........', '............'],
  dead: [
    '...RRRRRR...', '..RRRRRRRR..', 'SSBSKSSKSBSS', 'SSBSKSSKSBSS', 'SS.SSSSSS.SS', 'RR.SKKKKS.RR',
    'RRR.SSSS.RRR', '.RRRROORRRR.', '..RROYYORR..', '..OOOOOOOO..', '.OOOOOOOOOO.', '.OOOO..OOOO.',
    '..BB....BB..', '.BBB....BBB.', '.BBB....BBB.', '............'],
};
const BIG_TOP = [
  '......RRRRR.....', '....RRRRRRRRR...', '...RRRRRRRRRRRR.', '...BBBBSSSKS....', '..BSSBBSSSKSSS..',
  '..BSSBBSSSSKSSS.', '..BSSBBBSSSKKSSS', '..BBSSSSSSKKKKK.', '...BBSSSSSSKKKK.', '....SSSSSSSSS...',
  '......SSSSSS....', '....RRRROORR....', '...RRRRROORRR...', '..RRRRRRROORRRR.', '.RRRRRRRROOORRRR',
  '.RRRRRRROOYOORRR', '.SSRRRRRROOOOORR', '.SSSRRROOOOOOOSS', '.SSSSOOOOOOOOSSS', '..SS.OOOOOOOO.SS'];
const BIG_LEGS = {
  stand: ['....OOOOOOOOOO..', '...OOOOOOOOOOOO.', '...OOOOOO.OOOOO.', '...OOOOO...OOOO.', '...OOOO....OOOO.',
    '...OOOO....OOOO.', '...OOOO....OOOO.', '....OOO.....OOO.', '...BBBB....BBBB.', '..BBBBB....BBBBB', '.BBBBBB....BBBBB'],
  walk: ['...OOOOOOOOOO...', '..OOOOOOOOOOOO..', '.OOOOOO..OOOOOO.', 'OOOOOO....OOOOO.', 'OOOOO......OOOO.',
    'BOOO.......OOOO.', 'BBB.........OOO.', 'BBBB.......BBBB.', 'BBB.......BBBBBB', '.B........BBBBB.', '................'],
  jump: ['...OOOOOOOOOO.BB', '..OOOOOOOOOOOBBB', '.OOOOOOOOOOOOBBB', 'BBOOOOOO..OOOOB.', 'BBBOOOO.....OO..',
    'BBBB............', 'BBB.............', '................', '................', '................', '................'],
};
const MARIO_PALS = {
  normal: { R: '#d82800', S: '#fca044', B: '#884000', O: '#2038ec', Y: '#f8d800', K: '#000' },
  fire: { R: '#f8f8f8', S: '#fca044', B: '#884000', O: '#d82800', Y: '#f8d800', K: '#000' },
  star1: { R: '#00a800', S: '#fca044', B: '#000', O: '#f8d800', Y: '#d82800', K: '#000' },
  star2: { R: '#000', S: '#fca044', B: '#d82800', O: '#d82800', Y: '#fff', K: '#000' },
  star3: { R: '#f8d800', S: '#fff0c0', B: '#00a800', O: '#00a8f8', Y: '#fff', K: '#000' },
};
const MSPR = {};
for (const k in MARIO_PALS) {
  const pal = MARIO_PALS[k];
  MSPR[k] = { small: {}, big: {} };
  for (const f in SMALL) MSPR[k].small[f] = mk(SMALL[f], pal);
  for (const f in BIG_LEGS) MSPR[k].big[f] = mk(BIG_TOP.concat(BIG_LEGS[f]), pal);
}
const GOOMBA = mk([
  '......BBBB......', '.....BBBBBB.....', '....BBBBBBBB....', '...BBBBBBBBBB...', '..BKKBBBBBBKKB..',
  '.BBBWKBBBBKWBBB.', '.BBBWKKKKKKWBBB.', 'BBBBWKWBBWKWBBBB', 'BBBBWWWBBWWWBBBB', 'BBBBBBBBBBBBBBBB',
  '.BBBBTTTTTTBBBB.', '....TTTTTTTT....', '....TTTTTTTT....', '..KK.TTTTTT.....', '.KKKK.TTTT.KKK..', '.KKKKK....KKKKK.'],
  { B: '#b05818', T: '#f8c890', K: '#000', W: '#fff' });
const KOOPA_ROWS = [
  '..YYYY..........', '.YYYYYY.........', '.YKKWYY.........', '.YKKWYYY........', '.YYYYYYY........',
  'YYYYYYYY........', 'YYYYYYY.........', '.YYYYYY.........', '..YYYY..GGGGG...', '..YYYY.GGWGGWG..',
  '..YYYYGGWGGGGWG.', '...YYYGWGGGGGGWG', '...YYGGWWWWWWWWG', '...YYGWGGGGGGGWG', '..YYYGWGGGGGGGWG',
  '.YYY.WWWWWWWWWWW', '.YY...YYYYYYYYW.', '......YYYYYYYY..', '.....YYYY.YYYY..', '....OOOO..OOOO..', '...OOOOO.OOOOO..'];
const SHELL_ROWS = [
  '....GGGGGGGG....', '..GGWGGGGGGWGG..', '.GGWGGGGGGGGWGG.', '.GWGGGGGGGGGGWG.', 'GGWWWWWWWWWWWWGG',
  'GWGGGGGGGGGGGGWG', 'GWGGGGGGGGGGGGWG', 'GWWWWWWWWWWWWWWG', 'WWWWWWWWWWWWWWWW', '.YYYYYYYYYYYYYY.',
  '..YYYYYYYYYYYY..', '...WWWWWWWWWW...'];
const KPAL_G = { Y: '#f8d838', G: '#20a020', W: '#fff', K: '#000', O: '#e86818' };
const KPAL_R = { Y: '#f8d838', G: '#d82800', W: '#fff', K: '#000', O: '#e86818' };
const KOOPA_G = mk(KOOPA_ROWS, KPAL_G), KOOPA_R = mk(KOOPA_ROWS, KPAL_R);
const SHELL_G = mk(SHELL_ROWS, KPAL_G), SHELL_R = mk(SHELL_ROWS, KPAL_R);
const WING = mk(['W.......', 'WW......', 'WWW.....', '.WWWW...', '.WKWWW..', '..WWWWW.', '...WWWWW', '....WWW.'], { W: '#fff', K: '#888' });
const MUSH_ROWS = [
  '.....RRRRRR.....', '...RRWWRRRRRR...', '..RWWWWRRRRWWR..', '.RRWWWWRRRWWWWR.', '.RRRWWRRRRWWWWR.',
  'RRRRRRRRRRRWWRRR', 'RRWWRRRRRRRRRRRR', 'RWWWWRRRRRRRWWRR', 'RWWWWRRRRRRWWWWR', '.RWWRRRRRRRRWWR.',
  '..WWWKWWWWKWWW..', '..WWWKWWWWKWWW..', '..WWWWWWWWWWWW..', '...WWWWWWWWWW...'];
const MUSH = mk(MUSH_ROWS, { R: '#e02010', W: '#fff', K: '#000' });
const ONEUP = mk(MUSH_ROWS, { R: '#20a020', W: '#fff', K: '#000' });

/* ===================== DESENHO BÁSICO ===================== */
function rect(x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); }
function circ(x, y, r, c) { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
function txt(s, x, y, col = '#fff', align = 'left', size = 8) {
  ctx.font = size + 'px ' + FONT; ctx.textAlign = align; ctx.textBaseline = 'top';
  ctx.fillStyle = '#000'; ctx.fillText(s, x + 1, y + 1);
  ctx.fillStyle = col; ctx.fillText(s, x, y);
}
function drawSpr(sp, x, y, flipX = false, flipY = false) {
  x = Math.round(x); y = Math.round(y);
  if (!flipX && !flipY) { ctx.drawImage(sp, x, y); return; }
  ctx.save();
  ctx.translate(x + (flipX ? sp.width : 0), y + (flipY ? sp.height : 0));
  ctx.scale(flipX ? -1 : 1, flipY ? -1 : 1);
  ctx.drawImage(sp, 0, 0); ctx.restore();
}
function camX() { return Math.round(L.cam); }
function drawAt(sp, e, flipX, flipY) {
  drawSpr(sp, e.x + e.w / 2 - sp.width / 2 - camX(), e.y + e.h - sp.height, flipX, flipY);
}
function pad(n, l) { return String(Math.max(0, n)).padStart(l, '0'); }

/* ===================== ESTADO GLOBAL ===================== */
const G = { state: 'title', lives: 5, coins: 0, score: 0, power: 0, cleared: 0, mapPos: 0, mid: {},
  t: 0, trans: null, musicName: null, mapMove: null, mapInfo: false };
try { const s = JSON.parse(localStorage.getItem('smw_html_save') || '{}'); if (s.cleared) G.cleared = s.cleared; } catch (e) { }
function save() { try { localStorage.setItem('smw_html_save', JSON.stringify({ cleared: G.cleared })); } catch (e) { } }
function goTo(fn) { if (!G.trans) G.trans = { t: 0, fn }; }

/* ===================== CONSTRUTOR DE FASES ===================== */
class LB {
  constructor(name, type, w, music) {
    this.name = name; this.type = type; this.w = w; this.music = music || type;
    this.t = Array.from({ length: ROWS }, () => Array(w).fill('.'));
    this.ents = []; this.start = 3; this.mid = 0; this.goal = 0; this.boss = 0; this.time = 300;
  }
  set(x, y, c) { if (x >= 0 && x < this.w && y >= 0 && y < ROWS) this.t[y][x] = c; return this; }
  fill(x1, y1, x2, y2, c) { for (let y = y1; y <= y2; y++) for (let x = x1; x <= x2; x++) this.set(x, y, c); return this; }
  ground(x1, x2, h = 2) { this.fill(x1, ROWS - h, x2, ROWS - 1, 'D'); for (let x = x1; x <= x2; x++) this.set(x, ROWS - h, 'G'); return this; }
  row(x, y, s) { for (let i = 0; i < s.length; i++) if (s[i] !== ' ') this.set(x + i, y, s[i]); return this; }
  coins(x, y, n) { return this.row(x, y, 'o'.repeat(n)); }
  dragon(x, y) { return this.set(x, y, 'Y'); }
  pipe(x, h, gh = 2, plant = false) {
    const top = ROWS - gh - h;
    this.set(x, top, 'P').set(x + 1, top, 'p');
    for (let y = top + 1; y < ROWS - gh; y++) { this.set(x, y, 'I'); this.set(x + 1, y, 'i'); }
    if (plant) this.e('piranha', x, top);
    return this;
  }
  stairs(x, n, gh = 2, down = false) {
    for (let i = 0; i < n; i++) { const hh = down ? n - i : i + 1; for (let j = 0; j < hh; j++) this.set(x + i, ROWS - gh - 1 - j, 'S'); }
    return this;
  }
  cannon(x, y, h = 2) { this.set(x, y, 'K'); for (let j = 1; j < h; j++) this.set(x, y + j, 'k'); return this.e('cannon', x, y); }
  lava(x1, x2) { return this.fill(x1, ROWS - 2, x2, ROWS - 1, 'L'); }
  firebar(x, y, len, spd) { this.set(x, y, 'U'); return this.e('firebar', x, y, { len, spd }); }
  e(t, x, y, o = {}) { this.ents.push(Object.assign({ t, x, y }, o)); return this; }
}

/* ===================== FASES ===================== */
function lvl1() {
  const b = new LB('ILHA DO YOSHI 1', 'over', 190);
  b.ground(0, 44).ground(48, 80).ground(84, 119).ground(123, 189);
  b.row(10, 8, '?').row(14, 8, 'B?BMB').row(16, 4, '?');
  b.e('goomba', 20, 11).e('goomba', 22, 11);
  b.pipe(27, 2).coins(30, 9, 3).pipe(35, 3);
  b.e('koopa', 40, 11).dragon(42, 7);
  b.stairs(52, 4).coins(56, 6, 3);
  b.e('goomba', 60, 11).e('goomba', 62, 11);
  b.row(64, 8, '=====').coins(65, 6, 3).dragon(66, 3);
  b.row(71, 8, '?1?');
  b.mid = 76;
  b.row(88, 8, 'BBBBB').e('rkoopa', 90, 7);
  b.pipe(96, 2, 2, true);
  b.e('goomba', 100, 11).e('goomba', 102, 11).e('goomba', 104, 11);
  b.row(108, 8, 'B*B');
  b.e('parakoopa', 113, 10).dragon(116, 8);
  b.coins(120, 8, 3);
  b.pipe(130, 3, 2, true);
  b.e('koopa', 136, 11).e('goomba', 140, 11).e('goomba', 142, 11);
  b.row(145, 8, 'B?B').dragon(146, 4);
  b.stairs(152, 6).dragon(159, 4);
  b.goal = 172;
  return b;
}
function lvl2() {
  const b = new LB('ILHA DO YOSHI 2', 'over', 200);
  b.ground(0, 24).row(8, 8, '?M?').e('goomba', 14, 11).e('koopa', 18, 11);
  b.ground(25, 44, 4).e('rkoopa', 30, 9).e('rkoopa', 38, 9).coins(31, 6, 5).dragon(42, 5);
  b.ground(48, 84);
  b.pipe(51, 2, 2, true).e('goomba', 55, 11).pipe(58, 3, 2, true).e('goomba', 62, 11).e('goomba', 63, 11);
  b.dragon(64, 5).pipe(66, 2, 2, true);
  b.row(70, 7, '?B?B1').e('parakoopa', 74, 10);
  b.mid = 80;
  b.ground(88, 120);
  b.row(92, 8, '======').row(95, 5, '=====').coins(96, 3, 3).dragon(100, 4);
  b.e('koopa', 100, 11).e('koopa', 104, 11).e('goomba', 108, 11);
  b.row(111, 8, 'BB*BB').e('parakoopa', 116, 10);
  b.ground(124, 140, 3).e('goomba', 128, 10).e('goomba', 131, 10).pipe(134, 2, 3, true);
  b.ground(141, 199);
  b.dragon(145, 8).e('rkoopa', 150, 11).row(150, 8, '?');
  b.stairs(156, 5).stairs(161, 5, 2, true).dragon(160, 4);
  b.e('goomba', 170, 11).e('koopa', 174, 11);
  b.goal = 182;
  return b;
}
function lvl3() {
  const b = new LB('CAVERNA AMARELA', 'under', 190);
  b.fill(0, 0, 189, 1, 'D');
  b.ground(0, 30).row(8, 8, '?M?').e('goomba', 15, 11).e('goomba', 17, 11);
  b.row(20, 4, 'BBBBBBBB').coins(21, 3, 6).e('koopa', 26, 11);
  b.ground(34, 70).pipe(37, 3, 2, true);
  b.row(42, 7, 'BBBBBBB').coins(42, 10, 7).dragon(45, 5);
  b.e('goomba', 52, 11).e('goomba', 54, 11).e('koopa', 58, 11);
  b.pipe(62, 2, 2, true).dragon(65, 6).pipe(67, 3, 2, true);
  b.ground(74, 120);
  b.mid = 78;
  b.row(82, 8, '?B?B?').row(84, 4, '1');
  b.e('goomba', 86, 11).e('goomba', 88, 11);
  b.row(91, 8, 'SSSSS').e('rkoopa', 93, 7);
  b.fill(98, 9, 99, 11, 'B').dragon(99, 6);
  b.e('koopa', 104, 11).e('koopa', 107, 11).pipe(110, 2, 2, true).row(114, 8, 'B*B');
  b.ground(124, 189);
  b.dragon(128, 8).e('goomba', 130, 11).e('goomba', 132, 11).e('goomba', 134, 11);
  b.stairs(140, 4);
  b.row(146, 8, 'SSS').coins(146, 7, 3).e('parakoopa', 152, 10);
  b.row(155, 8, '?M?').dragon(156, 5);
  b.e('koopa', 162, 11).e('goomba', 166, 11);
  b.goal = 174;
  return b;
}
function lvl4() {
  const b = new LB('CEU DE NUVENS', 'sky', 200);
  b.ground(0, 12);
  b.row(14, 10, '-----').coins(15, 8, 3);
  b.row(21, 8, '----');
  b.row(27, 10, '-----').e('goomba', 29, 9);
  b.ground(34, 42, 3).cannon(38, 9, 2);
  b.row(45, 8, '----').dragon(46, 5);
  b.row(51, 6, '----').coins(51, 4, 4);
  b.row(57, 9, '-----').e('parakoopa', 59, 8);
  b.ground(64, 74).row(66, 8, '?M?').e('goomba', 71, 11);
  b.mid = 68;
  b.row(77, 9, '----').row(83, 7, '----').e('parakoopa', 84, 5).dragon(86, 4);
  b.row(89, 10, '------');
  b.ground(97, 108, 4).cannon(101, 8, 2).e('rkoopa', 105, 9);
  b.row(111, 8, '---').row(116, 6, '---').dragon(117, 3);
  b.row(121, 9, '----').e('parakoopa', 122, 8);
  b.ground(127, 135).row(129, 8, 'B*B').e('goomba', 133, 11);
  b.row(138, 10, '----').row(144, 8, '----').coins(144, 6, 4);
  b.row(150, 10, '----').cannon(153, 8, 2).dragon(150, 6);
  b.row(156, 8, '----').e('parakoopa', 158, 7);
  b.row(162, 10, '-----');
  b.ground(169, 199).e('koopa', 175, 11).e('goomba', 178, 11).stairs(181, 4);
  b.goal = 190;
  return b;
}
function lvl5() {
  const b = new LB('PLANICIE DONUT', 'over', 210);
  b.ground(0, 30).row(9, 8, 'B?B').e('goomba', 13, 11).e('goomba', 15, 11).cannon(20, 10, 2).e('koopa', 25, 11);
  b.ground(35, 60).e('parakoopa', 38, 10).e('parakoopa', 42, 9).row(44, 8, '?M?').dragon(46, 4);
  b.pipe(49, 3, 2, true).cannon(54, 9, 3).e('goomba', 57, 11);
  b.ground(64, 90, 3).e('rkoopa', 68, 10).row(70, 6, 'BBBBB').e('rkoopa', 72, 5).dragon(72, 3);
  b.cannon(78, 8, 3).pipe(84, 2, 3, true);
  b.mid = 88;
  b.ground(94, 130).row(98, 8, '=====').row(103, 5, '=====').dragon(107, 3);
  b.e('goomba', 100, 11).e('goomba', 102, 11).e('goomba', 104, 11);
  b.e('koopa', 112, 11).e('koopa', 114, 11).e('koopa', 116, 11).row(118, 8, '*');
  b.cannon(122, 10, 2).cannon(127, 9, 3);
  b.coins(131, 8, 4);
  b.ground(135, 209);
  b.e('parakoopa', 140, 10).e('parakoopa', 145, 8).dragon(148, 6).e('parakoopa', 150, 10);
  b.pipe(155, 2, 2, true).pipe(160, 3, 2, true).pipe(165, 4, 2, true);
  b.e('goomba', 170, 11).e('goomba', 172, 11).e('goomba', 174, 11).dragon(180, 8);
  b.stairs(184, 5);
  b.goal = 195;
  return b;
}
function lvl6() {
  const b = new LB('CASTELO DO IGGY', 'castle', 156);
  b.fill(0, 0, 155, 1, 'c');
  b.ground(0, 20).firebar(12, 8, 5, 0.04);
  b.lava(21, 24).e('podoboo', 22, 0, { d: 30 });
  b.ground(25, 40).firebar(30, 9, 5, -0.05).e('thwomp', 35, 2);
  b.lava(41, 52).row(44, 9, 'SS').row(49, 8, 'SS');
  b.e('podoboo', 42, 0, { d: 10 }).e('podoboo', 47, 0, { d: 70 }).e('podoboo', 51, 0, { d: 40 });
  b.ground(53, 75).e('thwomp', 58, 2).e('koopa', 62, 11).e('thwomp', 66, 2).firebar(71, 8, 6, 0.05);
  b.mid = 74;
  b.lava(76, 90).ground(80, 82, 4).ground(86, 88, 4);
  b.e('podoboo', 78, 0, { d: 20 }).e('podoboo', 84, 0, { d: 80 }).e('podoboo', 89, 0, { d: 50 });
  b.ground(91, 138).e('thwomp', 96, 2).e('thwomp', 102, 2);
  b.firebar(108, 8, 6, 0.045).e('rkoopa', 112, 11).firebar(116, 8, 6, -0.045);
  b.row(120, 8, '?M?').e('thwomp', 127, 2).e('goomba', 132, 11);
  b.ground(139, 155);
  b.boss = 140; b.e('boss', 150, 11);
  b.time = 400;
  return b;
}
const LEVELS = [lvl1, lvl2, lvl3, lvl4, lvl5, lvl6];

/* ===================== TILES ===================== */
const SOLID = new Set(['G', 'D', 'B', '?', 'M', '1', '*', 'U', 'S', 'P', 'p', 'I', 'i', 'K', 'k', 'c']);
const SEMI = new Set(['=', '-']);
let L = null, pl = null;
function tileC(tx, ty) { if (tx < 0 || tx >= L.w || ty < 0 || ty >= ROWS) return '.'; return L.map[ty][tx]; }
function solidAt(tx, ty) { if (tx < 0 || tx >= L.w) return true; if (ty < 0 || ty >= ROWS) return false; return SOLID.has(L.map[ty][tx]); }
function semiAt(tx, ty) { return SEMI.has(tileC(tx, ty)); }

function moveBody(o) {
  o.hitWall = 0; o.wallTile = null; o.hitCeil = null;
  o.x += o.vx;
  const y0 = Math.floor(o.y / TS), y1 = Math.floor((o.y + o.h - 1) / TS);
  if (o.vx > 0) {
    const tx = Math.floor((o.x + o.w - 1) / TS);
    for (let ty = y0; ty <= y1; ty++) if (solidAt(tx, ty)) { o.x = tx * TS - o.w; o.hitWall = 1; o.wallTile = [tx, ty]; o.vx = 0; break; }
  } else if (o.vx < 0) {
    const tx = Math.floor(o.x / TS);
    for (let ty = y0; ty <= y1; ty++) if (solidAt(tx, ty)) { o.x = (tx + 1) * TS; o.hitWall = -1; o.wallTile = [tx, ty]; o.vx = 0; break; }
  }
  const pb = o.y + o.h;
  o.y += o.vy; o.onGround = false;
  const x0 = Math.floor(o.x / TS), x1 = Math.floor((o.x + o.w - 1) / TS);
  if (o.vy >= 0) {
    const ty = Math.floor((o.y + o.h) / TS);
    for (let tx = x0; tx <= x1; tx++) {
      if (solidAt(tx, ty) || (semiAt(tx, ty) && pb <= ty * TS + 0.5)) { o.y = ty * TS - o.h; o.vy = 0; o.onGround = true; break; }
    }
  } else {
    const ty = Math.floor(o.y / TS), hits = [];
    for (let tx = x0; tx <= x1; tx++) if (solidAt(tx, ty)) hits.push(tx);
    if (hits.length) { o.y = (ty + 1) * TS; o.vy = 0; o.hitCeil = { ty, txs: hits }; }
  }
}
function overlap(a, b) {
  const bh = b.hh !== undefined ? b.hh : b.h;
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + bh && a.y + a.h > b.y;
}

/* ===================== PONTOS E PARTÍCULAS ===================== */
function addPart(p) { L.parts.push(Object.assign({ t: 0, life: 60, vx: 0, vy: 0, g: 0 }, p)); }
function addScore(n, x, y) {
  G.score += n;
  if (x !== undefined) addPart({ k: 'score', x, y, vy: -0.6, life: 50, s: String(n) });
}
function oneUp(x, y) { G.lives = Math.min(99, G.lives + 1); SFX.oneup(); if (x !== undefined) addPart({ k: 'score', x, y, vy: -0.6, life: 60, s: '1UP', c: '#58f858' }); }
function addCoin(x, y) {
  G.coins++; G.score += 10; SFX.coin();
  if (G.coins >= 100) { G.coins -= 100; oneUp(x, y); }
}
const COMBO = [100, 200, 400, 800, 1000, 2000, 4000, 8000];
function comboScore(e) {
  const i = pl.combo++;
  if (i >= COMBO.length) oneUp(e.x, e.y); else addScore(COMBO[i], e.x, e.y);
}

/* ===================== BLOCOS ===================== */
function hitBlock(tx, ty, big) {
  const c = tileC(tx, ty);
  if (c === 'B') {
    if (big) {
      L.map[ty][tx] = '.'; SFX.brk(); addScore(50);
      for (let i = 0; i < 4; i++) addPart({ k: 'brick', x: tx * TS + 4 + (i % 2) * 8, y: ty * TS + 4 + (i >> 1) * 8, vx: (i % 2 ? 1.2 : -1.2), vy: (i >> 1) ? -3 : -5, g: 0.3, life: 90 });
      bumpAbove(tx, ty);
    } else { bump(tx, ty); SFX.bump(); }
    return;
  }
  if ('?M1*'.includes(c)) {
    L.map[ty][tx] = 'U'; bump(tx, ty);
    if (c === '?') {
      addCoin(tx * TS, ty * TS);
      addPart({ k: 'coin', x: tx * TS, y: ty * TS - 16, vy: -5, g: 0.3, life: 30 });
    } else {
      spawnItem(c === '1' ? 'oneup' : c === '*' ? 'star' : (pl.power > 0 ? 'flower' : 'mushroom'), tx, ty);
      SFX.sprout();
    }
    return;
  }
  SFX.bump();
}
function bump(tx, ty) { L.bumps.push({ tx, ty, t: 0 }); bumpAbove(tx, ty); }
function bumpAbove(tx, ty) {
  const top = ty * TS, l = tx * TS, r = l + TS;
  for (const e of L.ents) {
    if (!e.alive || e.dead || e.nobody) continue;
    if (Math.abs(e.y + e.h - top) < 3 && e.x + e.w > l && e.x < r && FIREKILL.has(e.t) && e.t !== 'piranha') { killFlip(e); addScore(200, e.x, e.y); }
  }
  for (const it of L.items) if (Math.abs(it.y + it.h - top) < 3 && it.x + it.w > l && it.x < r) { it.vy = -4; it.vx = it.x + 7 < l + 8 ? -Math.abs(it.vx || 1) : Math.abs(it.vx || 1); }
  if (tileC(tx, ty - 1) === 'o') {
    L.map[ty - 1][tx] = '.'; addCoin(tx * TS, (ty - 1) * TS);
    addPart({ k: 'coin', x: tx * TS, y: (ty - 1) * TS, vy: -5, g: 0.3, life: 30 });
  }
}
function spawnItem(k, tx, ty) {
  L.items.push({ k, x: tx * TS + 1, y: ty * TS, w: 14, h: 16, vx: 0, vy: 0, emerge: 16, onGround: false });
}

/* ===================== INIMIGOS ===================== */
const STOMPABLE = new Set(['goomba', 'koopa', 'rkoopa', 'parakoopa', 'bullet']);
const FIREKILL = new Set(['goomba', 'koopa', 'rkoopa', 'parakoopa', 'shell', 'piranha']);
const SHELLKILL = new Set(['goomba', 'koopa', 'rkoopa', 'parakoopa', 'shell', 'piranha', 'bullet']);

function spawnEnt(s) {
  const e = { t: s.t, vx: 0, vy: 0, w: 14, h: 14, alive: true, dead: false, timer: 0, onGround: false, dir: -1 };
  const bx = s.x * TS;
  switch (s.t) {
    case 'goomba': e.vx = -0.5; break;
    case 'koopa': case 'rkoopa': e.h = 16; e.vx = -0.5; break;
    case 'parakoopa': e.h = 16; e.vx = -0.6; break;
    case 'piranha': e.w = 14; e.h = 22; e.baseY = s.y * TS; e.x = bx + 16 - 7; e.y = e.baseY; e.off = 0; e.hh = 0; e.ph = 0; break;
    case 'cannon': e.nobody = true; e.x = bx; e.y = s.y * TS; e.timer = 90; break;
    case 'thwomp': e.w = 24; e.h = 30; e.x = bx - 4; e.y = s.y * TS; e.homeY = e.y; e.state = 'wait'; break;
    case 'firebar': e.nobody = true; e.cx = bx + 8; e.cy = s.y * TS + 8; e.x = bx; e.y = s.y * TS; e.ang = 0; e.spd = s.spd || 0.04; e.len = s.len || 6; break;
    case 'podoboo': e.w = 12; e.h = 14; e.x = bx + 2; e.homeY = ROWS * TS + 6; e.y = e.homeY; e.timer = s.d || 0; e.state = 'wait'; break;
    case 'boss': e.w = 28; e.h = 32; e.hp = 3; e.hurt = 0; e.fireHits = 0; break;
  }
  if (e.x === undefined) { e.x = bx + (16 - e.w) / 2; e.y = (s.y + 1) * TS - e.h; }
  return e;
}
function killFlip(e) {
  e.dead = true; e.vy = -3.5; e.vx = (e.x < pl.x ? -0.8 : 0.8); SFX.kick();
}
function puffKill(e) {
  e.alive = false; SFX.stomp();
  addPart({ k: 'puff', x: e.x + e.w / 2, y: e.y + e.h / 2, life: 20 });
}
function toShell(e) {
  e.color = (e.t === 'rkoopa') ? 'r' : 'g';
  e.t = 'shell'; e.h = 14; e.y += 2; e.vx = 0; e.moving = false; e.stillT = 0; e.kickT = 0;
}
function kickShell(e) {
  e.moving = true; e.vx = (pl.x + pl.w / 2 < e.x + e.w / 2) ? 3.5 : -3.5; e.kickT = 12; e.stillT = 0;
  SFX.kick(); addScore(100, e.x, e.y);
}
function onScreen(x) { return x > L.cam - 32 && x < L.cam + W + 32; }

function walker(e, edge) {
  e.vy = Math.min(e.vy + 0.3, 4);
  const ov = e.vx; moveBody(e);
  if (e.hitWall) e.vx = -ov;
  if (edge && e.onGround) {
    const ahead = e.vx > 0 ? e.x + e.w + 1 : e.x - 1;
    const tx = Math.floor(ahead / TS), ty = Math.floor((e.y + e.h + 1) / TS);
    if (!solidAt(tx, ty) && !semiAt(tx, ty)) e.vx = -e.vx;
  }
  if (e.vx) e.dir = e.vx > 0 ? 1 : -1;
}

function updEnt(e) {
  e.timer++;
  if (e.dead) { e.vy += 0.25; e.y += e.vy; e.x += e.vx; if (e.y > H + 40) e.alive = false; return; }
  if (e.squish) { if (--e.squish <= 0) e.alive = false; return; }
  switch (e.t) {
    case 'goomba': walker(e, false); break;
    case 'koopa': walker(e, false); break;
    case 'rkoopa': walker(e, true); break;
    case 'parakoopa': {
      e.vy = Math.min(e.vy + 0.2, 4); const ov = e.vx; moveBody(e);
      if (e.hitWall) e.vx = -ov;
      if (e.onGround) e.vy = -4;
      e.dir = e.vx > 0 ? 1 : -1; break;
    }
    case 'shell': {
      e.vy = Math.min(e.vy + 0.3, 4);
      if (e.kickT > 0) e.kickT--;
      if (e.moving) {
        const ov = e.vx; moveBody(e);
        if (e.hitWall) {
          e.vx = -ov;
          if (onScreen(e.x)) { if (e.wallTile) hitBlock(e.wallTile[0], e.wallTile[1], true); else SFX.bump(); }
        }
        for (const o of L.ents) {
          if (o === e || !o.alive || o.dead || o.nobody || !SHELLKILL.has(o.t)) continue;
          if (o.t === 'piranha' && o.off < 4) continue;
          if (overlap(e, o)) {
            if (o.t === 'shell' && o.moving) { killFlip(e); }
            killFlip(o); addScore(200, o.x, o.y);
          }
        }
      } else {
        e.vx *= 0.85; moveBody(e);
        if (++e.stillT > 540) { e.t = e.color === 'r' ? 'rkoopa' : 'koopa'; e.y -= 2; e.h = 16; e.vx = pl.x < e.x ? -0.5 : 0.5; }
      }
      break;
    }
    case 'piranha': {
      const near = Math.abs(pl.x + pl.w / 2 - (e.x + e.w / 2)) < 30;
      if (!(e.off <= 0 && near)) e.ph = (e.ph + 1) % 220;
      const p = e.ph; let off;
      if (p < 70) off = 0; else if (p < 94) off = (p - 70) / 24 * e.h; else if (p < 154) off = e.h;
      else if (p < 178) off = (1 - (p - 154) / 24) * e.h; else off = 0;
      e.off = off; e.y = e.baseY - off; e.hh = off;
      break;
    }
    case 'cannon': {
      if (--e.timer <= 0) {
        e.timer = 170 + Math.floor(Math.random() * 60);
        const dx = pl.x - (e.x + 8);
        if (Math.abs(dx) > 24 && Math.abs(dx) < 230 && !L.clear) {
          const d = dx > 0 ? 1 : -1;
          L.ents.push({ t: 'bullet', x: e.x + d * 14, y: e.y + 2, w: 14, h: 12, vx: 1.4 * d, vy: 0, dir: d, alive: true, dead: false, timer: 0 });
          SFX.boom(); addPart({ k: 'puff', x: e.x + 8 + d * 12, y: e.y + 8, life: 16 });
        }
      }
      break;
    }
    case 'bullet': e.x += e.vx; break;
    case 'thwomp': {
      const pcx = pl.x + pl.w / 2, ecx = e.x + e.w / 2;
      if (e.state === 'wait') {
        if (Math.abs(pcx - ecx) < 36 && pl.y > e.y) { e.state = 'fall'; e.vy = 0; }
      } else if (e.state === 'fall') {
        e.vy = Math.min(e.vy + 0.45, 6); e.vx = 0; moveBody(e);
        if (e.onGround) { e.state = 'land'; e.timer = 0; L.shake = 12; if (onScreen(e.x)) SFX.thwomp(); }
      } else if (e.state === 'land') {
        if (e.timer > 60) e.state = 'rise';
      } else if (e.state === 'rise') {
        e.y -= 1; if (e.y <= e.homeY) { e.y = e.homeY; e.state = 'wait'; }
      }
      break;
    }
    case 'firebar': {
      e.ang += e.spd;
      for (let i = 0; i < e.len; i++) {
        const bx = e.cx + Math.cos(e.ang) * i * 8, by = e.cy + Math.sin(e.ang) * i * 8;
        if (bx > pl.x - 3 && bx < pl.x + pl.w + 3 && by > pl.y - 3 && by < pl.y + pl.h + 3) { hurt(); break; }
      }
      break;
    }
    case 'podoboo': {
      if (e.state === 'wait') { e.y = e.homeY; if (--e.timer <= 0) { e.state = 'jump'; e.vy = -7; } }
      else { e.vy += 0.18; e.y += e.vy; if (e.y >= e.homeY && e.vy > 0) { e.state = 'wait'; e.timer = 100; } }
      break;
    }
    case 'boss': updBoss(e); break;
    case 'bossfire': e.x += e.vx; e.y += e.vy; break;
  }
  if (e.y > ROWS * TS + 40 && e.t !== 'podoboo') e.alive = false;
}

function updBoss(e) {
  if (!L.bossLock) return;
  if (!L.bossStarted) { L.bossStarted = true; playMusic('boss'); }
  e.vy = Math.min(e.vy + 0.3, 6);
  if (e.hurt > 0) e.hurt--;
  const dx = (pl.x + pl.w / 2) - (e.x + e.w / 2);
  e.dir = dx < 0 ? -1 : 1;
  const spd = e.hp === 1 ? 1.2 : e.hp === 2 ? 0.85 : 0.6;
  if (e.onGround) {
    e.vx = e.hurt > 0 ? -e.dir * 1.8 : e.dir * spd;
    if (e.timer % 150 === 0) e.vy = -6.5;
  }
  if (e.timer % 110 === 55 && !pl.dead) {
    const fx = e.dir > 0 ? e.x + e.w : e.x - 16;
    const ty = (pl.y + pl.h / 2) - (e.y + 12);
    L.ents.push({ t: 'bossfire', x: fx, y: e.y + 8, w: 16, h: 8, vx: 2 * e.dir, vy: Math.max(-0.8, Math.min(0.8, ty / 80)), alive: true, dead: false, timer: 0 });
    tone(200, 0.25, 'sawtooth', 0.15, 0, 80);
  }
  moveBody(e);
}
function bossDamage(e) {
  e.hp--; e.hurt = 90; SFX.bossHit(); addScore(1000, e.x, e.y);
  if (e.hp <= 0) {
    e.dead = true; e.vy = -4; e.vx = 0; L.bossDead = 1;
    L.ents.forEach(o => { if (o.t === 'bossfire') o.alive = false; });
    stopMusic();
  }
}

/* ===================== JOGADOR ===================== */
function makePlayer(xTile) {
  const big = G.power > 0;
  const p = { x: xTile * TS + 2, y: 0, w: 12, h: big ? 27 : 15, vx: 0, vy: 0, dir: 1, onGround: false,
    power: G.power, inv: 0, star: 0, dead: false, deadT: 0, anim: 0, pm: 0, combo: 0, spin: false, growT: 0, pb: 0, vyb: 0 };
  let ty = 0; while (ty < ROWS && !solidAt(xTile, ty)) ty++;
  p.y = ty * TS - p.h;
  return p;
}
function setPower(n) {
  const wasBig = pl.power > 0, big = n > 0;
  if (big && !wasBig) { pl.y -= 12; pl.h = 27; }
  if (!big && wasBig) { pl.y += 12; pl.h = 15; }
  pl.power = n; G.power = n;
}
function grow(n) { setPower(n); pl.growT = 30; SFX.power(); }
function hurt() {
  if (pl.inv > 0 || pl.star > 0 || pl.dead || L.clear) return;
  if (pl.power > 0) { setPower(pl.power === 2 ? 1 : 0); pl.inv = 120; SFX.hurt(); pl.growT = 20; }
  else die();
}
function die() {
  if (pl.dead) return;
  pl.dead = true; pl.deadT = 0; pl.vy = -5; pl.star = 0;
  stopMusic(); SFX.die();
}
function afterDeath() {
  G.lives--; G.power = 0;
  if (G.lives <= 0) goTo(() => { G.state = 'gameover'; G.t = 0; stopMusic(); SFX.gameover(); });
  else goTo(enterMap);
}

function updatePlayer() {
  const p = pl;
  if (p.dead) {
    p.deadT++;
    if (p.deadT > 40) { p.vy = Math.min(p.vy + 0.22, 5); p.y += p.vy; }
    if (p.deadT === 200) afterDeath();
    return;
  }
  if (p.inv > 0) p.inv--;
  if (p.star > 0) { p.star--; if (p.star === 0 && !L.clear) playMusic(L.bossStarted ? 'boss' : L.music); }
  let left = K.left, right = K.right, run = K.run, jumpP = KP.jump, spinP = KP.spin, jumpH = K.jump || K.spin;
  if (L.clear) { left = false; right = L.clear === 1; run = false; jumpP = spinP = jumpH = false; }
  const maxS = run ? (p.pm >= 48 ? 3.4 : 2.6) : 1.5;
  const acc = run ? 0.1 : 0.07;
  if (right && !left) {
    p.dir = 1;
    if (p.vx < 0) p.vx += p.onGround ? 0.25 : 0.12;
    else if (p.vx < maxS) p.vx = Math.min(maxS, p.vx + acc);
    else if (p.onGround) p.vx = Math.max(maxS, p.vx - 0.05);
  } else if (left && !right) {
    p.dir = -1;
    if (p.vx > 0) p.vx -= p.onGround ? 0.25 : 0.12;
    else if (p.vx > -maxS) p.vx = Math.max(-maxS, p.vx - acc);
    else if (p.onGround) p.vx = Math.min(-maxS, p.vx + 0.05);
  } else if (p.onGround) {
    if (p.vx > 0) p.vx = Math.max(0, p.vx - 0.08); else if (p.vx < 0) p.vx = Math.min(0, p.vx + 0.08);
  }
  if (L.clear === 1) p.vx = Math.min(p.vx, 1.2);
  if (L.clear === 2) p.vx *= 0.85;
  if (p.onGround) { if (run && Math.abs(p.vx) >= 2.5) p.pm = Math.min(48, p.pm + 1); else p.pm = Math.max(0, p.pm - 2); }
  if (p.onGround && (jumpP || spinP)) {
    const isSpin = spinP && !jumpP;
    p.vy = -((isSpin ? 4.6 : 4.9) + Math.abs(p.vx) * 0.3);
    p.spin = isSpin; p.onGround = false;
    isSpin ? SFX.spin() : SFX.jump();
  }
  p.vy = Math.min(5, p.vy + ((jumpH && p.vy < 0) ? 0.22 : 0.6));
  if (KP.run && p.power === 2 && !L.clear && L.fbs.length < 2) {
    L.fbs.push({ x: p.dir > 0 ? p.x + p.w : p.x - 8, y: p.y + 8, w: 8, h: 8, vx: 4 * p.dir, vy: 1, t: 0 });
    SFX.fire();
  }
  p.pb = p.y + p.h; p.vyb = p.vy;
  moveBody(p);
  if (p.x < L.cam) { p.x = L.cam; if (p.vx < 0) p.vx = 0; }
  if (p.x > L.w * TS - p.w) p.x = L.w * TS - p.w;
  if (p.onGround) { p.spin = false; p.combo = 0; }
  if (p.hitCeil) {
    const cx = p.x + p.w / 2; let best = p.hitCeil.txs[0];
    for (const tx of p.hitCeil.txs) if (Math.abs(tx * TS + 8 - cx) < Math.abs(best * TS + 8 - cx)) best = tx;
    hitBlock(best, p.hitCeil.ty, p.power > 0);
  }
  p.anim += Math.abs(p.vx) * 0.1;
  // Moedas
  const tx0 = Math.floor(p.x / TS), tx1 = Math.floor((p.x + p.w - 1) / TS);
  const ty0 = Math.floor(p.y / TS), ty1 = Math.floor((p.y + p.h - 1) / TS);
  for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
    const c = tileC(tx, ty);
    if (c === 'o') { L.map[ty][tx] = '.'; addCoin(tx * TS, ty * TS); }
    else if (c === 'Y') {
      L.map[ty][tx] = '.'; L.dragons++; SFX.coin(); G.coins++;
      if (L.dragons >= 5) oneUp(tx * TS, ty * TS); else addScore([1000, 2000, 4000, 8000][L.dragons - 1], tx * TS, ty * TS);
    }
  }
  // Lava
  if (tileC(Math.floor((p.x + p.w / 2) / TS), Math.floor((p.y + p.h - 4) / TS)) === 'L') die();
  if (p.y > ROWS * TS + 8) die();
}

function playerVsEnts() {
  if (pl.dead || pl.growT > 0) return;
  for (const e of L.ents) {
    if (!e.alive || e.dead || e.squish || e.nobody) continue;
    if (e.t === 'piranha' && e.off < 4) continue;
    if (!overlap(pl, e)) continue;
    if (pl.star > 0 && e.t !== 'boss') { if (e.t !== 'thwomp' && e.t !== 'podoboo') { killFlip(e); comboScore(e); } continue; }
    const stomp = pl.vyb > 0 && pl.pb <= e.y + 8;
    const bounce = () => { pl.vy = pl.spin ? -3.5 : (K.jump ? -6 : -4.2); pl.y = e.y - pl.h; };
    switch (e.t) {
      case 'goomba':
        if (stomp) { bounce(); comboScore(e); if (pl.spin) puffKill(e); else { e.squish = 30; SFX.stomp(); } }
        else hurt();
        break;
      case 'koopa': case 'rkoopa': case 'parakoopa':
        if (stomp) {
          bounce(); comboScore(e);
          if (pl.spin) puffKill(e);
          else if (e.t === 'parakoopa') { e.t = 'koopa'; e.vx = e.vx < 0 ? -0.5 : 0.5; SFX.stomp(); }
          else { toShell(e); SFX.stomp(); }
        } else hurt();
        break;
      case 'shell':
        if (e.moving) {
          if (stomp) { bounce(); if (pl.spin) puffKill(e); else { e.moving = false; e.vx = 0; e.stillT = 0; SFX.stomp(); } comboScore(e); }
          else if (e.kickT <= 0) hurt();
        } else {
          if (stomp) bounce();
          kickShell(e);
        }
        break;
      case 'bullet':
        if (stomp) { bounce(); comboScore(e); if (pl.spin) puffKill(e); else killFlip(e); }
        else hurt();
        break;
      case 'boss':
        if (stomp && e.hurt <= 0) { pl.vy = -5.5; pl.y = e.y - pl.h; bossDamage(e); }
        else if (e.hurt <= 0) hurt();
        break;
      case 'thwomp': case 'piranha':
        if (stomp && pl.spin) { pl.vy = -4; pl.y = e.y - pl.h; SFX.stomp(); addPart({ k: 'puff', x: pl.x + 6, y: pl.y + pl.h, life: 12 }); }
        else hurt();
        break;
      default: hurt();
    }
  }
}

function updateFireballs() {
  for (const f of L.fbs) {
    f.t++; f.vy = Math.min(f.vy + 0.35, 4);
    const ov = f.vx; moveBody(f);
    if (f.onGround) f.vy = -3.5;
    if (f.hitWall || f.x < L.cam - 16 || f.x > L.cam + W + 16 || f.y > H) { f.dead = true; if (f.hitWall) addPart({ k: 'puff', x: f.x + 4, y: f.y + 4, life: 12 }); continue; }
    f.vx = ov;
    for (const e of L.ents) {
      if (!e.alive || e.dead || e.nobody || e.squish) continue;
      if (e.t === 'piranha' && e.off < 4) continue;
      if (!overlap(f, e)) continue;
      if (FIREKILL.has(e.t)) {
        e.alive = false; f.dead = true; SFX.kick();
        addPart({ k: 'coin', x: e.x, y: e.y, vy: -4, g: 0.3, life: 30 }); addCoin(e.x, e.y); addScore(200, e.x, e.y);
      } else if (e.t === 'boss') {
        f.dead = true; addPart({ k: 'puff', x: f.x + 4, y: f.y + 4, life: 12 });
        if (e.hurt <= 0 && ++e.fireHits % 5 === 0) bossDamage(e); else SFX.bump();
      } else if (e.t === 'bullet' || e.t === 'thwomp' || e.t === 'podoboo' || e.t === 'bossfire') {
        f.dead = true; addPart({ k: 'puff', x: f.x + 4, y: f.y + 4, life: 12 });
      }
      if (f.dead) break;
    }
  }
  L.fbs = L.fbs.filter(f => !f.dead);
}

function updateItems() {
  for (const it of L.items) {
    if (it.emerge > 0) {
      it.y--; it.emerge--;
      if (it.emerge === 0) {
        if (it.k === 'mushroom' || it.k === 'oneup') it.vx = 1;
        if (it.k === 'star') { it.vx = 1.2; it.vy = -3; }
      }
      continue;
    }
    if (it.k !== 'flower') {
      it.vy = Math.min(it.vy + (it.k === 'star' ? 0.2 : 0.3), 4);
      const ov = it.vx; moveBody(it);
      if (it.hitWall) it.vx = -ov;
      if (it.k === 'star' && it.onGround) it.vy = -4;
    }
    if (it.y > H + 20) it.gone = true;
    if (!pl.dead && overlap(pl, it)) {
      it.gone = true;
      if (it.k === 'mushroom') { if (pl.power === 0) grow(1); else SFX.power(); addScore(1000, it.x, it.y); }
      else if (it.k === 'flower') { if (pl.power !== 2) grow(2); else SFX.power(); addScore(1000, it.x, it.y); }
      else if (it.k === 'star') { pl.star = 600; playMusic('star'); SFX.power(); addScore(1000, it.x, it.y); }
      else if (it.k === 'oneup') oneUp(it.x, it.y);
    }
  }
  L.items = L.items.filter(i => !i.gone);
}

/* ===================== FASE: INÍCIO / LOOP ===================== */
function startLevel(i) {
  const d = LEVELS[i]();
  L = { idx: i, name: d.name, type: d.type, music: d.music, w: d.w, map: d.t,
    spawns: d.ents.map(s => Object.assign({ spawned: false }, s)), ents: [], items: [], parts: [], fbs: [], bumps: [],
    cam: 0, time: d.time, timeTick: 0, goalX: d.goal, midX: d.mid, bossX: d.boss,
    clear: 0, clearT: 0, tapeY: 64, tapeDir: 1, tapeHit: false, midTouched: !!G.mid[i], dragons: 0, f: 0,
    shake: 0, paused: false, bossLock: false, bossStarted: false, bossDead: 0, leaving: 0 };
  pl = makePlayer(L.midTouched && L.midX ? L.midX + 2 : d.start);
  L.cam = Math.max(0, Math.min(L.w * TS - W, pl.x - W / 2));
  G.state = 'level';
  playMusic(L.music);
}

function startClear(kind) {
  L.clear = kind; L.clearT = 0; stopMusic();
  kind === 1 ? SFX.clear() : SFX.bossClear();
  for (const e of L.ents) {
    if (!e.alive || e.dead || e.nobody || e.t === 'boss') continue;
    if (onScreen(e.x)) { addPart({ k: 'coin', x: e.x, y: e.y, vy: -4, g: 0.3, life: 30 }); addCoin(e.x, e.y); }
    e.alive = false;
  }
}
function finishLevel() {
  G.cleared = Math.max(G.cleared, L.idx + 1); G.mid[L.idx] = false; save();
  if (L.idx === LEVELS.length - 1) goTo(() => { G.state = 'ending'; G.t = 0; playMusic('title'); });
  else goTo(() => { enterMap(); G.mapPos = L.idx + 1; });
}

function updateLevel() {
  if (KP.start && !L.clear && !pl.dead) { L.paused = !L.paused; SFX.pause(); }
  if (L.paused) return;
  L.f++;
  if (pl.growT > 0) { pl.growT--; return; }
  // Spawn de inimigos ao entrar na tela
  if (!L.clear) for (const s of L.spawns) {
    if (!s.spawned && s.x * TS < L.cam + W + 32 && s.x * TS > L.cam - 48) { s.spawned = true; L.ents.push(spawnEnt(s)); }
  }
  // Tempo
  if (!L.clear && !pl.dead && ++L.timeTick >= 40) {
    L.timeTick = 0; L.time--;
    if (L.time === 100) SFX.hurry();
    if (L.time <= 0) { L.time = 0; die(); }
  }
  updatePlayer();
  if (!pl.dead) {
    for (const e of L.ents) if (e.alive) updEnt(e);
    playerVsEnts();
  }
  L.ents = L.ents.filter(e => e.alive && (e.t === 'boss' || (e.x > L.cam - 200 && e.x < L.cam + W + 200)));
  updateItems();
  updateFireballs();
  for (const p of L.parts) { p.t++; p.vy += p.g; p.x += p.vx; p.y += p.vy; }
  L.parts = L.parts.filter(p => p.t < p.life);
  for (const b of L.bumps) b.t++;
  L.bumps = L.bumps.filter(b => b.t < 10);
  if (L.shake > 0) L.shake--;

  // Fita do meio da fase
  if (L.midX && !L.midTouched && pl.x + pl.w > L.midX * TS + 4 && pl.x < L.midX * TS + 28 && !pl.dead) {
    L.midTouched = true; G.mid[L.idx] = true; SFX.midway();
    if (pl.power === 0) grow(1);
  }
  // Chefão
  if (L.bossX && !L.bossLock && pl.x > (L.bossX + 2) * TS) {
    L.bossLock = true;
    for (let y = 2; y < ROWS - 2; y++) L.map[y][L.bossX] = 'c';
    SFX.thwomp(); L.shake = 10; stopMusic();
  }
  if (L.bossDead && !L.clear) { if (++L.bossDead > 100) startClear(2); }
  // Linha de chegada
  if (L.goalX) {
    L.tapeY += L.tapeDir; if (L.tapeY < 56 || L.tapeY > 180) L.tapeDir = -L.tapeDir;
    const gx = L.goalX * TS;
    if (!L.clear && !pl.dead) {
      if (!L.tapeHit && overlap(pl, { x: gx + 8, y: L.tapeY, w: 32, h: 4 })) {
        L.tapeHit = true;
        const bonus = Math.max(1, Math.round((180 - L.tapeY) / 124 * 50)) * 100;
        addScore(bonus, pl.x, pl.y - 10);
        addPart({ k: 'tape', x: gx + 8, y: L.tapeY, vx: 1.5, vy: -2, g: 0.1, life: 80 });
      }
      if (pl.x + pl.w / 2 > gx + 24) startClear(1);
    }
  }
  // Sequência de vitória
  if (L.clear) {
    L.clearT++;
    if (L.clearT > 150 && L.time > 0) {
      const d = Math.min(L.time, 3); L.time -= d; G.score += d * 50;
      if (L.clearT % 4 === 0) SFX.tick();
    }
    if (L.clearT > 150 && L.time <= 0 && !L.leaving) L.leaving = 90;
    if (L.leaving && --L.leaving === 0) finishLevel();
  }
  // Câmera
  let target = pl.x + pl.w / 2 - W / 2;
  const minC = L.bossLock ? L.bossX * TS : 0, maxC = L.w * TS - W;
  target = Math.max(minC, Math.min(maxC, target));
  L.cam += (target - L.cam) * 0.2;
  if (Math.abs(target - L.cam) < 0.5) L.cam = target;
}

/* ===================== DESENHO: CENÁRIO ===================== */
const THEMES = {
  over: { sky1: '#60a0f8', sky2: '#c8e8ff', gTop: '#40c040', gLight: '#a8f070', gEdge: '#086808', dirt: '#d89048', dirtDark: '#a86028', dot: '#f0c080' },
  sky: { sky1: '#f8a070', sky2: '#a8d0f8', gTop: '#40c040', gLight: '#a8f070', gEdge: '#086808', dirt: '#d89048', dirtDark: '#a86028', dot: '#f0c080' },
  under: { sky1: '#000010', sky2: '#101838', gTop: '#6888d8', gLight: '#a8c0f8', gEdge: '#182868', dirt: '#3850a0', dirtDark: '#283880', dot: '#7890e0' },
  castle: { sky1: '#100810', sky2: '#302030', gTop: '#a8a8b0', gLight: '#e0e0e8', gEdge: '#383840', dirt: '#808088', dirtDark: '#585860', dot: '#b0b0b8' },
};
function cloud(x, y, s = 1) {
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(x + 10 * s, y + 12 * s, 9 * s, 0, 7); ctx.arc(x + 22 * s, y + 8 * s, 12 * s, 0, 7); ctx.arc(x + 34 * s, y + 12 * s, 9 * s, 0, 7);
  ctx.fill();
  rect(x + 8 * s, y + 12 * s, 28 * s, 9 * s, '#fff');
  rect(x + 8 * s, y + 20 * s, 28 * s, 1, '#c8d8f8');
  rect(x + 18 * s, y + 7 * s, 2, 5, '#000'); rect(x + 25 * s, y + 7 * s, 2, 5, '#000');
}
function drawSkyBG(th, off, t, hills) {
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, th.sky1); g.addColorStop(1, th.sky2);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // nuvens
  const co = off * 0.15 + t * 0.15, CP = 150, cs = Math.floor(co / CP);
  for (let i = cs - 1; i < cs + 3; i++) cloud(i * CP - co, 26 + ((i * 71) % 4 + 4) % 4 * 14);
  if (hills) {
    const ho = off * 0.35, HP = 200, hs = Math.floor(ho / HP);
    for (let i = hs - 1; i < hs + 3; i++) {
      const k = ((i % 3) + 3) % 3;
      const hx = i * HP - ho + 100, hh = 60 + k * 22, hw = 48 + k * 12;
      ctx.fillStyle = '#185818'; ctx.beginPath(); ctx.ellipse(hx, H - 20, hw + 2, hh + 2, 0, Math.PI, 0); ctx.fill();
      ctx.fillStyle = '#58c058'; ctx.beginPath(); ctx.ellipse(hx, H - 20, hw, hh, 0, Math.PI, 0); ctx.fill();
      rect(hx - hw, H - 20, hw * 2, 20, '#58c058');
      rect(hx - hw * 0.5, H - 20 - hh * 0.6, 6, 3, '#88e888');
      rect(hx - 8, H - 20 - hh + 18, 3, 8, '#000'); rect(hx + 5, H - 20 - hh + 18, 3, 8, '#000');
    }
  } else {
    // céu: nuvens grandes no fundo
    const bo = off * 0.3, BP = 120, bs = Math.floor(bo / BP);
    for (let i = bs - 1; i < bs + 4; i++) cloud(i * BP - bo, 150 + (((i * 37) % 3) + 3) % 3 * 12, 1.6);
  }
}
function drawCaveBG(off) {
  rect(0, 0, W, H, '#080818');
  const o = off * 0.4, P = 48, s = Math.floor(o / P);
  for (let i = s - 1; i < s + 8; i++) {
    const x = i * P - o, h = 30 + (((i * 53) % 4) + 4) % 4 * 14;
    ctx.fillStyle = '#18204a';
    ctx.beginPath(); ctx.moveTo(x, 28); ctx.lineTo(x + 24, 28 + h); ctx.lineTo(x + 48, 28); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x + 10, H); ctx.lineTo(x + 30, H - h * 0.8); ctx.lineTo(x + 50, H); ctx.fill();
  }
}
function drawCastleBG(off) {
  rect(0, 0, W, H, '#201820');
  const o = Math.floor(off * 0.5);
  for (let y = 0; y < H; y += 8) {
    rect(0, y, W, 1, '#140c14');
    const sh = (y / 8) % 2 ? 8 : 0;
    for (let x = -((o + sh) % 16); x < W; x += 16) rect(x, y, 1, 8, '#140c14');
  }
  const P = 96, s = Math.floor(o / P);
  for (let i = s - 1; i < s + 4; i++) {
    const x = i * P - o + 40;
    rect(x, 60, 16, 30, '#0a060a'); circ(x + 8, 60, 8, '#0a060a');
    rect(x + 7, 50, 2, 40, '#201820'); rect(x, 74, 16, 2, '#201820');
  }
}

/* ===================== DESENHO: TILES ===================== */
function isGround(c) { return c === 'G' || c === 'D'; }
const QGLYPH = ['.XXX.', 'XX.XX', '...XX', '..XX.', '..X..', '.....', '..X..'];
function drawQ(x, y, t) {
  const sh = Math.floor(t / 8) % 8;
  rect(x, y, 16, 16, '#5a3000');
  rect(x + 1, y + 1, 14, 14, sh < 6 ? '#f8b800' : '#f8d860');
  rect(x + 1, y + 1, 14, 1, '#f8e8a0'); rect(x + 1, y + 1, 1, 14, '#f8e8a0');
  for (const [a, b] of [[2, 2], [13, 2], [2, 13], [13, 13]]) rect(x + a, y + b, 1, 1, '#5a3000');
  for (let j = 0; j < 7; j++) for (let i = 0; i < 5; i++) if (QGLYPH[j][i] === 'X') {
    rect(x + 6 + i, y + 5 + j, 1, 1, '#5a3000'); rect(x + 5 + i, y + 4 + j, 1, 1, '#fff');
  }
}
function drawBrickT(x, y, a, b, hl) {
  rect(x, y, 16, 16, a);
  const bs = [[0, 0, 7, 7], [8, 0, 8, 7], [0, 8, 3, 7], [4, 8, 8, 7], [13, 8, 3, 7]];
  for (const [i, j, w, h] of bs) { rect(x + i, y + j, w, h, b); rect(x + i, y + j, w, 1, hl); }
}
function drawCoin(x, y, t) {
  const f = Math.floor(t / 7) % 4, ws = [10, 6, 2, 6][f], cx = x + 8;
  rect(cx - ws / 2, y + 2, ws, 12, '#a86000');
  if (ws > 2) { rect(cx - ws / 2 + 1, y + 3, ws - 2, 10, '#f8d000'); rect(cx - ws / 2 + 2, y + 4, 1, 6, '#fff8b0'); }
}
function drawDragon(x, y, t) {
  const f = Math.floor(t / 8) % 4, ws = [14, 10, 4, 10][f], cx = x + 8;
  rect(cx - ws / 2, y - 6, ws, 22, '#a86000');
  if (ws > 4) {
    rect(cx - ws / 2 + 1, y - 5, ws - 2, 20, '#f8d000');
    rect(cx - 2, y - 1, 4, 4, '#20a020'); rect(cx - 1, y + 3, 2, 6, '#20a020'); rect(cx - ws / 2 + 2, y - 3, 1, 12, '#fff8b0');
  }
}
function drawTile(c, x, y, tx, ty, th) {
  switch (c) {
    case 'G': case 'D': {
      rect(x, y, 16, 16, th.dirt);
      if (((tx * 5 + ty * 3) % 4) === 0) rect(x + 4, y + 7, 2, 2, th.dot);
      if (((tx * 3 + ty * 7) % 5) === 1) rect(x + 10, y + 11, 2, 2, th.dirtDark);
      if (((tx + ty) % 3) === 2) rect(x + 11, y + 4, 1, 2, th.dirtDark);
      const lG = !isGround(tileC(tx - 1, ty)), rG = !isGround(tileC(tx + 1, ty));
      if (lG) rect(x, y, 2, 16, th.gEdge);
      if (rG) rect(x + 14, y, 2, 16, th.gEdge);
      if (c === 'G') {
        rect(x, y, 16, 5, th.gTop); rect(x, y + 5, 16, 2, th.gEdge); rect(x, y, 16, 1, th.gLight);
        if (tx % 2 === 0) rect(x + 3, y + 5, 3, 2, th.gTop);
      }
      break;
    }
    case 'B': drawBrickT(x, y, '#3a1800', '#c86020', '#f0a060'); break;
    case 'c': drawBrickT(x, y, '#28282c', '#686870', '#9898a0'); break;
    case '?': case 'M': case '1': case '*': drawQ(x, y, L.f); break;
    case 'U':
      rect(x, y, 16, 16, '#4a2800'); rect(x + 1, y + 1, 14, 14, '#a86830');
      for (const [a, b] of [[2, 2], [13, 2], [2, 13], [13, 13]]) rect(x + a, y + b, 1, 1, '#4a2800');
      break;
    case 'S': {
      const a = L.type === 'castle' ? ['#d0d0d8', '#888890', '#404048'] : ['#f8c888', '#c88840', '#683808'];
      rect(x, y, 16, 16, a[2]); rect(x, y, 15, 15, a[0]); rect(x + 1, y + 1, 14, 14, a[1]); rect(x + 3, y + 3, 3, 2, a[0]);
      break;
    }
    case 'P': case 'p': {
      const D = '#0a5a12', Mc = '#28b030', Lc = '#98f070';
      rect(x, y, 16, 16, D);
      if (c === 'P') { rect(x + 1, y + 1, 15, 14, Mc); rect(x + 3, y + 1, 2, 14, Lc); rect(x + 6, y + 1, 1, 14, Lc); }
      else { rect(x, y + 1, 15, 14, Mc); rect(x + 9, y + 1, 2, 14, D); rect(x + 12, y + 1, 1, 14, D); }
      break;
    }
    case 'I': case 'i': {
      const D = '#0a5a12', Mc = '#28b030', Lc = '#98f070';
      if (c === 'I') { rect(x + 2, y, 14, 16, D); rect(x + 3, y, 13, 16, Mc); rect(x + 5, y, 2, 16, Lc); rect(x + 8, y, 1, 16, Lc); }
      else { rect(x, y, 14, 16, D); rect(x, y, 13, 16, Mc); rect(x + 7, y, 2, 16, D); rect(x + 10, y, 1, 16, D); }
      break;
    }
    case 'o': drawCoin(x, y, L.f); break;
    case 'Y': drawDragon(x, y, L.f); break;
    case '=':
      rect(x, y, 16, 7, '#a04800'); rect(x, y, 16, 6, '#f89838'); rect(x, y, 16, 1, '#fff0c0');
      rect(x + 3, y + 2, 2, 2, '#fff0c0'); rect(x + 10, y + 3, 2, 2, '#fff0c0');
      if (tileC(tx, ty + 1) === '.') rect(x + 6, y + 7, 4, 9, '#c8a070');
      break;
    case '-':
      circ(x + 4, y + 6, 5, '#fff'); circ(x + 12, y + 5, 6, '#fff'); rect(x, y + 5, 16, 7, '#fff');
      rect(x, y + 11, 16, 1, '#b8c8e8');
      break;
    case 'L': {
      const top = tileC(tx, ty - 1) !== 'L';
      rect(x, y, 16, 16, '#c82000');
      if (top) {
        for (let i = 0; i < 16; i++) {
          const h = 3 + Math.round(Math.sin((tx * 16 + i) * 0.4 + L.f * 0.1) * 2);
          rect(x + i, y, 1, h, '#f8a000'); rect(x + i, y, 1, 1, '#fff060');
        }
      } else if ((tx + ty + Math.floor(L.f / 20)) % 3 === 0) rect(x + 5, y + 6, 3, 2, '#f86000');
      break;
    }
    case 'K':
      rect(x, y, 16, 16, '#101010'); rect(x + 1, y + 1, 14, 3, '#585858');
      rect(x + 5, y + 6, 6, 5, '#e8e8e8'); rect(x + 6, y + 7, 1, 2, '#101010'); rect(x + 9, y + 7, 1, 2, '#101010');
      break;
    case 'k':
      rect(x + 2, y, 12, 16, '#282828'); rect(x + 3, y, 2, 16, '#606060'); rect(x + 2, y + 6, 12, 2, '#101010');
      break;
  }
}
function drawTiles() {
  const th = THEMES[L.type], cx = camX();
  const tx0 = Math.floor(cx / TS), tx1 = Math.min(L.w - 1, tx0 + 17);
  const bmap = {};
  for (const b of L.bumps) bmap[b.tx + ',' + b.ty] = -Math.round(Math.sin(b.t / 10 * Math.PI) * 6);
  for (let ty = 0; ty < ROWS; ty++) for (let tx = Math.max(0, tx0); tx <= tx1; tx++) {
    const c = L.map[ty][tx]; if (c === '.') continue;
    drawTile(c, tx * TS - cx, ty * TS + (bmap[tx + ',' + ty] || 0), tx, ty, th);
  }
}

/* ===================== DESENHO: OBJETOS ===================== */
function drawFlower(x, y) {
  const c = ['#f83800', '#f8a000', '#f83800', '#f8f8f8'][Math.floor(G.t / 6) % 4];
  rect(x + 7, y + 8, 2, 8, '#20a020'); rect(x + 2, y + 11, 5, 2, '#20a020'); rect(x + 9, y + 12, 5, 2, '#20a020');
  rect(x + 2, y + 1, 12, 8, '#000'); rect(x + 3, y + 2, 10, 6, c);
  rect(x + 5, y + 3, 6, 4, '#f8d800'); rect(x + 6, y + 4, 4, 2, '#fff');
}
function drawStar(x, y, t) {
  const c = ['#f8d800', '#f8f8a0'][Math.floor(t / 4) % 2];
  ctx.fillStyle = c; ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? 3.5 : 8, a = -Math.PI / 2 + i * Math.PI / 5;
    ctx.lineTo(x + 8 + Math.cos(a) * r, y + 8 + Math.sin(a) * r);
  }
  ctx.fill();
  rect(x + 6, y + 6, 1, 3, '#000'); rect(x + 9, y + 6, 1, 3, '#000');
}
function drawItem(it) {
  const x = Math.round(it.x - camX()), y = Math.round(it.y);
  if (it.k === 'mushroom') drawSpr(MUSH, x - 1, y + 2);
  else if (it.k === 'oneup') drawSpr(ONEUP, x - 1, y + 2);
  else if (it.k === 'flower') drawFlower(x - 1, y);
  else if (it.k === 'star') drawStar(x - 1, y, L.f);
}
function drawPiranha(e) {
  const x = Math.round(e.x - camX()), y = Math.round(e.y);
  const open = Math.floor(L.f / 10) % 2;
  rect(x + 5, y + 12, 4, 12, '#20a020');
  rect(x, y + 15, 5, 3, '#20a020'); rect(x + 9, y + 17, 5, 3, '#20a020');
  ctx.fillStyle = '#d82800'; ctx.beginPath(); ctx.ellipse(x + 7, y + 7, 8, 7, 0, 0, Math.PI * 2); ctx.fill();
  rect(x + 1, y + 6, 2, 2, '#fff'); rect(x + 11, y + 4, 2, 2, '#fff'); rect(x + 4, y + 10, 2, 2, '#fff'); rect(x + 10, y + 10, 2, 2, '#fff');
  rect(x + 5, y - 1, 5, open ? 9 : 4, '#fff'); rect(x + 6, y - 1, 3, open ? 8 : 3, '#400000');
}
function drawEnt(e) {
  const cx = camX(), x = Math.round(e.x - cx), y = Math.round(e.y);
  if (e.squish) { ctx.drawImage(GOOMBA, x + e.w / 2 - 8, y + e.h - 8, 16, 8); return; }
  const fy = e.dead;
  switch (e.t) {
    case 'goomba': drawAt(GOOMBA, e, Math.floor(L.f / 10) % 2 === 0, fy); break;
    case 'koopa': case 'rkoopa': {
      const s = e.t === 'rkoopa' ? KOOPA_R : KOOPA_G;
      drawSpr(s, x + e.w / 2 - 8, y + e.h - s.height - (Math.floor(L.f / 8) % 2), e.dir > 0, fy);
      break;
    }
    case 'parakoopa':
      drawSpr(KOOPA_G, x + e.w / 2 - 8, y + e.h - 21, e.dir > 0, fy);
      if (!fy) drawSpr(WING, e.dir > 0 ? x - 4 : x + 10, y - 4 - (Math.floor(L.f / 6) % 2) * 3, e.dir > 0);
      break;
    case 'shell': {
      const s = e.color === 'r' ? SHELL_R : SHELL_G;
      drawAt(s, e, e.moving && Math.floor(L.f / 3) % 2 === 0, fy);
      break;
    }
    case 'bullet': {
      const d = e.vx > 0;
      rect(x + 2, y, 10, 12, '#181818'); circ(d ? x + 11 : x + 3, y + 6, 6, '#181818');
      rect(d ? x : x + 12, y + 1, 2, 10, '#383838');
      rect(d ? x + 9 : x + 3, y + 3, 3, 3, '#fff'); rect(d ? x + 10 : x + 3, y + 4, 1, 1, '#000');
      rect(d ? x + 5 : x + 7, y + 8, 3, 2, '#f8f8f8');
      break;
    }
    case 'thwomp': {
      rect(x, y, 24, 30, '#303038'); rect(x + 1, y + 1, 22, 28, '#9898a8'); rect(x + 2, y + 2, 20, 2, '#c8c8d8');
      for (let i = 0; i < 3; i++) { rect(x - 2, y + 5 + i * 9, 2, 4, '#606068'); rect(x + 24, y + 5 + i * 9, 2, 4, '#606068'); }
      const angry = e.state === 'fall' || Math.abs(pl.x - e.x) < 70;
      rect(x + 4, y + 9, 6, 5, '#fff'); rect(x + 14, y + 9, 6, 5, '#fff');
      rect(x + 6, y + 10, 2, 3, '#000'); rect(x + 16, y + 10, 2, 3, '#000');
      rect(x + 3, y + (angry ? 6 : 7), 8, 2, '#303038'); rect(x + 13, y + (angry ? 6 : 7), 8, 2, '#303038');
      rect(x + 5, y + 19, 14, 6, '#fff'); for (let i = 0; i < 4; i++) rect(x + 7 + i * 3, y + 19, 1, 6, '#606068');
      break;
    }
    case 'firebar':
      for (let i = 0; i < e.len; i++) {
        const bx = e.cx + Math.cos(e.ang) * i * 8 - cx, by = e.cy + Math.sin(e.ang) * i * 8;
        circ(bx, by, 4, '#f84000'); circ(bx, by, 2, '#f8e000');
      }
      break;
    case 'podoboo': {
      if (e.state === 'wait') break;
      const up = e.vy < 0;
      circ(x + 6, y + 7, 7, '#f84000'); circ(x + 6, y + 7, 5, '#f8a000');
      if (!up) { rect(x + 2, y - 4, 2, 4, '#f86000'); rect(x + 8, y - 6, 2, 6, '#f86000'); }
      else { rect(x + 2, y + 14, 2, 4, '#f86000'); rect(x + 8, y + 14, 2, 6, '#f86000'); }
      rect(x + 3, y + 5, 2, 3, '#000'); rect(x + 8, y + 5, 2, 3, '#000');
      break;
    }
    case 'bossfire': {
      const d = e.vx > 0;
      ctx.fillStyle = '#f84000'; ctx.beginPath(); ctx.ellipse(x + 8, y + 4, 8, 4, 0, 0, 7); ctx.fill();
      circ(d ? x + 12 : x + 4, y + 4, 3, '#f8e000');
      break;
    }
    case 'boss': drawBoss(e, x, y); break;
  }
}
function drawBoss(e, x, y) {
  if (e.hurt > 0 && Math.floor(e.hurt / 3) % 2 && !e.dead) return;
  ctx.save();
  if (e.dead) { ctx.translate(x + 14, y + 16); ctx.scale(1, -1); ctx.translate(-x - 14, -y - 16); }
  const d = e.dir, cxm = x + 14;
  const walk = Math.floor(L.f / 10) % 2;
  // pés
  rect(x + 2 + walk * 2, y + 26, 10, 6, '#f8c838'); rect(x + 16 - walk * 2, y + 26, 10, 6, '#f8c838');
  rect(x + 2 + walk * 2, y + 31, 10, 1, '#fff');
  // casco
  ctx.fillStyle = '#f8f8f8'; ctx.beginPath(); ctx.ellipse(cxm - d * 4, y + 17, 14, 12, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#108830'; ctx.beginPath(); ctx.ellipse(cxm - d * 4, y + 16, 12, 10, 0, 0, 7); ctx.fill();
  for (let i = 0; i < 3; i++) {
    const sx = cxm - d * 4 - 8 + i * 8;
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(sx - 3, y + 9); ctx.lineTo(sx, y + 2); ctx.lineTo(sx + 3, y + 9); ctx.fill();
  }
  // barriga
  ctx.fillStyle = '#f8e8a0'; ctx.beginPath(); ctx.ellipse(cxm + d * 6, y + 19, 6, 8, 0, 0, 7); ctx.fill();
  // cabeça
  const hx = cxm + d * 9;
  circ(hx, y + 4, 8, '#f8c838');
  rect(hx - 9, y - 6, 18, 5, '#e83010');
  rect(hx - 6, y - 10, 3, 5, '#fff'); rect(hx + 3, y - 10, 3, 5, '#fff');
  rect(hx + d * 2 - 2, y, 5, 5, '#fff'); rect(hx + d * 3 - 1, y + 1, 2, 3, '#000');
  rect(hx + d * 3 - 3, y + 8, 7, 3, '#fff'); rect(hx + d * 3 - 3, y + 10, 7, 1, '#c00000');
  // braço
  rect(cxm + d * 3 - 2, y + 15, 6, 4, '#f8c838');
  ctx.restore();
}
function drawPlayer() {
  const p = pl;
  if (!p.dead && p.inv > 0 && Math.floor(p.inv / 3) % 2) return;
  let palK = p.power === 2 ? 'fire' : 'normal';
  if (p.star > 0) palK = ['star1', 'star2', 'star3', 'fire'][Math.floor(L.f / 3) % 4];
  let big = p.power > 0;
  if (p.growT > 0) big = Math.floor(p.growT / 4) % 2 ? !big : big;
  const set = MSPR[palK][big ? 'big' : 'small'];
  let f, left = p.dir < 0;
  if (p.dead) { f = MSPR.normal.small.dead; left = false; }
  else if (!p.onGround) f = set.jump;
  else if (Math.abs(p.vx) > 0.15) f = Math.floor(p.anim) % 2 ? set.walk : set.stand;
  else f = set.stand;
  if (p.spin && !p.onGround && !p.dead) left = Math.floor(L.f / 3) % 2 === 0;
  drawSpr(f, p.x + p.w / 2 - f.width / 2 - camX(), p.y + p.h - f.height, left);
}
function drawGoal() {
  if (!L.goalX) return;
  const x = L.goalX * TS - camX(), top = 40, bot = 192;
  for (const px of [x, x + 40]) {
    rect(px, top, 8, bot - top, '#583000');
    for (let y = top; y < bot; y += 8) rect(px + 1, y, 6, 4, '#f8d898'), rect(px + 1, y + 4, 6, 4, '#c88840');
    circ(px + 4, top, 5, '#f8d898');
  }
  if (!L.tapeHit) { rect(x + 8, L.tapeY, 32, 4, '#f8f8f8'); rect(x + 8, L.tapeY + 3, 32, 1, '#a0a0a0'); }
}
function drawMid() {
  if (!L.midX) return;
  const x = L.midX * TS - camX(), top = 120, bot = 192;
  for (const px of [x, x + 24]) { rect(px, top, 4, bot - top, '#583000'); rect(px + 1, top, 2, bot - top, '#f8b860'); }
  if (!L.midTouched) { rect(x + 4, 150, 20, 3, '#f8f8f8'); rect(x + 4, 152, 20, 1, '#f84000'); }
}
function drawParts() {
  const cx = camX();
  for (const p of L.parts) {
    const x = Math.round(p.x - cx), y = Math.round(p.y);
    switch (p.k) {
      case 'brick': rect(x, y, 7, 7, '#3a1800'); rect(x + 1, y + 1, 5, 5, '#c86020'); break;
      case 'score': txt(p.s, x, y, p.c || '#fff', 'left', 8); break;
      case 'puff': {
        const r = 3 + p.t * 0.6; ctx.globalAlpha = 1 - p.t / p.life;
        circ(x - 4, y, r, '#fff'); circ(x + 4, y - 2, r, '#fff'); circ(x, y + 3, r, '#fff');
        ctx.globalAlpha = 1; break;
      }
      case 'coin': drawCoin(x, y, p.t * 2); break;
      case 'tape': rect(x, y, 32, 4, '#f8f8f8'); break;
    }
  }
}
function drawHUD() {
  txt('MARIO', 12, 6, '#ff5030');
  txt('x' + pad(G.lives, 2), 20, 16);
  for (let i = 0; i < 5; i++) {
    if (i < L.dragons) { rect(60 + i * 8, 7, 6, 8, '#a86000'); rect(61 + i * 8, 8, 4, 6, '#f8d000'); }
    else rect(62 + i * 8, 10, 2, 2, '#ffffff55');
  }
  if (pl.pm > 0) { for (let i = 0; i < 6; i++) rect(60 + i * 7, 18, 5, 4, pl.pm >= (i + 1) * 8 ? (pl.pm >= 48 ? '#f84000' : '#f8f8f8') : '#ffffff33'); }
  txt('TEMPO', 112, 6, '#f8d800');
  txt(pad(L.time, 3), 120, 16, L.time <= 100 ? '#ff5030' : '#fff');
  drawCoin(178, 3, L.f);
  txt('x' + pad(G.coins, 2), 192, 6);
  txt(pad(G.score, 7), 248, 16, '#fff', 'right');
}
function drawLevel() {
  const th = THEMES[L.type], cx = camX();
  ctx.save();
  if (L.shake > 0) ctx.translate(0, (L.shake % 2 ? 2 : -2));
  if (L.type === 'over') drawSkyBG(th, cx, L.f, true);
  else if (L.type === 'sky') drawSkyBG(th, cx, L.f, false);
  else if (L.type === 'under') drawCaveBG(cx);
  else drawCastleBG(cx);
  drawMid();
  for (const e of L.ents) if (e.t === 'piranha' && e.alive && !e.dead) drawPiranha(e);
  for (const it of L.items) if (it.emerge > 0) drawItem(it);
  drawTiles();
  drawGoal();
  for (const it of L.items) if (!(it.emerge > 0)) drawItem(it);
  for (const e of L.ents) if (e.alive && (e.t !== 'piranha' || e.dead)) drawEnt(e);
  for (const f of L.fbs) { const x = f.x - cx; circ(x + 4, f.y + 4, 4, '#f84000'); circ(x + 4, f.y + 4, 2, '#f8e000'); }
  drawPlayer();
  drawParts();
  ctx.restore();
  drawHUD();
  if (L.f < 120 && !L.clear) {
    rect(0, 92, W, 30, 'rgba(0,0,0,0.55)');
    txt(L.name, W / 2, 98, '#f8d800', 'center');
    txt('MARIO START!', W / 2, 110, '#fff', 'center');
  }
  if (L.clear && L.clearT > 40) {
    txt(L.clear === 2 ? 'VITORIA!' : 'FASE COMPLETA!', W / 2, 80, '#f8d800', 'center');
    if (L.clearT > 120) txt('BONUS TEMPO', W / 2, 100, '#fff', 'center');
  }
  if (L.bossLock && !L.bossDead) {
    const b = L.ents.find(e => e.t === 'boss');
    if (b) { txt('IGGY', 168, 30, '#f8d800'); for (let i = 0; i < 3; i++) rect(208 + i * 10, 30, 8, 8, i < b.hp ? '#f84000' : '#ffffff33'); }
  }
  if (L.paused) { rect(0, 0, W, H, 'rgba(0,0,0,0.5)'); txt('PAUSA', W / 2, 100, '#fff', 'center', 16); txt('ENTER PARA VOLTAR', W / 2, 124, '#ccc', 'center'); }
}

/* ===================== MAPA DO MUNDO ===================== */
const NODES = [
  { x: 36, y: 176, house: true, name: 'CASA DO YOSHI' },
  { x: 78, y: 152, lvl: 0, name: 'ILHA DO YOSHI 1' },
  { x: 128, y: 166, lvl: 1, name: 'ILHA DO YOSHI 2' },
  { x: 180, y: 144, lvl: 2, name: 'CAVERNA AMARELA' },
  { x: 152, y: 104, lvl: 3, name: 'CEU DE NUVENS' },
  { x: 92, y: 92, lvl: 4, name: 'PLANICIE DONUT' },
  { x: 196, y: 70, lvl: 5, name: 'CASTELO DO IGGY', castle: true },
];
function enterMap() {
  G.state = 'map'; G.mapMove = null; G.mapInfo = false; playMusic('map');
  G.mapPos = Math.min(G.mapPos, Math.min(NODES.length - 1, G.cleared + 1));
}
function updateMap() {
  G.t++;
  if (G.mapInfo) { if (KP.jump || KP.start) G.mapInfo = false; return; }
  if (G.mapMove) { const m = G.mapMove; m.p += m.spd; if (m.p >= 1) { G.mapPos = m.to; G.mapMove = null; } return; }
  const maxNode = Math.min(NODES.length - 1, G.cleared + 1);
  let to = -1;
  if ((K.right || K.up) && G.mapPos < maxNode) to = G.mapPos + 1;
  else if ((K.left || K.down) && G.mapPos > 0) to = G.mapPos - 1;
  if (to >= 0) {
    const a = NODES[G.mapPos], b = NODES[to];
    G.mapMove = { from: G.mapPos, to, p: 0, spd: 1.5 / Math.hypot(b.x - a.x, b.y - a.y) };
    SFX.map(); return;
  }
  if (KP.jump || KP.start) {
    const n = NODES[G.mapPos];
    if (n.house) { G.mapInfo = true; SFX.pause(); }
    else { SFX.coin(); goTo(() => startLevel(n.lvl)); }
  }
}
function drawIsland() {
  const blobs = [[40, 170, 40, 30], [100, 160, 60, 34], [165, 148, 50, 40], [140, 100, 50, 30], [90, 90, 44, 28], [200, 78, 34, 34]];
  for (const [x, y, rx, ry] of blobs) { ctx.fillStyle = '#f8d878'; ctx.beginPath(); ctx.ellipse(x, y, rx + 6, ry + 6, 0, 0, 7); ctx.fill(); }
  for (const [x, y, rx, ry] of blobs) { ctx.fillStyle = '#186818'; ctx.beginPath(); ctx.ellipse(x, y, rx + 1, ry + 1, 0, 0, 7); ctx.fill(); }
  for (const [x, y, rx, ry] of blobs) { ctx.fillStyle = '#58b848'; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, 7); ctx.fill(); }
  // morrinhos decorativos
  for (const [x, y] of [[60, 130], [120, 135], [190, 120], [110, 75], [170, 90], [30, 160], [215, 100]]) {
    ctx.fillStyle = '#286828'; ctx.beginPath(); ctx.ellipse(x, y, 9, 8, 0, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#78d068'; ctx.beginPath(); ctx.ellipse(x, y, 7, 6, 0, Math.PI, 0); ctx.fill();
    rect(x - 2, y - 4, 1, 2, '#000'); rect(x + 2, y - 4, 1, 2, '#000');
  }
}
function drawMap() {
  rect(0, 0, W, H, '#2058c8');
  for (let y = 8; y < H; y += 14) for (let x = ((y * 7) % 30) - 30 + (Math.floor(G.t / 20) % 2) * 4; x < W; x += 30) rect(x, y, 8, 1, '#80b0f8');
  drawIsland();
  const maxNode = Math.min(NODES.length - 1, G.cleared + 1);
  for (let i = 0; i < maxNode; i++) {
    const a = NODES[i], b = NODES[i + 1];
    ctx.strokeStyle = '#784818'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    ctx.strokeStyle = '#f8d8a0'; ctx.lineWidth = 3; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); ctx.setLineDash([]);
  }
  NODES.forEach((n, i) => {
    if (n.house) {
      rect(n.x - 9, n.y - 10, 18, 12, '#f8e8c8'); rect(n.x - 9, n.y - 10, 18, 1, '#000');
      ctx.fillStyle = '#d82800'; ctx.beginPath(); ctx.moveTo(n.x - 12, n.y - 9); ctx.lineTo(n.x, n.y - 20); ctx.lineTo(n.x + 12, n.y - 9); ctx.fill();
      rect(n.x - 2, n.y - 5, 5, 7, '#784818');
    } else if (n.castle) {
      const done = G.cleared > n.lvl;
      rect(n.x - 12, n.y - 22, 24, 22, done ? '#585858' : '#a8a8b0'); rect(n.x - 12, n.y - 22, 24, 2, '#e0e0e8');
      for (let k = 0; k < 4; k++) rect(n.x - 12 + k * 7, n.y - 27, 4, 5, done ? '#585858' : '#a8a8b0');
      rect(n.x - 3, n.y - 9, 6, 9, '#202020');
      rect(n.x - 1, n.y - 36, 1, 10, '#000'); rect(n.x, n.y - 36, 6, 4, done ? '#888' : '#d82800');
    } else {
      const done = G.cleared > n.lvl;
      circ(n.x, n.y, 6, '#000'); circ(n.x, n.y, 5, done ? '#e82020' : '#f8d800'); circ(n.x - 1, n.y - 2, 2, done ? '#f88080' : '#fff8b0');
    }
    if (i > maxNode) { /* não revelado */ }
  });
  // Mario no mapa
  let mx, my;
  if (G.mapMove) {
    const a = NODES[G.mapMove.from], b = NODES[G.mapMove.to], t = G.mapMove.p;
    mx = a.x + (b.x - a.x) * t; my = a.y + (b.y - a.y) * t;
  } else { mx = NODES[G.mapPos].x; my = NODES[G.mapPos].y; }
  const pk = G.power === 2 ? 'fire' : 'normal';
  const fr = G.mapMove ? (Math.floor(G.t / 6) % 2 ? MSPR[pk].small.walk : MSPR[pk].small.stand) : MSPR[pk].small.stand;
  const flip = G.mapMove && NODES[G.mapMove.to].x < NODES[G.mapMove.from].x;
  drawSpr(fr, mx - 6, my - 14 - (G.mapMove ? 0 : (Math.floor(G.t / 20) % 2)), flip);
  // painel
  rect(0, 0, W, 30, '#000');
  rect(0, 29, W, 1, '#f8d800');
  txt('MUNDO 1: ILHA DO YOSHI', W / 2, 4, '#f8d800', 'center');
  txt('MARIO x' + pad(G.lives, 2), 8, 17);
  drawCoin(150, 13, G.t); txt('x' + pad(G.coins, 2), 164, 17);
  txt(pad(G.score, 7), 252, 17, '#fff', 'right');
  rect(0, H - 22, W, 22, '#000');
  const n = NODES[G.mapPos];
  txt(G.mapMove ? '...' : n.name, W / 2, H - 16, '#fff', 'center');
  if (G.mapInfo) {
    rect(16, 44, W - 32, 136, '#000'); rect(18, 46, W - 36, 132, '#183078');
    const lines = ['BEM-VINDO A ILHA', 'DO YOSHI!', '', 'SETAS: ANDAR', 'Z/ESPACO: PULAR', 'X/SHIFT: CORRER', '  E SOLTAR FOGO', 'C: PULO GIRATORIO', 'ENTER: PAUSA', 'M: LIGA/DESLIGA SOM', '', 'DERROTE O IGGY!'];
    lines.forEach((l, i) => txt(l, W / 2, 52 + i * 10, i < 2 ? '#f8d800' : '#fff', 'center'));
  }
}

/* ===================== TELAS ===================== */
function drawTitle() {
  drawSkyBG(THEMES.over, G.t * 0.6, G.t, true);
  for (let x = 0; x < W; x += 16) { rect(x, 200, 16, 24, '#d89048'); rect(x, 200, 16, 5, '#40c040'); rect(x, 205, 16, 2, '#086808'); }
  const word = 'MARIO WORLD', cols = ['#f83800', '#f8d800', '#40c040', '#3878f8', '#f83800', '#ffffff', '#f8d800', '#40c040', '#3878f8', '#f83800', '#f8d800'];
  rect(20, 36, W - 40, 76, 'rgba(0,0,0,0.55)');
  txt('SUPER', W / 2, 44, '#fff', 'center', 8);
  ctx.font = '16px ' + FONT; ctx.textBaseline = 'top'; ctx.textAlign = 'left';
  let x = W / 2 - word.length * 8;
  for (let i = 0; i < word.length; i++) {
    const yy = 60 + Math.round(Math.sin(G.t * 0.08 + i * 0.6) * 2);
    ctx.fillStyle = '#000'; ctx.fillText(word[i], x + 2, yy + 2);
    ctx.fillStyle = cols[i]; ctx.fillText(word[i], x, yy);
    x += 16;
  }
  txt('VERSAO HTML', W / 2, 90, '#f8d800', 'center');
  drawSpr(MSPR.normal.big.stand, 40, 200 - 31);
  drawSpr(GOOMBA, 190 + Math.round(Math.sin(G.t * 0.02) * 20), 184, Math.floor(G.t / 10) % 2 === 0);
  if (Math.floor(G.t / 30) % 2 === 0) txt('APERTE ENTER', W / 2, 130, '#fff', 'center');
  txt('SETAS MOVER  Z PULAR', W / 2, 152, '#fff', 'center');
  txt('X CORRER/FOGO  C GIRO', W / 2, 164, '#fff', 'center');
  if (G.cleared > 0) txt('FASES VENCIDAS: ' + G.cleared + '/6', W / 2, 112, '#88f888', 'center');
}
function updateTitle() {
  G.t++;
  if (G.t === 1) playMusic('title');
  if (KP.start || KP.jump) { audioInit(); SFX.coin(); goTo(enterMap); }
}
function drawGameOver() {
  rect(0, 0, W, H, '#000');
  txt('GAME OVER', W / 2, 96, '#f83800', 'center', 16);
  if (G.t > 90) txt('APERTE ENTER', W / 2, 130, '#fff', 'center');
}
function updateGameOver() {
  G.t++;
  if (G.t > 90 && (KP.start || KP.jump)) { G.lives = 5; G.coins = 0; G.score = 0; G.power = 0; goTo(enterMap); }
}
function drawEnding() {
  rect(0, 0, W, H, '#081040');
  for (let i = 0; i < 40; i++) { const x = (i * 97 + G.t * 0.2 * (i % 3 + 1)) % W, y = (i * 53) % 150; rect(x, y, 1, 1, i % 4 ? '#fff' : '#f8d800'); }
  for (let x = 0; x < W; x += 16) { rect(x, 200, 16, 24, '#d89048'); rect(x, 200, 16, 5, '#40c040'); }
  txt('PARABENS!', W / 2, 30, '#f8d800', 'center', 16);
  const lines = ['VOCE DERROTOU O IGGY', 'E SALVOU A ILHA', 'DO YOSHI!', '', 'PONTOS: ' + G.score, '', 'OBRIGADO POR JOGAR!'];
  lines.forEach((l, i) => { if (G.t > 30 + i * 25) txt(l, W / 2, 62 + i * 14, '#fff', 'center'); });
  const mx = (G.t * 0.8) % (W + 40) - 20;
  drawSpr(Math.floor(G.t / 8) % 2 ? MSPR.normal.big.walk : MSPR.normal.big.stand, mx, 200 - 31);
  if (G.t > 240 && Math.floor(G.t / 30) % 2) txt('APERTE ENTER', W / 2, 180, '#f8d800', 'center');
}
function updateEnding() { G.t++; if (G.t > 240 && (KP.start || KP.jump)) goTo(() => { G.state = 'title'; G.t = 0; }); }

/* ===================== LOOP PRINCIPAL ===================== */
function update() {
  if (G.trans) {
    G.trans.t++;
    if (G.trans.t === 20) G.trans.fn();
    if (G.trans.t >= 40) G.trans = null;
    return;
  }
  switch (G.state) {
    case 'title': updateTitle(); break;
    case 'map': updateMap(); break;
    case 'level': updateLevel(); break;
    case 'gameover': updateGameOver(); break;
    case 'ending': updateEnding(); break;
  }
}
function draw() {
  ctx.imageSmoothingEnabled = false;
  switch (G.state) {
    case 'title': drawTitle(); break;
    case 'map': drawMap(); break;
    case 'level': drawLevel(); break;
    case 'gameover': drawGameOver(); break;
    case 'ending': drawEnding(); break;
  }
  if (G.trans) {
    const t = G.trans.t, a = t < 20 ? t / 20 : (40 - t) / 20;
    rect(0, 0, W, H, 'rgba(0,0,0,' + Math.max(0, Math.min(1, a)) + ')');
  }
  if (muted) txt('MUDO', W - 4, H - 10, '#888', 'right');
}
let last = performance.now(), acc = 0;
function frame(now) {
  acc += Math.min(100, now - last); last = now;
  let first = true;
  while (acc >= 1000 / 60) {
    if (first) { KP = KPq; KPq = {}; first = false; } else KP = {};
    update();
    acc -= 1000 / 60;
  }
  draw();
  musicTick();
  requestAnimationFrame(frame);
}
(document.fonts ? document.fonts.load('8px "Press Start 2P"').catch(() => { }) : Promise.resolve()).then(() => requestAnimationFrame(frame));
