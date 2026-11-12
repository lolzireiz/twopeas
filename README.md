# Two Peas 🌱

A private home-screen app for two: a pet you raise together, daily questions, games, memories, date planning, shared lists, notes, letters, drawing, and notifications.

- **App:** plain HTML, CSS and JavaScript modules, hosted on GitHub Pages. No build step.
- **Sync:** Supabase (free tier): Postgres with row-level security, live updates, photo storage.
- **Notifications:** Web Push from a Supabase Edge Function (`supabase/functions/notify`), plus a 30-minute timer for reminders.
- **Demo mode:** with `SUPABASE_URL` empty in `js/config.js`, everything runs on one phone and you can switch between both people.

See [SETUP.md](SETUP.md) to go live.

## Layout

| Path | What |
| --- | --- |
| `index.html`, `sw.js`, `manifest.webmanifest` | App shell, offline cache, push handler |
| `js/store.js` | Data layer (demo + Supabase) |
| `js/logic.js` | Points, levels, pet mood, streaks, daily question, challenges |
| `js/content.js` | Questions, would-you-rather, date ideas, challenges, shop |
| `js/pet.js` | Pet and room art (SVG) |
| `js/views/` | Screens |
| `supabase/` | Database setup, timer, notification function |
