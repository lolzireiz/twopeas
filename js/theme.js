// Looks: light/dark mode, color themes, background patterns, fonts and sizes.
// Saved on this phone (so it applies instantly on launch) and in your profile (so it
// follows you, and your person can copy it).
import { lsGet, lsSet } from './util.js';

const KEY = 'twopeas-look';

// Each theme has a light and a dark palette.
export const THEMES = [
  { id: 'cozy', name: 'Cozy cream', e: '🫛',
    light: { bg: '#fff8f0', card: '#ffffff', ink: '#3d3833', muted: '#958b80', line: '#f1e6da', soft: '#fbf1e6', pea: '#7cb66b', peaDark: '#5f9f44' },
    dark: { bg: '#1b1815', card: '#272320', ink: '#f4ede5', muted: '#a89c8f', line: '#38322c', soft: '#302b26', pea: '#8cc77a', peaDark: '#a6d996' } },
  { id: 'sakura', name: 'Sakura', e: '🌸',
    light: { bg: '#fff3f6', card: '#ffffff', ink: '#4a2f38', muted: '#a3828c', line: '#f8dbe3', soft: '#fde9ef', pea: '#e9799a', peaDark: '#cf5b7d' },
    dark: { bg: '#1f1418', card: '#2d1e24', ink: '#fbe9ee', muted: '#bb95a1', line: '#432c35', soft: '#38252d', pea: '#f08aa8', peaDark: '#ffb3c8' } },
  { id: 'matcha', name: 'Matcha', e: '🍵',
    light: { bg: '#f2f7ec', card: '#ffffff', ink: '#2f3a2a', muted: '#7f8f76', line: '#dfead5', soft: '#e8f1df', pea: '#6aa452', peaDark: '#4f8a39' },
    dark: { bg: '#131a12', card: '#1d261b', ink: '#e8f2e2', muted: '#94a78a', line: '#2d3a2a', soft: '#243022', pea: '#86c06d', peaDark: '#a9d993' } },
  { id: 'ocean', name: 'Ocean', e: '🌊',
    light: { bg: '#eef6fb', card: '#ffffff', ink: '#233746', muted: '#7891a3', line: '#d6e7f2', soft: '#e3f0f8', pea: '#4c9fd6', peaDark: '#2f83bd' },
    dark: { bg: '#0d1822', card: '#16242f', ink: '#e3f0f9', muted: '#8aa5b8', line: '#253744', soft: '#1c2d3a', pea: '#5fb3ea', peaDark: '#94cff5' } },
  { id: 'lavender', name: 'Lavender', e: '💜',
    light: { bg: '#f6f2fd', card: '#ffffff', ink: '#3a3150', muted: '#8f86a6', line: '#e6def6', soft: '#eee8fa', pea: '#9a7de0', peaDark: '#7d5fc9' },
    dark: { bg: '#17141f', card: '#221e2d', ink: '#efeafc', muted: '#a49cbb', line: '#352f45', soft: '#2a2538', pea: '#ae95ee', peaDark: '#cbbaf7' } },
  { id: 'sunset', name: 'Sunset', e: '🌅',
    light: { bg: '#fff3ea', card: '#ffffff', ink: '#46302a', muted: '#a68779', line: '#f8dfd1', soft: '#fde8dc', pea: '#ef8354', peaDark: '#d6663a' },
    dark: { bg: '#1d1310', card: '#2b1d18', ink: '#fdeee6', muted: '#bf9c8d', line: '#432e26', soft: '#36251e', pea: '#f5935f', peaDark: '#ffbb94' } },
  { id: 'midnight', name: 'Midnight', e: '🌙',
    light: { bg: '#eef0fb', card: '#ffffff', ink: '#262a45', muted: '#7d82a6', line: '#dcdff3', soft: '#e6e8f8', pea: '#6c7ee6', peaDark: '#4f61cc' },
    dark: { bg: '#0b0e1c', card: '#151a2e', ink: '#e7e9ff', muted: '#8e94bd', line: '#252b47', soft: '#1c2139', pea: '#8597ff', peaDark: '#b3bfff' } },
  { id: 'cocoa', name: 'Cocoa', e: '☕',
    light: { bg: '#f7efe6', card: '#fffdfa', ink: '#3e2c22', muted: '#9a8473', line: '#eadccd', soft: '#f1e5d8', pea: '#b9774a', peaDark: '#9a5d33' },
    dark: { bg: '#18120e', card: '#241b15', ink: '#f5e9de', muted: '#ae9985', line: '#3a2d23', soft: '#2e231b', pea: '#cf9064', peaDark: '#e8b48d' } },
  { id: 'mint', name: 'Mint', e: '🍃',
    light: { bg: '#effaf6', card: '#ffffff', ink: '#24403a', muted: '#76988f', line: '#d5eee6', soft: '#e2f4ee', pea: '#3fb59a', peaDark: '#279a80' },
    dark: { bg: '#0e1a17', card: '#172622', ink: '#e1f6f0', muted: '#87aaa1', line: '#26393a', soft: '#1d302b', pea: '#52c9ad', peaDark: '#8be0cb' } },
  { id: 'berry', name: 'Berry', e: '🍓',
    light: { bg: '#fdf1f3', card: '#ffffff', ink: '#45222b', muted: '#a07d86', line: '#f3d8de', soft: '#f9e5e9', pea: '#d64b6a', peaDark: '#b8304f' },
    dark: { bg: '#1c0f13', card: '#2a161c', ink: '#fce8ed', muted: '#be8f9b', line: '#43242d', soft: '#351c23', pea: '#ec6683', peaDark: '#ff9db2' } },
];

export const PATTERNS = [
  { id: 'none', name: 'Plain' },
  { id: 'dots', name: 'Dots' },
  { id: 'hearts', name: 'Hearts' },
  { id: 'peas', name: 'Peas' },
  { id: 'stars', name: 'Stars' },
  { id: 'grid', name: 'Grid paper' },
];

export const FONTS = [
  { id: 'rounded', name: 'Rounded', css: "ui-rounded, 'SF Pro Rounded', 'Nunito', system-ui, -apple-system, sans-serif" },
  { id: 'clean', name: 'Clean', css: "-apple-system, 'SF Pro Text', system-ui, 'Segoe UI', sans-serif" },
  { id: 'storybook', name: 'Storybook', css: "'New York', ui-serif, Georgia, 'Times New Roman', serif" },
  { id: 'notebook', name: 'Notebook', css: "'Chalkboard SE', 'Comic Sans MS', 'Marker Felt', ui-rounded, cursive" },
  { id: 'typewriter', name: 'Typewriter', css: "'American Typewriter', 'Courier New', ui-monospace, monospace" },
];

export const SIZES = [['s', 'Small', 0.93], ['m', 'Normal', 1], ['l', 'Large', 1.08], ['xl', 'Extra large', 1.16]];
export const CORNERS = [['square', 'Crisp', 12], ['soft', 'Soft', 22], ['round', 'Bubbly', 30]];

export const DEFAULT_LOOK = { mode: 'auto', theme: 'cozy', pattern: 'none', font: 'rounded', size: 'm', corners: 'soft', motion: true, ownColorAccent: false };

export function getLook() { return { ...DEFAULT_LOOK, ...(lsGet(KEY) || {}) }; }
export function saveLook(look) { lsSet(KEY, look); applyLook(look); }

const media = window.matchMedia?.('(prefers-color-scheme: dark)');
export const isDark = (look = getLook()) => look.mode === 'dark' || (look.mode === 'auto' && !!media?.matches);

function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

function patternCss(id, color, dark) {
  const c = encodeURIComponent(hexA(color, dark ? 0.16 : 0.13));
  const svg = {
    hearts: `<svg xmlns='http://www.w3.org/2000/svg' width='56' height='56'><path fill='${c}' d='M14 22c-5-4-8-6-8-10a4 4 0 0 1 8-1 4 4 0 0 1 8 1c0 4-3 6-8 10zM42 50c-4-3-6-5-6-8a3 3 0 0 1 6-1 3 3 0 0 1 6 1c0 3-2 5-6 8z'/></svg>`,
    peas: `<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64'><g fill='${c}'><circle cx='12' cy='14' r='5'/><circle cx='22' cy='14' r='5'/><circle cx='44' cy='46' r='5'/><circle cx='54' cy='46' r='5'/></g></svg>`,
    stars: `<svg xmlns='http://www.w3.org/2000/svg' width='70' height='70'><g fill='${c}'><path d='M16 8l2 5 5 .5-4 3.5 1.2 5L16 19l-4.2 3 1.2-5-4-3.5 5-.5z'/><circle cx='50' cy='20' r='1.6'/><circle cx='38' cy='52' r='2'/><path d='M56 44l1.3 3 3 .3-2.4 2 .8 3-2.7-1.7-2.7 1.7.8-3-2.4-2 3-.3z'/><circle cx='10' cy='56' r='1.4'/></g></svg>`,
  }[id];
  if (id === 'dots') return `radial-gradient(${hexA(color, dark ? 0.2 : 0.16)} 1.6px, transparent 1.8px) 0 0 / 22px 22px`;
  if (id === 'grid') return `linear-gradient(${hexA(color, 0.1)} 1px, transparent 1px) 0 0 / 24px 24px, linear-gradient(90deg, ${hexA(color, 0.1)} 1px, transparent 1px) 0 0 / 24px 24px`;
  if (svg) return `url("data:image/svg+xml,${svg.replace(/'/g, '%27').replace(/</g, '%3C').replace(/>/g, '%3E').replace(/#/g, '%23')}")`;
  return 'none';
}

export function previewPattern(id) {
  const look = getLook();
  const t = THEMES.find((x) => x.id === look.theme) || THEMES[0];
  const dark = isDark(look);
  return patternCss(id, (dark ? t.dark : t.light).pea, dark);
}

let accentOverride = null; // your own color, if you choose to use it as the accent
export function setAccentOverride(hex) { accentOverride = hex; applyLook(); }

export function applyLook(look = getLook()) {
  const t = THEMES.find((x) => x.id === look.theme) || THEMES[0];
  const dark = isDark(look);
  const p = dark ? t.dark : t.light;
  const accent = look.ownColorAccent && accentOverride ? accentOverride : p.pea;
  const root = document.documentElement;
  const r = root.style;
  r.setProperty('--bg', p.bg);
  r.setProperty('--card', p.card);
  r.setProperty('--ink', p.ink);
  r.setProperty('--muted', p.muted);
  r.setProperty('--line', p.line);
  r.setProperty('--soft', p.soft);
  r.setProperty('--pea', accent);
  r.setProperty('--pea-dark', look.ownColorAccent && accentOverride ? `color-mix(in srgb, ${accent} 78%, ${dark ? '#fff' : '#000'})` : p.peaDark);
  r.setProperty('--glass', hexA(p.card, dark ? 0.86 : 0.92));
  r.setProperty('--shadow', dark ? '0 6px 22px rgba(0,0,0,.35), 0 1px 3px rgba(0,0,0,.3)' : '0 6px 22px rgba(120, 88, 56, 0.08), 0 1px 3px rgba(120, 88, 56, 0.06)');
  r.setProperty('--pattern', patternCss(look.pattern, accent, dark));
  r.setProperty('--font', (FONTS.find((f) => f.id === look.font) || FONTS[0]).css);
  r.setProperty('--zoom', String((SIZES.find((s) => s[0] === look.size) || SIZES[1])[2]));
  r.setProperty('--radius', `${(CORNERS.find((c) => c[0] === look.corners) || CORNERS[1])[2]}px`);
  root.dataset.mode = dark ? 'dark' : 'light';
  root.dataset.theme = t.id;
  root.classList.toggle('calm', !look.motion);
  root.style.colorScheme = dark ? 'dark' : 'light';
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = p.bg;
}

media?.addEventListener?.('change', () => { if (getLook().mode === 'auto') { applyLook(); window.dispatchEvent(new Event('twopeas-look')); } });

applyLook();
