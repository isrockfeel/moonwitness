// Saksi type family — original glyph skeletons, drawn for MoonWitness.
// Coordinate space: y-up, baseline 0, cap 700, x-height 520, ascender 740,
// descender -200, mono advance 600. Every glyph is a list of centerline
// strokes; the pens in pens.mjs expand them into outlines.
//
// Original work, (c) 2026 MoonWitness. See LICENSE.txt.

const rad = (d) => (d * Math.PI) / 180;

export function bez(p0, p1, p2, p3, n = 14) {
  const pts = [];
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    const u = 1 - t;
    pts.push([
      u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
      u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
    ]);
  }
  return pts;
}

// Elliptical arc, degrees, counter-clockwise from a0 to a1 (a1 may exceed 360).
export function arc(cx, cy, rx, ry, a0, a1, step = 12) {
  const n = Math.max(2, Math.ceil(Math.abs(a1 - a0) / step));
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const a = rad(a0 + ((a1 - a0) * i) / n);
    pts.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]);
  }
  return pts;
}

export function ring(cx, cy, rx, ry, step = 12) {
  const pts = arc(cx, cy, rx, ry, 0, 360, step);
  pts[pts.length - 1] = pts[0].slice();
  return pts;
}

const L = (...pts) => pts;
const dot = (x, y) => [[x, y - 5], [x, y + 5]];

// ---------------------------------------------------------------- uppercase
const A = [L([100, 0], [300, 700], [500, 0]), L([168, 235], [432, 235])];
const B = [
  L([115, 0], [115, 700]),
  L([115, 700], [340, 700], ...bez([340, 700], [455, 700], [470, 640], [470, 535]), ...bez([470, 535], [470, 430], [445, 365], [340, 365]), [115, 365]),
  L([115, 365], [355, 365], ...bez([355, 365], [475, 365], [495, 300], [495, 185]), ...bez([495, 185], [495, 65], [465, 0], [350, 0]), [115, 0]),
];
const C = [arc(300, 350, 200, 350, 52, 308)];
const D = [
  L([115, 0], [115, 700]),
  L([115, 700], [320, 700], ...bez([320, 700], [480, 700], [500, 560], [500, 350]), ...bez([500, 350], [500, 140], [480, 0], [320, 0]), [115, 0]),
];
const E = [L([115, 0], [115, 700]), L([115, 700], [480, 700]), L([115, 360], [450, 360]), L([115, 0], [480, 0])];
const F = [L([115, 0], [115, 700]), L([115, 700], [480, 700]), L([115, 360], [440, 360])];
const gArcEnd = [300 + 200 * Math.cos(rad(328)), 350 + 350 * Math.sin(rad(328))];
const G = [arc(300, 350, 200, 350, 52, 328), L(gArcEnd, [500, 240], [500, 350], [335, 350])];
const H = [L([115, 0], [115, 700]), L([485, 0], [485, 700]), L([115, 360], [485, 360])];
const I = [L([300, 0], [300, 700]), L([170, 700], [430, 700]), L([170, 0], [430, 0])];
const J = [L([430, 700], [430, 190], ...bez([430, 190], [430, 60], [380, 0], [290, 0]), ...bez([290, 0], [210, 0], [165, 55], [160, 140]))];
const K = [L([115, 0], [115, 700]), L([480, 700], [115, 310]), L([245, 449], [495, 0])];
const Ltr = [L([115, 700], [115, 0], [480, 0])];
const M = [L([100, 0], [100, 700], [300, 330], [500, 700], [500, 0])];
const N = [L([100, 0], [100, 700], [500, 0], [500, 700])];
const O = [ring(300, 350, 200, 350)];
const P = [
  L([115, 0], [115, 700]),
  L([115, 700], [350, 700], ...bez([350, 700], [480, 700], [495, 625], [495, 525]), ...bez([495, 525], [495, 425], [480, 350], [350, 350]), [115, 350]),
];
const Q = [ring(300, 350, 200, 350), L([370, 190], [520, -50])];
const R = [...P, L([300, 350], [495, 0])];
const S = [
  L([470, 590], ...bez([470, 590], [455, 685], [355, 712], [285, 706]), ...bez([285, 706], [190, 698], [125, 640], [125, 545]), ...bez([125, 545], [125, 440], [205, 395], [300, 360]), ...bez([300, 360], [395, 325], [475, 280], [475, 175]), ...bez([475, 175], [475, 70], [395, -8], [295, -6]), ...bez([295, -6], [215, -4], [130, 35], [115, 120])),
];
const T = [L([100, 700], [500, 700]), L([300, 700], [300, 0])];
const U = [L([100, 700], [100, 200], ...bez([100, 200], [100, 60], [170, 0], [300, 0]), ...bez([300, 0], [430, 0], [500, 60], [500, 200]), [500, 700])];
const V = [L([100, 700], [300, 0], [500, 700])];
const W = [L([75, 700], [185, 0], [300, 460], [415, 0], [525, 700])];
const X = [L([110, 700], [490, 0]), L([490, 700], [110, 0])];
const Y = [L([100, 700], [300, 370], [500, 700]), L([300, 370], [300, 0])];
const Z = [L([115, 700], [485, 700], [115, 0], [485, 0])];

// ---------------------------------------------------------------- lowercase
// Stems sit 5u inside the bowl extremes so joins overlap cleanly (exact
// tangencies break the polygon boolean); e's bar buries both ends in the ring.
const a = [ring(295, 260, 180, 258), L([470, 520], [470, 0])];
const b = [L([125, 740], [125, 0]), ring(300, 260, 180, 258)];
const c = [arc(295, 260, 180, 258, 52, 308)];
const d = [ring(300, 260, 180, 258), L([475, 740], [475, 0])];
const e = [L([100, 262], [490, 262]), arc(295, 262, 180, 258, 0, 308)];
const f = [L([300, 0], [300, 560], ...bez([300, 560], [300, 680], [350, 740], [440, 738])), L([165, 520], [445, 520])];
const g = [ring(295, 260, 180, 258), L([470, 520], [470, -70], ...bez([470, -70], [470, -165], [420, -205], [330, -205]), ...bez([330, -205], [265, -205], [225, -180], [205, -140]))];
const h = [L([120, 740], [120, 0]), L([120, 310], ...bez([120, 310], [120, 455], [195, 522], [300, 522]), ...bez([300, 522], [405, 522], [480, 455], [480, 310]), [480, 0])];
const i = [L([300, 520], [300, 0]), dot(300, 660)];
const j = [L([330, 520], [330, -70], ...bez([330, -70], [330, -165], [280, -205], [205, -203]), ...bez([205, -203], [160, -200], [130, -175], [120, -140])), dot(330, 660)];
const k = [L([120, 740], [120, 0]), L([465, 520], [120, 235]), L([240, 334], [480, 0])];
const l = [L([300, 740], [300, 0])];
const m = [
  L([75, 520], [75, 0]),
  L([75, 320], ...bez([75, 320], [75, 460], [130, 522], [215, 522]), ...bez([215, 522], [290, 522], [300, 455], [300, 330]), [300, 0]),
  L([300, 320], ...bez([300, 320], [300, 460], [355, 522], [440, 522]), ...bez([440, 522], [515, 522], [525, 455], [525, 330]), [525, 0]),
];
const n = [L([120, 520], [120, 0]), L([120, 310], ...bez([120, 310], [120, 455], [195, 522], [300, 522]), ...bez([300, 522], [405, 522], [480, 455], [480, 310]), [480, 0])];
const o = [ring(300, 260, 182, 258)];
const p = [L([125, 520], [125, -200]), ring(300, 260, 180, 258)];
const q = [ring(300, 260, 180, 258), L([475, 520], [475, -200])];
const r = [L([150, 520], [150, 0]), L([150, 300], ...bez([150, 300], [150, 450], [220, 522], [330, 522]), ...bez([330, 522], [400, 522], [445, 495], [465, 450]))];
// s = uppercase S squeezed into the x-height band.
const s = [S[0].map(([x, y]) => [300 + (x - 300) * 0.92, (y / 700) * 520])];
const t = [L([295, 640], [295, 130], ...bez([295, 130], [295, 40], [340, 0], [425, 2])), L([160, 520], [445, 520])];
const u = [L([120, 520], [120, 210], ...bez([120, 210], [120, 65], [195, -2], [300, -2]), ...bez([300, -2], [405, -2], [480, 65], [480, 210]), [480, 520])];
const v = [L([110, 520], [300, 0], [490, 520])];
const w = [L([70, 520], [180, 0], [300, 350], [420, 0], [530, 520])];
const x = [L([120, 520], [480, 0]), L([480, 520], [120, 0])];
const y = [L([110, 520], [302, 10]), L([490, 520], [225, -200])];
const z = [L([125, 520], [475, 520], [125, 0], [475, 0])];

// ------------------------------------------------------------------- digits
const zero = [ring(300, 350, 182, 350)];
const zeroSlash = [...zero, L([215, 130], [385, 570])];
const one = [L([195, 555], [310, 700], [310, 0]), L([175, 0], [450, 0])];
const two = [L([120, 565], ...bez([120, 565], [125, 675], [215, 708], [295, 706]), ...bez([295, 706], [390, 704], [470, 645], [470, 545]), ...bez([470, 545], [470, 430], [360, 330], [250, 225]), ...bez([250, 225], [180, 158], [130, 95], [120, 0]), [480, 0])];
const three = [L([125, 610], ...bez([125, 610], [150, 690], [230, 710], [300, 708]), ...bez([300, 708], [395, 705], [460, 650], [460, 555]), ...bez([460, 555], [460, 465], [400, 405], [310, 390]), ...bez([310, 390], [420, 375], [485, 310], [485, 195]), ...bez([485, 195], [485, 80], [405, -8], [295, -6]), ...bez([295, -6], [215, -4], [140, 30], [118, 105]))];
const four = [L([390, 700], [105, 255], [505, 255]), L([390, 700], [390, 0])];
const five = [L([465, 700], [140, 700], [128, 395], ...bez([128, 395], [175, 440], [245, 458], [310, 455]), ...bez([310, 455], [415, 450], [480, 375], [480, 235]), ...bez([480, 235], [480, 95], [400, -8], [295, -6]), ...bez([295, -6], [215, -4], [140, 32], [118, 110]))];
const six = [L([455, 655], ...bez([455, 655], [400, 705], [330, 712], [270, 700]), ...bez([270, 700], [170, 680], [122, 560], [120, 300])), ring(300, 212, 182, 212)];
const seven = [L([115, 700], [485, 700], [245, 0])];
// One continuous stroke: two loops joined at the waist. Separate rings would
// cross at shallow angles and break the polygon boolean.
const eight = [L(...arc(300, 525, 168, 175, -90, 270), ...arc(300, 180, 188, 180, 90, 450))];
const nine = [L([145, 45], ...bez([145, 45], [200, -5], [270, -12], [330, 0]), ...bez([330, 0], [430, 20], [478, 140], [480, 400])), ring(300, 488, 182, 212)];

// -------------------------------------------------------------- punctuation
const period = [dot(300, 60)];
const comma = [L([305, 65], [300, 40], [250, -110])];
const colon = [dot(300, 60), dot(300, 380)];
const semicolon = [dot(300, 380), L([305, 65], [300, 40], [250, -110])];
const exclam = [L([300, 700], [300, 230]), dot(300, 60)];
const question = [L([155, 585], ...bez([155, 585], [160, 680], [240, 710], [305, 708]), ...bez([305, 708], [395, 705], [450, 650], [450, 565]), ...bez([450, 565], [450, 480], [380, 445], [330, 405]), ...bez([330, 405], [305, 385], [300, 360], [300, 320])), dot(300, 60)];
const quoteSingle = [L([300, 700], [285, 560])];
const quoteDouble = [L([245, 700], [230, 560]), L([370, 700], [355, 560])];
const parenL = [arc(430, 330, 190, 430, 115, 245)];
const parenR = [arc(170, 330, 190, 430, -65, 65)];
const bracketL = [L([390, 760], [250, 760], [250, -100], [390, -100])];
const bracketR = [L([210, 760], [350, 760], [350, -100], [210, -100])];
const braceL = [L([400, 760], ...bez([400, 760], [320, 760], [310, 720], [310, 650]), [310, 450], ...bez([310, 450], [310, 390], [280, 360], [230, 350]), ...bez([230, 350], [280, 340], [310, 310], [310, 250]), [310, 50], ...bez([310, 50], [310, -20], [320, -60], [400, -60]))];
const braceR = [L([200, 760], ...bez([200, 760], [280, 760], [290, 720], [290, 650]), [290, 450], ...bez([290, 450], [290, 390], [320, 360], [370, 350]), ...bez([370, 350], [320, 340], [290, 310], [290, 250]), [290, 50], ...bez([290, 50], [290, -20], [280, -60], [200, -60]))];
const slash = [L([150, -80], [450, 780])];
const backslash = [L([450, -80], [150, 780])];
const hyphen = [L([170, 350], [430, 350])];
const endash = [L([120, 350], [480, 350])];
const emdash = [L([60, 350], [540, 350])];
const underscore = [L([110, -90], [490, -90])];
const plus = [L([300, 210], [300, 490]), L([160, 350], [440, 350])];
const equal = [L([160, 270], [440, 270]), L([160, 430], [440, 430])];
const asterisk = [L([300, 410], [300, 700]), L([174, 482], [426, 628]), L([426, 482], [174, 628])];
const ampersand = [
  ring(280, 550, 125, 150),
  L([392, 462], ...bez([392, 462], [330, 370], [125, 330], [122, 180]), ...bez([122, 180], [120, 60], [220, -8], [320, 0]), ...bez([320, 0], [400, 6], [450, 50], [490, 120])),
  L([310, 340], [505, 0]),
];
const at = [
  arc(300, 350, 205, 340, -55, 235),
  ring(295, 330, 90, 115),
  L([380, 445], [380, 230], ...bez([380, 230], [380, 185], [420, 178], [455, 195])),
];
const numbersign = [L([225, 640], [185, 60]), L([425, 640], [385, 60]), L([130, 460], [490, 460]), L([110, 240], [470, 240])];
const dollar = [...S, L([300, 760], [300, -60])];
const percent = [L([140, -20], [460, 720]), ring(190, 565, 95, 125), ring(410, 135, 95, 125)];
const degree = [ring(300, 600, 88, 95)];
const middot = [dot(300, 350)];
const section = [
  S[0].map(([x, y]) => [300 + (x - 300) * 0.6, 350 + (y - 350) * 0.55 + 165]),
  S[0].map(([x, y]) => [300 + (x - 300) * 0.6, 350 + (y - 350) * 0.55 - 165]),
];
const copyright = [ring(300, 350, 205, 350), arc(300, 350, 110, 190, 55, 305)];
const registered = [
  ring(300, 350, 205, 350),
  L([245, 180], [245, 520]),
  L([245, 520], [330, 520], ...bez([330, 520], [395, 520], [400, 470], [400, 435]), ...bez([400, 435], [400, 395], [390, 370], [330, 370]), [245, 370]),
  L([310, 370], [400, 180]),
];
const trademark = [
  ...T.map((st) => st.map(([x, y]) => [170 + (x - 300) * 0.36, 480 + (y - 700) * 0.36])),
  ...M.map((st) => st.map(([x, y]) => [400 + (x - 300) * 0.36, 480 + (y - 700) * 0.36])),
];
const multiply = [L([170, 220], [430, 480]), L([430, 220], [170, 480])];
const divide = [L([160, 350], [440, 350]), dot(300, 180), dot(300, 520)];
const ellipsis = [dot(150, 60), dot(300, 60), dot(450, 60)];
const lsquo = [L([280, 565], [300, 700])];
const rsquo = [L([300, 700], [280, 565])];
const ldquo = [L([215, 565], [235, 700]), L([345, 565], [365, 700])];
const rdquo = [L([235, 700], [215, 565]), L([365, 700], [345, 565])];
const lsaquo = [L([350, 220], [230, 350], [350, 480])];
const rsaquo = [L([250, 220], [370, 350], [250, 480])];
const arrowL = [L([480, 350], [130, 350]), L([255, 480], [130, 350], [255, 220])];
const arrowR = [L([120, 350], [470, 350]), L([345, 480], [470, 350], [345, 220])];
const arrowU = [L([300, 620], [300, 80]), L([170, 210], [300, 80], [430, 210])];
const arrowD = [L([300, 80], [300, 620]), L([170, 490], [300, 620], [430, 490])];
const arrowNE = [L([180, 120], [430, 470]), L([290, 470], [430, 470], [430, 330])];
const arrowSE = [L([180, 470], [430, 120]), L([290, 120], [430, 120], [430, 260])];
const bullet = { fill: [ring(300, 350, 160, 160, 10)] };
const check = [L([140, 340], [260, 190], [470, 560])];
const cross = [L([140, 120], [460, 580]), L([460, 120], [140, 580])];
const tildeOp = [L([150, 330], ...bez([150, 330], [210, 420], [260, 420], [300, 360]), ...bez([300, 360], [340, 300], [390, 300], [450, 390]))];
const caret = [L([170, 560], [300, 700], [430, 560])];
const grave = [L([240, 700], [330, 590])];
const pipe = [L([300, 760], [300, -100])];
const less = [L([440, 190], [170, 350], [440, 510])];
const greater = [L([160, 190], [430, 350], [160, 510])];

// ------------------------------------------------------------------ accents
// Defined in cap space (y ~780..900); shifted down for lowercase.
const ACUTE = [L([245, 790], [355, 885])];
const GRAVE = [L([355, 790], [245, 885])];
const CIRC = [L([215, 790], [300, 885], [385, 790])];
const TILDE = [L([205, 815], ...bez([205, 815], [240, 875], [270, 875], [300, 835]), ...bez([300, 835], [330, 795], [360, 795], [395, 855]))];
const DIER = [dot(240, 835), dot(360, 835)];
const RINGACC = [ring(300, 840, 55, 55, 15)];
const CEDILLA = [L([305, 0], [285, -75], [325, -100], [295, -160])];

const shift = (strokes, dx, dy) => strokes.map((st) => st.map(([x, y]) => [x + dx, y + dy]));

function withAccent(base, acc, lower) {
  return [...base, ...shift(acc, 0, lower ? -185 : 0)];
}

// ------------------------------------------------------------------- export
// glyph = { strokes } | { fill } | { adv, strokes: [] }
export const GLYPHS = {
  " ": { adv: 600, strokes: [] },
  A: { strokes: A }, B: { strokes: B }, C: { strokes: C }, D: { strokes: D },
  E: { strokes: E }, F: { strokes: F }, G: { strokes: G }, H: { strokes: H },
  I: { strokes: I }, J: { strokes: J }, K: { strokes: K }, L: { strokes: Ltr },
  M: { strokes: M }, N: { strokes: N }, O: { strokes: O }, P: { strokes: P },
  Q: { strokes: Q }, R: { strokes: R }, S: { strokes: S }, T: { strokes: T },
  U: { strokes: U }, V: { strokes: V }, W: { strokes: W }, X: { strokes: X },
  Y: { strokes: Y }, Z: { strokes: Z },
  a: { strokes: a }, b: { strokes: b }, c: { strokes: c }, d: { strokes: d },
  e: { strokes: e }, f: { strokes: f }, g: { strokes: g }, h: { strokes: h },
  i: { strokes: i }, j: { strokes: j }, k: { strokes: k }, l: { strokes: l },
  m: { strokes: m }, n: { strokes: n }, o: { strokes: o }, p: { strokes: p },
  q: { strokes: q }, r: { strokes: r }, s: { strokes: s }, t: { strokes: t },
  u: { strokes: u }, v: { strokes: v }, w: { strokes: w }, x: { strokes: x },
  y: { strokes: y }, z: { strokes: z },
  0: { strokes: zero, slashed: zeroSlash }, 1: { strokes: one }, 2: { strokes: two },
  3: { strokes: three }, 4: { strokes: four }, 5: { strokes: five }, 6: { strokes: six },
  7: { strokes: seven }, 8: { strokes: eight }, 9: { strokes: nine },
  ".": { strokes: period }, ",": { strokes: comma }, ":": { strokes: colon },
  ";": { strokes: semicolon }, "!": { strokes: exclam }, "?": { strokes: question },
  "'": { strokes: quoteSingle }, '"': { strokes: quoteDouble },
  "(": { strokes: parenL }, ")": { strokes: parenR },
  "[": { strokes: bracketL }, "]": { strokes: bracketR },
  "{": { strokes: braceL }, "}": { strokes: braceR },
  "/": { strokes: slash }, "\\": { strokes: backslash },
  "-": { strokes: hyphen }, _: { strokes: underscore },
  "+": { strokes: plus }, "=": { strokes: equal }, "*": { strokes: asterisk },
  "&": { strokes: ampersand }, "@": { strokes: at }, "#": { strokes: numbersign },
  $: { strokes: dollar }, "%": { strokes: percent },
  "<": { strokes: less }, ">": { strokes: greater },
  "~": { strokes: tildeOp }, "^": { strokes: caret }, "`": { strokes: grave },
  "|": { strokes: pipe },
  "\u00A0": { adv: 600, strokes: [] },
  "\u00A7": { strokes: section }, "\u00B0": { strokes: degree },
  "\u00B7": { strokes: middot }, "\u00D7": { strokes: multiply }, "\u00F7": { strokes: divide },
  "\u00A9": { strokes: copyright }, "\u00AE": { strokes: registered }, "\u2122": { strokes: trademark },
  "\u2013": { strokes: endash }, "\u2014": { strokes: emdash },
  "\u2018": { strokes: lsquo }, "\u2019": { strokes: rsquo },
  "\u201C": { strokes: ldquo }, "\u201D": { strokes: rdquo },
  "\u2026": { strokes: ellipsis }, "\u2039": { strokes: lsaquo }, "\u203A": { strokes: rsaquo },
  "\u2190": { strokes: arrowL }, "\u2191": { strokes: arrowU },
  "\u2192": { strokes: arrowR }, "\u2193": { strokes: arrowD },
  "\u2197": { strokes: arrowNE }, "\u2198": { strokes: arrowSE },
  "\u25CF": bullet, "\u2713": { strokes: check }, "\u2715": { strokes: cross },
  // Latin-1 letters via composition.
  À: { strokes: withAccent(A, GRAVE) }, Á: { strokes: withAccent(A, ACUTE) },
  Â: { strokes: withAccent(A, CIRC) }, Ã: { strokes: withAccent(A, TILDE) },
  Ä: { strokes: withAccent(A, DIER) }, Å: { strokes: withAccent(A, RINGACC) },
  Ç: { strokes: [...C, ...CEDILLA] },
  È: { strokes: withAccent(E, GRAVE) }, É: { strokes: withAccent(E, ACUTE) },
  Ê: { strokes: withAccent(E, CIRC) }, Ë: { strokes: withAccent(E, DIER) },
  Ì: { strokes: withAccent(I, GRAVE) }, Í: { strokes: withAccent(I, ACUTE) },
  Î: { strokes: withAccent(I, CIRC) }, Ï: { strokes: withAccent(I, DIER) },
  Ñ: { strokes: withAccent(N, TILDE) },
  Ò: { strokes: withAccent(O, GRAVE) }, Ó: { strokes: withAccent(O, ACUTE) },
  Ô: { strokes: withAccent(O, CIRC) }, Õ: { strokes: withAccent(O, TILDE) },
  Ö: { strokes: withAccent(O, DIER) },
  Ù: { strokes: withAccent(U, GRAVE) }, Ú: { strokes: withAccent(U, ACUTE) },
  Û: { strokes: withAccent(U, CIRC) }, Ü: { strokes: withAccent(U, DIER) },
  Ý: { strokes: withAccent(Y, ACUTE) },
  à: { strokes: withAccent(a, GRAVE, true) }, á: { strokes: withAccent(a, ACUTE, true) },
  â: { strokes: withAccent(a, CIRC, true) }, ã: { strokes: withAccent(a, TILDE, true) },
  ä: { strokes: withAccent(a, DIER, true) }, å: { strokes: withAccent(a, RINGACC, true) },
  ç: { strokes: [...c, ...CEDILLA] },
  è: { strokes: withAccent(e, GRAVE, true) }, é: { strokes: withAccent(e, ACUTE, true) },
  ê: { strokes: withAccent(e, CIRC, true) }, ë: { strokes: withAccent(e, DIER, true) },
  ì: { strokes: withAccent([i[0]], GRAVE, true) }, í: { strokes: withAccent([i[0]], ACUTE, true) },
  î: { strokes: withAccent([i[0]], CIRC, true) }, ï: { strokes: withAccent([i[0]], DIER, true) },
  ñ: { strokes: withAccent(n, TILDE, true) },
  ò: { strokes: withAccent(o, GRAVE, true) }, ó: { strokes: withAccent(o, ACUTE, true) },
  ô: { strokes: withAccent(o, CIRC, true) }, õ: { strokes: withAccent(o, TILDE, true) },
  ö: { strokes: withAccent(o, DIER, true) },
  ù: { strokes: withAccent(u, GRAVE, true) }, ú: { strokes: withAccent(u, ACUTE, true) },
  û: { strokes: withAccent(u, CIRC, true) }, ü: { strokes: withAccent(u, DIER, true) },
  ý: { strokes: withAccent(y, ACUTE, true) }, ÿ: { strokes: withAccent(y, DIER, true) },
};

export const NOTDEF = { strokes: [L([110, 0], [490, 0], [490, 700], [110, 700], [110, 0])] };

// Kerning for the proportional voices (mono is fixed-pitch).
export const KERN_PAIRS = {
  AV: -55, AW: -45, AY: -60, AT: -50, AU: -25, Av: -40, Aw: -30, Ay: -40,
  FA: -35, FA_: 0, "F,": -70, "F.": -70,
  LT: -55, LV: -50, LW: -40, LY: -60, "L'": -70, 'L"': -70,
  PA: -35, "P,": -80, "P.": -80,
  Ta: -55, Te: -50, To: -50, Tu: -40, Ts: -45, "T,": -65, "T.": -65, "T:": -40,
  Va: -40, Ve: -35, Vo: -35, "V,": -60, "V.": -60,
  Wa: -30, Wo: -25, "W,": -50, "W.": -50,
  Ya: -55, Ye: -45, Yo: -45, Yu: -35, "Y,": -70, "Y.": -70, "Y:": -45,
  "r,": -45, "r.": -45, "v,": -40, "v.": -40, "w,": -35, "w.": -35,
  "y,": -45, "y.": -45,
  "7,": -50, "7.": -50,
  "'s": -25, '"s': -25,
};