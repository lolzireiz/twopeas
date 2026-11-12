// Chat-style notes: text, photos, voice notes, replies, reactions, typing indicator.
import { store } from '../store.js';
import { awardCapped } from '../logic.js';
import { header, themName, nameOf, photoImg, notesSeg, presencePill } from '../ui.js';
import { esc, timeAgo, fmtDay, fmtTime, sheet, toast, floatHearts, dayKey, compressImage, confirmSheet } from '../util.js';
import { bus } from '../bus.js';

const REACTS = ['❤️', '😂', '🥹', '🔥', '👍', '😮'];
const myName = () => store.mine.name || 'Your person';
let replyTo = null;
let lastCount = -1;
let lastTyping = 0;

// One audio player for the whole app so a redraw never cuts a voice note off.
const player = new Audio();
let playing = null;
player.addEventListener('ended', () => { playing = null; document.querySelectorAll('.voice.on').forEach((b) => b.classList.remove('on')); });
const fmtDur = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;

function snippet(n) {
  if (!n) return 'a deleted note';
  if (n.data.audio) return '🎙️ Voice note';
  if (n.data.photo && !n.data.text) return '📷 Photo';
  return esc((n.data.text || '').slice(0, 80));
}

function bubble(n, prevBy) {
  const mine = n.by === store.me;
  const cls = mine ? 'me' : 'them';
  const d = n.data;
  const r = store.get(d.replyTo);
  const reacts = Object.entries(d.reacts || {}).filter(([, e]) => e);
  let body = '';
  if (r) body += `<div class="reply-quote">${r.by === store.me ? 'You' : nameOf(r.by)}: ${snippet(r)}</div>`;
  if (d.photo) body += `<div class="note-photo">${photoImg(d.photo)}</div>`;
  if (d.audio) {
    body += `<button class="voice ${playing === n.id ? 'on' : ''}" data-act="play" data-id="${n.id}" data-audio="${esc(d.audio)}">
      <span class="vp">▶</span><span class="bars">${Array.from({ length: 18 }, (_, i) => `<i style="height:${6 + ((i * 7 + d.dur * 3) % 13)}px"></i>`).join('')}</span><span class="vd">${fmtDur(d.dur || 0)}</span></button>`;
  }
  if (d.text) body += `<div class="note-text">${esc(d.text)}</div>`;
  return `<div class="note-wrap ${cls} ${prevBy === n.by ? 'cont' : ''}">
    <div class="note ${cls} ${d.photo && !d.text ? 'pic' : ''}" data-act="menu" data-id="${n.id}">${body}</div>
    ${reacts.length ? `<div class="reacts-pill ${cls}">${reacts.map(([, e]) => e).join('')}</div>` : ''}
  </div>`;
}

export function notes() {
  const list = store.all('note');
  let lastDay = '';
  let prevBy = null;
  let prevAt = 0;
  const items = list.map((n) => {
    const day = dayKey(new Date(n.at));
    let sep = '';
    if (day !== lastDay) { sep = `<div class="chat-sep">${fmtDay(day)}</div>`; lastDay = day; prevBy = null; }
    else if (n.at - prevAt > 30 * 60e3) { sep = `<div class="chat-sep">${fmtTime(n.at)}</div>`; prevBy = null; }
    const html = sep + bubble(n, prevBy);
    prevBy = n.by;
    prevAt = n.at;
    return html;
  });
  const last = list[list.length - 1];
  const seen = last && last.by === store.me && last.data.readAt ? `<div class="seen">Seen ${timeAgo(last.data.readAt)} 💚</div>` : '';
  const r = replyTo && store.get(replyTo);
  return {
    html: `${header('Notes', { sub: presencePill() })}${notesSeg('notes')}
      <div class="chat" id="chat">${items.join('') || `<div class="empty"><div class="e">💬</div>Say hi to ${themName()}. Send words, a photo, or hold 🎙️ for a voice note.</div>`}${seen}
        <div class="typing hide" id="typing"><span></span><span></span><span></span></div></div>
      <div class="composer">
        ${r ? `<div class="reply-bar"><div class="grow"><b>Replying to ${r.by === store.me ? 'yourself' : nameOf(r.by)}</b><div class="small muted">${snippet(r)}</div></div><button class="x-btn" data-act="noReply">×</button></div>` : ''}
        <div class="compose-row">
          <label class="c-btn" aria-label="Send a photo">📷<input type="file" accept="image/*" data-change="photo"></label>
          <textarea data-input="noteText" rows="1" placeholder="Message ${themName()}…" maxlength="1000"></textarea>
          <button class="c-btn send hide" data-act="send" aria-label="Send">➤</button>
          <button class="c-btn mic" id="mic" aria-label="Hold to record a voice note">🎙️</button>
        </div>
      </div>
      <div class="rec hide" id="rec"><span class="rec-dot"></span><b id="recT">0:00</b><span class="grow">Recording… let go to send</span><button class="btn small ghost" id="recX">Cancel</button></div>`,
    tabs: true,
    mount: (root) => {
      const unread = store.all('note', (n) => n.data.to === store.me && !n.data.readAt);
      if (unread.length) setTimeout(() => unread.forEach((n) => store.update(n.id, { readAt: Date.now() })), 500);
      const ta = root.querySelector('[data-input="noteText"]');
      const sync = () => {
        ta.style.height = 'auto';
        ta.style.height = `${Math.min(120, ta.scrollHeight)}px`;
        const has = !!ta.value.trim();
        root.querySelector('.send').classList.toggle('hide', !has);
        root.querySelector('#mic').classList.toggle('hide', has);
      };
      ta.addEventListener('input', () => {
        sync();
        if (Date.now() - lastTyping > 2500) { lastTyping = Date.now(); store.signal('typing'); }
      });
      sync();
      // Pre-load voice note links so tapping play works instantly (iPhone needs that).
      root.querySelectorAll('[data-audio]').forEach((b) => store.photoUrl(b.dataset.audio).then((u) => { b.dataset.url = u; }));
      const typing = root.querySelector('#typing');
      let tt = 0;
      const off = store.onSignal((p) => {
        if (p.t !== 'typing' || p.from === store.me) return;
        typing.classList.remove('hide');
        clearTimeout(tt);
        tt = setTimeout(() => typing.classList.add('hide'), 4000);
        window.scrollTo(0, document.body.scrollHeight);
      });
      setupRecorder(root);
      if (list.length !== lastCount) requestAnimationFrame(() => window.scrollTo(0, document.body.scrollHeight));
      lastCount = list.length;
      return () => { off(); clearTimeout(tt); };
    },
    actions: {
      go: (d) => { location.hash = d.h; },
      send: async (d, el) => {
        const ta = document.querySelector('[data-input="noteText"]');
        const text = ta.value.trim();
        if (!text) return;
        ta.value = '';
        const r0 = el.getBoundingClientRect();
        floatHearts(r0.left, r0.top, 3);
        await send({ text });
        return true;
      },
      noReply: () => { replyTo = null; return true; },
      play: (d, el) => {
        if (playing === d.id) { player.pause(); playing = null; el.classList.remove('on'); return; }
        const url = el.dataset.url;
        if (!url) { toast('Loading the voice note… tap again'); return; }
        document.querySelectorAll('.voice.on').forEach((b) => b.classList.remove('on'));
        player.src = url;
        player.play().then(() => { playing = d.id; el.classList.add('on'); }).catch(() => toast("Couldn't play that one"));
      },
      menu: (d, el, e) => {
        if (e.target.closest('.voice')) return;
        noteMenu(store.get(d.id));
      },
    },
    changes: {
      photo: async (files) => {
        const f = files?.[0];
        if (!f) return;
        toast('Sending photo…', 1500);
        const demo = store.mode === 'demo';
        const { blob, dataUrl } = await compressImage(f, demo ? 720 : 1440, demo ? 0.6 : 0.8);
        const photo = await store.uploadPhoto(blob, dataUrl);
        await send({ photo });
        return true;
      },
    },
  };
}

async function send(data) {
  const payload = { to: store.partnerId, ...data };
  if (replyTo) payload.replyTo = replyTo;
  replyTo = null;
  await store.add('note', payload);
  awardCapped(5, 'note');
  const title = data.audio ? `🎙️ ${myName()} sent a voice note` : data.photo ? `📷 ${myName()} sent a photo` : `💌 ${myName()}`;
  store.notify('note', title, data.text || '', '#/notes');
}

function noteMenu(n) {
  if (!n) return;
  const mine = n.by === store.me;
  const cur = n.data.reacts?.[store.me];
  sheet({
    body: `<div class="react-row">${REACTS.map((e) => `<button class="${cur === e ? 'on' : ''}" data-r="${e}">${e}</button>`).join('')}</div>
      <div class="sp"></div>
      <button class="btn ghost block" data-reply>↩︎ Reply</button>
      ${n.data.text ? '<div class="sp"></div><button class="btn ghost block" data-copy>Copy text</button>' : ''}
      ${mine ? '<div class="sp"></div><button class="btn ghost block" data-del>Unsend</button>' : ''}`,
    onMount: (el, close) => {
      el.querySelectorAll('[data-r]').forEach((b) => {
        b.onclick = async () => {
          close();
          const e = b.dataset.r === cur ? null : b.dataset.r;
          await store.update(n.id, (d) => ({ ...d, reacts: { ...(d.reacts || {}), [store.me]: e } }));
          if (e && !mine) store.notify('note', `${myName()} reacted ${e} to your note`, n.data.text || '', '#/notes');
        };
      });
      el.querySelector('[data-reply]').onclick = () => { close(); replyTo = n.id; bus.rerender(); setTimeout(() => document.querySelector('[data-input="noteText"]')?.focus(), 350); };
      el.querySelector('[data-copy]')?.addEventListener('click', () => { close(); navigator.clipboard?.writeText(n.data.text).then(() => toast('Copied')); });
      el.querySelector('[data-del]')?.addEventListener('click', async () => {
        close();
        if (await confirmSheet('Unsend this?', 'It disappears for both of you.', 'Unsend')) store.remove(n.id);
      });
    },
  });
}

// Hold the mic to record, let go to send.
function setupRecorder(root) {
  const mic = root.querySelector('#mic');
  const rec = root.querySelector('#rec');
  const recT = root.querySelector('#recT');
  if (!mic) return;
  let mr = null;
  let chunks = [];
  let started = 0;
  let timer = 0;
  let want = false;
  let cancelled = false;
  let stream = null;
  const type = window.MediaRecorder && MediaRecorder.isTypeSupported?.('audio/mp4') ? 'audio/mp4' : 'audio/webm';
  const stopAll = () => { clearInterval(timer); rec.classList.add('hide'); mic.classList.remove('recording'); stream?.getTracks().forEach((t) => t.stop()); stream = null; };
  const begin = async (e) => {
    e.preventDefault();
    try { mic.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) { toast("Voice notes aren't supported on this phone"); return; }
    want = true;
    cancelled = false;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch { toast('Allow the microphone to send voice notes'); want = false; return; }
    if (!want) { stopAll(); toast('Mic is ready! Now hold 🎙️ while you talk'); return; }
    chunks = [];
    mr = new MediaRecorder(stream, { mimeType: type });
    mr.ondataavailable = (ev) => { if (ev.data.size) chunks.push(ev.data); };
    mr.onstop = async () => {
      const dur = (Date.now() - started) / 1000;
      stopAll();
      if (cancelled) return;
      if (dur < 0.8) { toast('Hold 🎙️ while you talk, then let go'); return; }
      const blob = new Blob(chunks, { type });
      toast('Sending voice note…', 1500);
      try {
        const audio = await store.uploadFile(blob, type === 'audio/mp4' ? 'm4a' : 'webm', type);
        await send({ audio, dur: Math.round(dur) });
        bus.rerender();
      } catch (err) { toast(`Couldn't send: ${esc(err.message)}`); }
    };
    mr.start();
    started = Date.now();
    mic.classList.add('recording');
    rec.classList.remove('hide');
    timer = setInterval(() => {
      const s = (Date.now() - started) / 1000;
      recT.textContent = fmtDur(s);
      if (s >= 90) finish();
    }, 200);
  };
  const finish = () => {
    want = false;
    if (mr && mr.state === 'recording') mr.stop();
  };
  mic.addEventListener('pointerdown', begin);
  mic.addEventListener('pointerup', finish);
  mic.addEventListener('pointercancel', () => { cancelled = true; finish(); });
  mic.addEventListener('contextmenu', (e) => e.preventDefault());
  root.querySelector('#recX').addEventListener('click', () => { cancelled = true; finish(); });
}
