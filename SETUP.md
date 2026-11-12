# Two Peas: going live

About 30 minutes, once. Everything stays on free plans.

## 1. Supabase (the shared database)

1. Go to supabase.com, sign in with GitHub, and create a new project named `two-peas` (region: East US). Save the database password somewhere safe.
2. **Authentication > Sign In / Providers > Email**: turn **off** "Confirm email" so sign-up works right inside the app.
3. **SQL Editor > New query**: paste all of `supabase/schema.sql` and press **Run**. It should say "Success".
4. **Project Settings > API**: copy the **Project URL** and the **anon public** key into `js/config.js`.

## 2. Notifications

1. Generate the notification keys (Claude does this): a public key, a private key, and a random cron secret.
2. Put the public key in `js/config.js` as `VAPID_PUBLIC_KEY`.
3. **Edge Functions > Secrets**: add
   - `VAPID_PUBLIC_KEY` = the public key
   - `VAPID_PRIVATE_KEY` = the private key (never put this one in the app)
   - `VAPID_SUBJECT` = `mailto:you@example.com`
   - `CRON_SECRET` = the random secret
4. **Edge Functions > Deploy a new function > Via editor**: name it `notify`, paste `supabase/functions/notify/index.ts`, deploy.
5. Open the `notify` function's settings and turn **off** "Enforce JWT verification" (the function checks who you are itself, and the timer needs to reach it).
6. **SQL Editor**: open `supabase/cron.sql`, replace `YOUR-PROJECT-REF` (the part before `.supabase.co` in your URL) and `YOUR-CRON-SECRET`, then Run.

## 3. GitHub Pages (the app itself)

1. Create a **public** repo named `twopeas` on github.com (no README).
2. Give the Claude GitHub App access to it, then Claude pushes the code.
3. **Repo Settings > Pages**: Source "Deploy from a branch", branch `main`, folder `/ (root)`. Save.
4. After a minute the app is at `https://lolzireiz.github.io/twopeas/`.

## 4. Both phones

1. Open the link in **Safari**, tap **Share > Add to Home Screen**, then open Two Peas from the new icon.
2. You: "New here", make an account, tap **Create our space**, pick your name and color. Send her the 6-letter code.
3. Her: same, but tap **Join** and enter the code.
4. Pick your start date and your pet together.
5. Each of you taps **Turn on notifications** on the home screen.
6. Send a thinking-of-you tap each way to test.

## Updating later

Push to `main`; both phones pick up the new version the next time the app opens (Settings > Check for updates forces it). Bump `APP_VERSION` and add notes to `WHATS_NEW` in `js/config.js` so you both see what changed.
