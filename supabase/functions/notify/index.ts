// Two Peas notification sender (Supabase Edge Function).
// 1. The app calls it when you do something for your partner -> pushes to their phone.
// 2. A timer calls it every 30 minutes (with CRON_SECRET) -> daily reminders, unlocks, countdowns.
import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const CRON_SECRET = Deno.env.get('CRON_SECRET') ?? '';
webpush.setVapidDetails(
  Deno.env.get('VAPID_SUBJECT') ?? 'mailto:twopeas@example.com',
  Deno.env.get('VAPID_PUBLIC_KEY')!,
  Deno.env.get('VAPID_PRIVATE_KEY')!,
);
const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
const clip = (s: unknown, n: number) => String(s ?? '').slice(0, n);

type Msg = { type: string; title: string; body?: string; url?: string };
type Item = { id: string; kind: string; data: any; created_by: string; created_at: string; updated_at: string };

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  try {
    const body = await req.json().catch(() => ({}));
    if (body.cron) {
      if (!CRON_SECRET || req.headers.get('x-cron-secret') !== CRON_SECRET) return json({ error: 'forbidden' }, 403);
      return json({ ok: true, sent: await runSchedule() });
    }
    const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
    const { data: { user } } = await db.auth.getUser(token);
    if (!user) return json({ error: 'not signed in' }, 401);
    const { data: me } = await db.from('members').select('couple_id').eq('user_id', user.id).single();
    if (!me) return json({ error: 'not paired' }, 400);
    const { data: mems } = await db.from('members').select('user_id').eq('couple_id', me.couple_id);
    const partner = (mems ?? []).find((m) => m.user_id !== user.id)?.user_id;
    if (!partner) return json({ ok: true, skipped: 'no partner yet' });
    const sent = await sendTo(me.couple_id, partner, {
      type: clip(body.type || 'note', 20), title: clip(body.title, 120), body: clip(body.body, 240), url: clip(body.url || '#/home', 200),
    });
    return json({ ok: true, sent });
  } catch (e) {
    console.error(e);
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});

// ---------- Time helpers (each person's own time zone) ----------
function local(tz: string) {
  const now = new Date();
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', weekday: 'short', hour12: false,
  }).formatToParts(now).map((p) => [p.type, p.value]));
  const hour = Number(parts.hour) % 24;
  return { date: `${parts.year}-${parts.month}-${parts.day}`, hour, minute: Number(parts.minute), weekday: parts.weekday };
}
const inQuiet = (h: number, q: number[] = [23, 8]) => (q[0] > q[1] ? h >= q[0] || h < q[1] : h >= q[0] && h < q[1]);
const addDays = (d: string, n: number) => {
  const x = new Date(`${d}T12:00:00Z`);
  x.setUTCDate(x.getUTCDate() + n);
  return x.toISOString().slice(0, 10);
};

async function profileOf(coupleId: string, userId: string) {
  const { data } = await db.from('items').select('data').eq('couple_id', coupleId).eq('id', `profile-${userId}`).maybeSingle();
  return (data?.data ?? {}) as { name?: string; tz?: string; prefs?: { quiet?: number[]; off?: Record<string, boolean> } };
}

// ---------- Sending ----------
async function sendTo(coupleId: string, userId: string, msg: Msg, opts: { scheduled?: boolean } = {}) {
  const p = await profileOf(coupleId, userId);
  if (p.prefs?.off?.[msg.type]) return 0;
  const { hour } = local(p.tz || 'America/New_York');
  if (msg.type !== 'tap' && !opts.scheduled && inQuiet(hour, p.prefs?.quiet)) return 0;
  const { data: subs } = await db.from('push_subs').select('endpoint, sub').eq('user_id', userId);
  let n = 0;
  for (const s of subs ?? []) {
    try {
      await webpush.sendNotification(s.sub, JSON.stringify({ ...msg, tag: msg.type }), { TTL: 60 * 60 * 12 });
      n++;
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) await db.from('push_subs').delete().eq('endpoint', s.endpoint);
      else console.warn('push failed', code, (e as Error).message);
    }
  }
  return n;
}

// Send once per key (so the 30-minute timer never repeats itself).
async function once(key: string, coupleId: string, userId: string, msg: Msg) {
  const { data, error } = await db.from('sent_log').upsert({ key }, { onConflict: 'key', ignoreDuplicates: true }).select();
  if (error || !data?.length) return 0;
  return sendTo(coupleId, userId, msg, { scheduled: true });
}

// ---------- Scheduled nudges ----------
async function runSchedule() {
  let sent = 0;
  const { data: couples } = await db.from('couples').select('id');
  for (const c of couples ?? []) {
    try { sent += await scheduleCouple(c.id); } catch (e) { console.error('couple', c.id, e); }
  }
  // tidy up old keys
  await db.from('sent_log').delete().lt('at', new Date(Date.now() - 60 * 864e5).toISOString());
  return sent;
}

async function scheduleCouple(cid: string) {
  const { data: mems } = await db.from('members').select('user_id').eq('couple_id', cid);
  if (!mems || mems.length < 2) return 0;
  const { data: rows } = await db.from('items').select('id, kind, data, created_by, created_at, updated_at')
    .eq('couple_id', cid).in('kind', ['profile', 'couple', 'dqa', 'letter', 'countdown', 'memory', 'plan']).limit(5000);
  const items = (rows ?? []) as Item[];
  const byId = new Map(items.map((i) => [i.id, i]));
  const couple = byId.get('couple')?.data ?? {};
  const petName = couple.pet?.name ?? 'Your pet';
  const { data: lastRow } = await db.from('items').select('updated_at').eq('couple_id', cid)
    .not('kind', 'in', '(profile,couple,dq,pts)').order('updated_at', { ascending: false }).limit(1).maybeSingle();
  const lastActive = lastRow ? Date.parse(lastRow.updated_at) : Date.parse(byId.get('couple')?.created_at ?? new Date().toISOString());

  let sent = 0;
  for (const m of mems) {
    const me = m.user_id;
    const other = mems.find((x) => x.user_id !== me)!.user_id;
    const prof = byId.get(`profile-${me}`)?.data ?? {};
    const otherName = byId.get(`profile-${other}`)?.data?.name ?? 'Your person';
    const t = local(prof.tz || 'America/New_York');
    const D = t.date;
    const md = D.slice(5);
    const k = (what: string) => `${cid}:${me}:${what}:${D}`;
    const answered = (who: string, d: string) => byId.has(`dqa-${d}-${who}`);

    // 9am: question of the day, unlocks, special days, weekly challenge
    if (t.hour >= 9 && t.hour < 12) {
      sent += await once(k('dq-ready'), cid, me, { type: 'daily', title: "Today's question is ready 💭", body: "Answer it to unlock each other's answers", url: '#/dq' });
      for (const l of items.filter((i) => i.kind === 'letter' && i.data.to === me && i.data.unlock === D && !i.data.openedAt)) {
        sent += await once(`${cid}:${me}:letter:${l.id}`, cid, me, { type: 'note', title: `✉️ A letter from ${otherName} just unlocked`, body: l.data.label, url: '#/letters' });
      }
      for (const c of items.filter((i) => i.kind === 'countdown')) {
        const due = c.data.yearly ? c.data.date?.slice(5) === md : c.data.date === D;
        if (due) sent += await once(`${cid}:${me}:cd:${c.id}:${D}`, cid, me, { type: 'special', title: `${c.data.emoji ?? '🎉'} ${c.data.title} is today!`, url: '#/countdowns' });
      }
      if (couple.startDate && couple.startDate.slice(5) === md && couple.startDate < D) {
        const years = Number(D.slice(0, 4)) - Number(couple.startDate.slice(0, 4));
        sent += await once(k('anniv'), cid, me, { type: 'special', title: '💚 Happy anniversary!', body: `${years} year${years > 1 ? 's' : ''} of you two`, url: '#/countdowns' });
      }
      const otd = items.find((i) => i.kind === 'memory' && i.data.date?.slice(5) === md && i.data.date < D);
      if (otd) sent += await once(k('otd'), cid, me, { type: 'special', title: '📸 On this day', body: otd.data.caption || 'A memory from a past year', url: '#/memories' });
      for (const p of items.filter((i) => i.kind === 'plan' && !i.data.done && i.data.when?.slice(0, 10) === D)) {
        sent += await once(`${cid}:${me}:plan:${p.id}`, cid, me, { type: 'special', title: `📅 Date day: ${p.data.title}`, body: p.data.when.length > 10 ? `Today at ${p.data.when.slice(11, 16)}` : 'Today!', url: '#/dates' });
      }
      if (t.weekday === 'Mon') sent += await once(k('challenge'), cid, me, { type: 'challenge', title: '🏆 New weekly challenge', body: 'See what this week has in store for you two', url: '#/challenge' });
    }

    // 8pm: haven't answered today's question
    if (t.hour >= 20 && t.hour < 23 && !answered(me, D)) {
      sent += await once(k('dq-remind'), cid, me, {
        type: 'daily',
        title: answered(other, D) ? `${otherName} answered today's question 👀` : "Don't forget today's question 💭",
        body: answered(other, D) ? 'Answer yours to see what they said' : 'It only takes a minute',
        url: '#/dq',
      });
    }

    // 9:30pm: streak about to break
    if ((t.hour === 21 && t.minute >= 30) || t.hour === 22) {
      let streak = 0;
      for (let d = addDays(D, -1); answered(me, d) && answered(other, d); d = addDays(d, -1)) streak++;
      if (streak >= 2 && !(answered(me, D) && answered(other, D))) {
        sent += await once(k('streak'), cid, me, { type: 'daily', title: `🔥 Your ${streak}-day streak ends at midnight`, body: "Answer today's question together to keep it", url: '#/dq' });
      }
    }

    // Pet misses you (once per quiet spell, daytime only)
    if (Date.now() - lastActive > 72 * 36e5 && t.hour >= 11 && t.hour < 20) {
      sent += await once(`${cid}:${me}:sad:${new Date(lastActive).toISOString().slice(0, 10)}`, cid, me, { type: 'pet', title: `🥺 ${petName} misses you both`, body: 'One little activity will cheer them up', url: '#/home' });
    }
  }
  return sent;
}
