import { store } from '../store.js';
import { STICKERS, earned } from '../stickers.js';
import { awardCapped } from '../logic.js';
import { header, themName, meName, empty, nameOf } from '../ui.js';
import { esc, sheet, toast, timeAgo, pick, floatHearts } from '../util.js';

export function stickers() {
  const have = earned();
  return {
    html: `${header('Sticker book', { back: '#/us', sub: `${have.size} of ${STICKERS.length} collected` })}
      <div class="stickers">${STICKERS.map((s) => `<div class="sticker ${have.has(s.id) ? '' : 'off'}"><div class="e">${s.e}</div><b>${s.name}</b><span>${s.hint}</span></div>`).join('')}</div>`,
  };
}

const PROMPTS = [
  'One thing you did lately that I loved…',
  'I felt really cared for when you…',
  'Something I admire about you…',
  'A little thing you do that I never want you to stop…',
  'You made me laugh when…',
  'I was proud of you when…',
];

export function lovejar() {
  const forMe = store.all('appr', (a) => a.data.to === store.me);
  const fromMe = store.all('appr', (a) => a.by === store.me).reverse();
  const prompt = PROMPTS[Math.floor(Date.now() / 864e5) % PROMPTS.length];
  return {
    html: `${header('Love jar', { back: '#/us' })}
      <div class="card center">
        <div class="jar-art">🫙</div>
        <h2 style="margin-top:6px">${forMe.length} thing${forMe.length === 1 ? '' : 's'} ${themName()} loves about you</h2>
        <p class="small muted">Pull one out whenever you need a little boost.</p>
        <div class="sp"></div>
        <button class="btn pink block" data-act="pull" ${forMe.length ? '' : 'disabled'}>Pull one out 💗</button>
      </div>
      <div class="card">
        <h2>Add one for ${themName()}</h2>
        <p class="small muted">${prompt}</p>
        <div class="sp"></div>
        <textarea data-input="apprText" maxlength="300" placeholder="When you…"></textarea>
        <div class="sp"></div>
        <button class="btn block" data-act="add">Drop it in the jar</button>
      </div>
      ${fromMe.length ? `<div class="section-title">You've added ${fromMe.length}</div><div class="card">${fromMe.slice(0, 20).map((a) => `<div class="list-row"><span>💗</span><div class="txt">${esc(a.data.text)}<div class="tiny muted">${timeAgo(a.at)}</div></div></div>`).join('')}</div>` : ''}`,
    actions: {
      add: async (d, el) => {
        const ta = document.querySelector('[data-input="apprText"]');
        const text = ta.value.trim();
        if (!text) { toast('Write a little something first 💗'); return; }
        ta.value = '';
        const r = el.getBoundingClientRect();
        floatHearts(r.left + r.width / 2, r.top, 5);
        await store.add('appr', { to: store.partnerId, text });
        awardCapped(5, 'note');
        store.notify('note', `🫙 ${store.mine.name || 'Your person'} added to your love jar`, text, '#/lovejar');
        toast(`In the jar for ${themName()} 💗`);
        return true;
      },
      pull: () => {
        const a = pick(forMe);
        sheet({
          body: `<div class="center"><div style="font-size:56px">💗</div><p style="font-size:20px;font-weight:800;line-height:1.35;margin:10px 0">${esc(a.data.text)}</p>
            <p class="small muted bold">from ${nameOf(a.by)} · ${timeAgo(a.at)}</p><div class="sp2"></div><button class="btn block" data-close>Aww 🥹</button></div>`,
          onMount: (el, close) => { el.querySelector('[data-close]').onclick = close; },
        });
      },
    },
  };
}
