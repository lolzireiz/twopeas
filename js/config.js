// Fill these in tonight after creating the Supabase project.
// While SUPABASE_URL is empty, the app runs in demo mode (both of you on one phone).
export const CONFIG = {
  SUPABASE_URL: 'https://dycsdomqlbzkzoygidwk.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5Y3Nkb21xbGJ6a3pveWdpZHdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ1MTM1ODYsImV4cCI6MjExMDA4OTU4Nn0.NU9mDWjvdlLW173KEBpW03g9lrgF4M_XCz17mBsMdNU',
  VAPID_PUBLIC_KEY: 'BGBDmmWpcwW-HQIahVOtkNfulGaJpOdCkZXJy_0IYAlZEaJm-J3JX_Dgf-gjiT7Agys6g8bLhbtJFVBmGoYpq-c',
};

export const APP_VERSION = '1.4.0';
export const APP_BUILD = '20261113034334';

export const WHATS_NEW = [
  { v: '1.4.0', date: '2026-11-12', notes: [
    'Dark mode, 10 themes, background patterns, fonts and text sizes (Settings, Look & feel)',
    'Peadle: the same 5-letter word for both of you every day, with head-to-head stats',
    'Swipe & match: 7 decks (dates, food, places, movies, shows, things to do, trips) plus your own cards',
    'Food preferences: allergies, diet and spice, so food picks stay safe for both of you, plus an allergy card for servers',
    'A cheat sheet with your favorites, so your person always knows your order',
    'A real date wheel you can spin together',
    'Shared habits that make your pet happy',
    'Wrapped: weekly, monthly, and a big yearly one on New Year\'s Eve',
  ] },
  { v: '1.3.7', date: '2026-11-12', notes: ['Scoreboard fixed: Would you rather now counts as a win for whoever guessed the other better (your past games count too)', 'Draw & Guess counts as team wins'] },
  { v: '1.3.6', date: '2026-11-12', notes: ['Draw & Guess: category hint, letter blanks, a letter revealed after each wrong guess, 🔥 when you are close, 5 guesses, and the artist can add a clue', 'Taps can no longer be spammed (same tap once every 3 minutes)'] },
  { v: '1.3.5', date: '2026-11-12', notes: ["Daily snap has its own camera: your selfie comes out exactly like the preview, no more flipping"] },
  { v: '1.3.4', date: '2026-11-12', notes: ['Daily snap: preview your photo first and tap ↔️ Flip if it is mirrored (it remembers your choice)', 'You can also flip a snap after sending it'] },
  { v: '1.3.3', date: '2026-11-12', notes: ["If the service behind Two Peas has an outage, the app now says so (instead of looking broken) and reopens by itself when it's fixed"] },
  { v: '1.3.2', date: '2026-11-12', notes: ['Fixed: getting stuck on "Load failed" after being signed out', 'Faster, more reliable startup'] },
  { v: '1.3.1', date: '2026-11-12', notes: ['210 new Would you rather questions (270 total)', 'Pick a category: silly, about us, food, travel, superpowers, flirty, deep, life', 'Write your own questions', 'No repeats until you have played them all'] },
  {
    v: '1.3.0',
    date: '2026-11-12',
    notes: [
      'See when your person is in the app, and what they are doing 🟢',
      "Drawing is live: watch each other's strokes as you draw",
      'Daily snap: one photo each, unlocks when you have both sent one 📷',
      'Chat: voice notes (hold 🎙️), photos, replies, reactions, typing dots',
      'Drawing: stamps, backgrounds, ideas to draw, save as a wallpaper',
      'Send the pet to visit with a message, and play with toys 🎾',
      'A cleaner Home screen',
    ],
  },
  { v: '1.2.0', date: '2026-11-12', notes: ['Two Peas is live for both of you! 💚', 'Update banner when there is a new version', 'Monthly reminder to back up to iCloud Drive'] },
  {
    v: '1.1.0',
    date: '2026-11-12',
    notes: [
      'Feed your pet! Every 10 love points makes a snack',
      'Your pet now notices things and nudges you toward each other',
      'New game: Word Hunt. Same board, 80 seconds each',
      'Would you rather: now you also guess what they will pick',
      'Love jar: collect little things you love about each other',
      'Sticker book with 30 stickers to earn together',
      'Your pet sleeps at night, plus a weekly recap in Us',
    ],
  },
  {
    v: '1.0.0',
    date: '2026-11-12',
    notes: [
      'Two Peas is born! 🌱',
      'Raise a pet together and decorate its room',
      'Daily questions, games, memories, dates, lists, notes and letters',
      'Notifications when your person does something for you',
    ],
  },
];
