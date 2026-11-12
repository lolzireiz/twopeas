// Daily photo swap: you each send one photo a day. Theirs unlocks when yours is in.
import { store } from '../store.js';
import { award, today } from '../logic.js';
import { header, themName, meName, photoImg, empty, presencePill } from '../ui.js';
import { esc, fmtDay, toast, confetti, compressImage, lsGet, lsSet, addDays } from '../util.js';
import { bus } from '../bus.js';
import { openCamera } from '../camera.js';

export const snapId = (d, who) => `snap-${d}-${who}`;
const myName = () => store.mine.name || 'Your person';

export function snapStatus(d = today()) {
  return { mine: store.get(snapId(d, store.me)), theirs: store.get(snapId(d, store.partnerId)) };
}

// A photo waiting to be sent, so you can flip it first (front-camera selfies come out mirrored).
let pending = null;
const FLIP_KEY = 'twopeas-snap-flip';

async function sendSnap(d, file, flip, caption) {
  const demo = store.mode === 'demo';
  const { blob, dataUrl } = await compressImage(file, demo ? 720 : 1440, demo ? 0.6 : 0.8, flip);
  const photo = await store.uploadPhoto(blob, dataUrl);
  await store.add('snap', { photo, caption, date: d }, { id: snapId(d, store.me), once: true });
  if (store.get(snapId(d, store.partnerId))) {
    await award(10, 'snap', `snap-${d}`);
    store.notify('memory', '📷 Both snaps are in!', `See what ${myName()} sent today`, '#/snap');
  } else {
    store.notify('memory', `📷 ${myName()} sent today's snap`, 'Send yours to unlock it', '#/snap');
  }
}

// Flip a snap you already sent.
async function flipSent(it) {
  const url = await store.photoUrl(it.data.photo);
  const blob = await fetch(url).then((r) => r.blob());
  const demo = store.mode === 'demo';
  const out = await compressImage(blob, demo ? 720 : 1440, demo ? 0.6 : 0.85, true);
  const photo = await store.uploadPhoto(out.blob, out.dataUrl);
  await store.update(it.id, { photo });
}

const PROMPTS = ['What you see right now', 'Your outfit today', 'What you are eating', 'Something that made you smile', 'Your view', 'A selfie, no retakes', 'Something you think I would like', 'Your favorite thing today'];

export function snap() {
  const d = today();
  const { mine, theirs } = snapStatus(d);
  const prompt = PROMPTS[Math.floor(Date.parse(d) / 864e5) % PROMPTS.length];
  const both = mine && theirs;
  const seenKey = 'twopeas-snap-reveal';
  if (both && lsGet(seenKey) !== d) { lsSet(seenKey, d); setTimeout(() => confetti(50), 150); }
  const pic = (it, who, cls) => `<div class="snap-pic ${cls}">${photoImg(it.data.photo)}<div class="snap-cap"><b>${who}</b>${it.data.caption ? ` · ${esc(it.data.caption)}` : ''}</div></div>`;
  let body;
  if (!mine && pending) {
    body = `<div class="snap-pic me"><img src="${pending.url}" alt="" style="${pending.flip ? 'transform:scaleX(-1)' : ''}"></div>
      <div class="sp"></div>
      <input type="text" data-input="snapCap" maxlength="80" placeholder="Add a caption (optional)">
      <div class="sp"></div>
      <div class="row gap"><button class="btn ghost grow" data-act="flip">↔️ Flip</button><button class="btn ghost grow" data-act="camera">🔁 Retake</button></div>
      <div class="sp"></div><button class="btn block" data-act="sendSnap">Send to ${themName()} 📷</button>`;
  } else if (!mine) {
    body = `<div class="card center">
      <div style="font-size:46px">📷</div><h2>Today's snap</h2>
      <p class="muted">${theirs ? `<b>${themName()} already sent theirs.</b> Send yours to see it!` : `Send one photo today. ${themName()}'s unlocks once you've both sent one.`}</p>
      <div class="sp"></div><div class="pill">💡 Idea: ${prompt}</div><div class="sp2"></div>
      <button class="btn block" data-act="camera">📸 Open camera</button><div class="sp"></div>
      <label class="btn ghost block" style="position:relative">🖼️ Choose a photo<input type="file" accept="image/*" data-change="snapPhoto" style="position:absolute;inset:0;opacity:0"></label>
    </div>`;
  } else if (!theirs) {
    body = `${pic(mine, 'You', 'me')}<div class="sp"></div><button class="btn ghost block" data-act="flipMine">↔️ Flip my photo</button>
      <div class="locked" style="margin-top:12px">🔒 <span>${themName()}'s snap shows up here as soon as they send it. We'll let them know.</span></div>`;
  } else {
    body = `<div class="snap-pair">${pic(mine, 'You', 'me')}${pic(theirs, themName(), 'them')}</div><div class="sp"></div><button class="btn ghost block" data-act="flipMine">↔️ Flip my photo</button>`;
  }
  const past = [];
  for (let i = 1; i <= 21; i++) {
    const k = addDays(d, -i);
    const s = snapStatus(k);
    if (s.mine || s.theirs) past.push({ k, ...s });
  }
  return {
    html: `${header('Daily snap', { back: '#/home', sub: presencePill() })}
      ${body}
      ${past.length ? `<div class="section-title">Past snaps</div>
        <div class="snap-hist">${past.map((p) => `<div class="snap-day"><div class="tiny muted bold">${fmtDay(p.k)}</div><div class="snap-two">
          ${p.mine ? photoImg(p.mine.data.photo) : '<div class="snap-miss">—</div>'}
          ${p.theirs && p.mine ? photoImg(p.theirs.data.photo) : p.theirs ? '<div class="snap-miss">🔒</div>' : '<div class="snap-miss">—</div>'}
        </div></div>`).join('')}</div>` : ''}`,
    actions: {
      flip: () => { pending.flip = !pending.flip; if (!pending.cam) lsSet(FLIP_KEY, pending.flip); return true; },
      camera: async () => {
        const blob = await openCamera();
        if (!blob) return;
        if (pending) URL.revokeObjectURL(pending.url);
        pending = { file: blob, url: URL.createObjectURL(blob), flip: false, cam: true };
        return true;
      },
      sendSnap: async (x, el) => {
        el.disabled = true;
        el.textContent = 'Sending…';
        const caption = (document.querySelector('[data-input="snapCap"]')?.value || '').trim();
        try {
          await sendSnap(d, pending.file, pending.flip, caption);
          URL.revokeObjectURL(pending.url);
          pending = null;
        } catch (e) { toast(`Couldn't send: ${esc(e.message)}`); el.disabled = false; el.textContent = 'Try again'; return; }
        return true;
      },
      flipMine: async (x, el) => {
        el.disabled = true;
        el.textContent = 'Flipping…';
        try { await flipSent(mine); } catch (e) { toast(`Couldn't flip: ${esc(e.message)}`); }
        bus.rerender();
      },
    },
    changes: {
      snapPhoto: (files) => {
        const f = files?.[0];
        if (!f) return;
        if (pending) URL.revokeObjectURL(pending.url);
        pending = { file: f, url: URL.createObjectURL(f), flip: !!lsGet(FLIP_KEY) };
        return true;
      },
    },
  };
}
