// The data layer. Everything the two of you create is an "item":
//   { id, kind, data, by, at, upd, hiddenFrom }
// Demo mode keeps items in this phone's storage and lets you switch between both people.
// Live mode keeps them in Supabase and syncs instantly between both phones.

import { CONFIG } from './config.js';
import { uid, lsGet, lsSet, toast } from './util.js';

const DEMO_KEY = 'twopeas-demo-v1';

class Store {
  constructor() {
    this.items = new Map();
    this.listeners = new Set();
    this.mode = CONFIG.SUPABASE_URL ? 'live' : 'demo';
    this.me = null;
    this.partnerId = null;
    this.coupleId = null;
    this.pairCode = null;
    this.state = 'loading'; // loading | auth | pair | ready
    this.presence = { online: false, view: null };
    this.view = null;
    this.signalFns = new Set();
    this.backend = this.mode === 'live' ? new LiveBackend(this) : new DemoBackend(this);
  }

  async init() {
    await this.backend.init();
  }

  on(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  emit(change = {}) { for (const fn of this.listeners) { try { fn(change); } catch (e) { console.error(e); } } }

  visible(it) { return !it.hiddenFrom || it.hiddenFrom !== this.me; }
  get(id) { const it = this.items.get(id); return it && this.visible(it) ? it : null; }
  all(kind, filter) {
    const out = [];
    for (const it of this.items.values()) {
      if (it.kind === kind && this.visible(it) && (!filter || filter(it))) out.push(it);
    }
    return out.sort((a, b) => a.at - b.at);
  }

  // People
  profile(id) { return this.get(`profile-${id}`)?.data || {}; }
  get mine() { return this.profile(this.me); }
  get theirs() { return this.profile(this.partnerId); }
  name(id) { return this.profile(id).name || (id === this.me ? 'You' : 'Your person'); }
  get couple() { return this.get('couple')?.data || {}; }

  async add(kind, data, opts = {}) {
    const id = opts.id || `${kind}-${uid(10)}`;
    if (opts.once && this.items.has(id)) return this.items.get(id);
    const now = Date.now();
    const item = { id, kind, data, by: this.me, at: now, upd: now, hiddenFrom: opts.hiddenFrom || null };
    this.items.set(id, item);
    this.emit({ type: 'add', item });
    try {
      const canon = await this.backend.put(item, !!opts.once);
      if (canon) {
        this.items.set(id, canon);
        if (canon.by !== item.by || JSON.stringify(canon.data) !== JSON.stringify(item.data)) this.emit({ type: 'sync', item: canon });
      }
    } catch (e) {
      console.error(e);
      this.items.delete(id);
      this.emit({ type: 'remove', id });
      toast("Couldn't save that. Check your connection and try again.");
      throw e;
    }
    return this.items.get(id);
  }

  async update(id, patch) {
    const it = this.items.get(id);
    if (!it) return null;
    const data = typeof patch === 'function' ? patch(structuredClone(it.data)) : { ...it.data, ...patch };
    const next = { ...it, data, upd: Date.now() };
    this.items.set(id, next);
    this.emit({ type: 'update', item: next });
    try {
      await this.backend.patch(next);
    } catch (e) {
      console.error(e);
      toast("Couldn't sync that change. It'll show again when you're back online.");
    }
    return next;
  }

  // Update if it exists, otherwise create it with that id.
  async set(id, kind, data) {
    return this.items.has(id) ? this.update(id, data) : this.add(kind, data, { id });
  }

  async remove(id) {
    const it = this.items.get(id);
    if (!it) return;
    this.items.delete(id);
    this.emit({ type: 'remove', id });
    try { await this.backend.del(id); } catch (e) { console.error(e); }
  }

  // Push a notification to your partner's phone (respects their settings).
  notify(type, title, body, url = '#/home') {
    if (!this.partnerId) return;
    this.backend.notify({ type, title, body, url, to: this.partnerId }).catch?.(() => {});
  }

  uploadPhoto(blob, dataUrl) { return this.backend.uploadPhoto(blob, dataUrl); }
  uploadFile(blob, ext, type) { return this.backend.uploadFile(blob, ext, type); }

  // Live presence: what the other person is doing right now.
  setView(view) {
    if (view === this.view) return;
    this.view = view;
    this.backend.track?.();
  }
  // Fire-and-forget live signals (in-progress strokes, typing). Not saved.
  signal(t, payload = {}) { this.backend.broadcast?.({ t, ...payload, from: this.me }); }
  onSignal(fn) { this.signalFns.add(fn); return () => this.signalFns.delete(fn); }
  gotSignal(p) { for (const fn of this.signalFns) { try { fn(p); } catch (e) { console.error(e); } } }
  photoUrl(ref) { return this.backend.photoUrl(ref); }
  loadStrokes(board) { return this.backend.loadStrokes(board); }
}

// ---------------- Demo: both people on one phone ----------------

class DemoBackend {
  constructor(s) { this.s = s; this.users = { a: 'u-you', b: 'u-her' }; this.current = 'a'; this.inbox = {}; }

  async init() {
    const db = lsGet(DEMO_KEY);
    if (db) {
      this.users = db.users || this.users;
      this.current = db.current || 'a';
      this.inbox = db.inbox || {};
      for (const it of db.items || []) this.s.items.set(it.id, it);
    }
    this.s.coupleId = 'demo';
    this.s.pairCode = 'DEMO42';
    this.applyUser();
    this.s.state = 'ready';
    window.addEventListener('storage', (e) => {
      if (e.key !== DEMO_KEY) return;
      const fresh = lsGet(DEMO_KEY);
      if (!fresh) return;
      this.s.items.clear();
      for (const it of fresh.items || []) this.s.items.set(it.id, it);
      this.s.emit({ type: 'reload' });
    });
  }

  applyUser() {
    this.s.me = this.users[this.current];
    this.s.partnerId = this.users[this.current === 'a' ? 'b' : 'a'];
  }

  save() {
    const ok = lsSet(DEMO_KEY, {
      users: this.users, current: this.current, inbox: this.inbox, items: [...this.s.items.values()],
    });
    if (!ok) toast('Demo storage is full. Try fewer or smaller photos.');
  }

  switchUser() {
    this.current = this.current === 'a' ? 'b' : 'a';
    this.applyUser();
    this.save();
    const box = this.inbox[this.s.me] || [];
    this.inbox[this.s.me] = [];
    this.save();
    this.s.emit({ type: 'switch' });
    box.slice(-2).forEach((n, i) => setTimeout(() => toast(`🔔 <b>${n.title}</b>${n.body ? `<br>${n.body}` : ''}`, 3200), 350 + i * 600));
  }

  reset() {
    localStorage.removeItem(DEMO_KEY);
    location.hash = '';
    location.reload();
  }

  async put(item, once) {
    if (once) {
      const existing = this.s.items.get(item.id);
      if (existing && existing !== item) return existing;
    }
    this.save();
    return item;
  }
  async patch() { this.save(); }
  async del() { this.save(); }
  async notify(n) {
    (this.inbox[n.to] = this.inbox[n.to] || []).push({ title: n.title, body: n.body, at: Date.now() });
    this.save();
  }
  async uploadPhoto(blob, dataUrl) { return dataUrl; }
  async uploadFile(blob) {
    return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(blob); });
  }
  async photoUrl(ref) { return ref; }
  async loadStrokes() { return; }
}

// ---------------- Live: Supabase ----------------

class LiveBackend {
  constructor(s) { this.s = s; this.urls = new Map(); }

  async init() {
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    this.sb = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
    });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && this.s.coupleId) this.refresh();
    });
    const { data: { session } } = await this.sb.auth.getSession();
    if (!session) { this.s.state = 'auth'; return; }
    await this.afterLogin(session.user);
  }

  async afterLogin(user) {
    this.s.me = user.id;
    this.s.email = user.email;
    const { data: mem, error } = await this.sb.from('members').select('couple_id').eq('user_id', user.id).maybeSingle();
    if (error) throw error;
    if (!mem) { this.s.state = 'pair'; return; }
    this.s.coupleId = mem.couple_id;
    await this.loadMembers();
    await this.fetchAll();
    this.subscribe();
    this.joinRoom();
    this.s.state = 'ready';
  }

  async loadMembers() {
    const { data: mems } = await this.sb.from('members').select('user_id').eq('couple_id', this.s.coupleId);
    this.s.partnerId = (mems || []).find((m) => m.user_id !== this.s.me)?.user_id || null;
    const { data: c } = await this.sb.from('couples').select('code').eq('id', this.s.coupleId).single();
    this.s.pairCode = c?.code;
  }

  async signUp(email, password) {
    const { data, error } = await this.sb.auth.signUp({ email, password });
    if (error) throw error;
    if (!data.session) throw new Error('Check your email to confirm your account, then sign in.');
    await this.afterLogin(data.user);
  }
  async signIn(email, password) {
    const { data, error } = await this.sb.auth.signInWithPassword({ email, password });
    if (error) throw error;
    await this.afterLogin(data.user);
  }
  async signOut() {
    await this.sb.auth.signOut();
    location.hash = '';
    location.reload();
  }
  async createCouple() {
    const { error } = await this.sb.rpc('create_couple');
    if (error) throw error;
    const { data: { user } } = await this.sb.auth.getUser();
    await this.afterLogin(user);
  }
  async joinCouple(code) {
    const { error } = await this.sb.rpc('join_couple', { p_code: code.trim().toUpperCase() });
    if (error) throw new Error(error.message.includes('not found') ? "That code didn't match. Check it and try again." : error.message);
    const { data: { user } } = await this.sb.auth.getUser();
    await this.afterLogin(user);
  }

  row(r) {
    return {
      id: r.id, kind: r.kind, data: r.data || {}, by: r.created_by,
      at: Date.parse(r.created_at), upd: Date.parse(r.updated_at), hiddenFrom: r.hidden_from,
    };
  }

  async fetchAll() {
    const fresh = new Map();
    for (let from = 0; ; from += 1000) {
      const { data, error } = await this.sb.from('items').select('*')
        .eq('couple_id', this.s.coupleId).neq('kind', 'stroke')
        .order('created_at').range(from, from + 999);
      if (error) throw error;
      for (const r of data) fresh.set(r.id, this.row(r));
      if (data.length < 1000) break;
    }
    for (const [id, it] of this.s.items) if (it.kind === 'stroke') fresh.set(id, it);
    this.s.items = fresh;
  }

  async refresh() {
    try {
      if (!this.s.partnerId) await this.loadMembers();
      await this.fetchAll();
      this.s.emit({ type: 'reload' });
      if (!this.ch || this.ch.state !== 'joined') this.subscribe();
    } catch (e) { console.error(e); }
  }

  subscribe() {
    if (this.ch) this.sb.removeChannel(this.ch);
    const cid = this.s.coupleId;
    this.ch = this.sb.channel(`couple-${cid}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'items', filter: `couple_id=eq.${cid}` }, (p) => this.onRow(p.new, 'add'))
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'items', filter: `couple_id=eq.${cid}` }, (p) => this.onRow(p.new, 'update'))
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'items' }, (p) => {
        if (p.old?.couple_id && p.old.couple_id !== cid) return;
        if (this.s.items.delete(p.old?.id)) this.s.emit({ type: 'remove', id: p.old.id, remote: true });
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'members', filter: `couple_id=eq.${cid}` }, () => this.refresh())
      .subscribe();
  }

  // Presence + broadcast on a separate channel.
  joinRoom() {
    if (this.room) this.sb.removeChannel(this.room);
    const s = this.s;
    this.room = this.sb.channel(`room-${s.coupleId}`, { config: { presence: { key: s.me }, broadcast: { self: false } } })
      .on('presence', { event: 'sync' }, () => {
        const st = this.room.presenceState();
        const theirs = (st[s.partnerId] || [])[0];
        const was = s.presence.online;
        s.presence = { online: !!theirs, view: theirs?.view || null };
        s.emit({ type: 'presence', flipped: was !== s.presence.online });
      })
      .on('broadcast', { event: 'live' }, ({ payload }) => s.gotSignal(payload))
      .subscribe((status) => { if (status === 'SUBSCRIBED') this.track(); });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') this.track();
      else this.room?.untrack().catch(() => {});
    });
  }
  track() {
    if (!this.room || document.visibilityState !== 'visible') return;
    this.room.track({ view: this.s.view, at: Date.now() }).catch(() => {});
  }
  broadcast(payload) {
    this.room?.send({ type: 'broadcast', event: 'live', payload }).catch?.(() => {});
  }

  onRow(r, type) {
    const it = this.row(r);
    this.s.items.set(it.id, it);
    this.s.emit({ type, item: it, remote: it.by !== this.s.me });
  }

  async put(item, once) {
    const row = { couple_id: this.s.coupleId, id: item.id, kind: item.kind, data: item.data, hidden_from: item.hiddenFrom || null };
    if (once) {
      const { error } = await this.sb.from('items').upsert(row, { onConflict: 'couple_id,id', ignoreDuplicates: true });
      if (error) throw error;
      const { data, error: e2 } = await this.sb.from('items').select('*').eq('couple_id', this.s.coupleId).eq('id', item.id).single();
      if (e2) throw e2;
      return this.row(data);
    }
    const { data, error } = await this.sb.from('items').insert(row).select().single();
    if (error) throw error;
    return this.row(data);
  }

  async patch(item) {
    const { error } = await this.sb.from('items').update({ data: item.data })
      .eq('couple_id', this.s.coupleId).eq('id', item.id);
    if (error) throw error;
  }

  async del(id) {
    const { error } = await this.sb.from('items').delete().eq('couple_id', this.s.coupleId).eq('id', id);
    if (error) throw error;
  }

  async notify(payload) {
    try { await this.sb.functions.invoke('notify', { body: payload }); } catch (e) { console.warn('notify failed', e); }
  }

  async uploadPhoto(blob) { return this.uploadFile(blob, 'jpg', 'image/jpeg'); }
  async uploadFile(blob, ext, type) {
    const path = `${this.s.coupleId}/${uid(16)}.${ext}`;
    const { error } = await this.sb.storage.from('photos').upload(path, blob, { contentType: type });
    if (error) throw error;
    return `sb:${path}`;
  }

  async photoUrl(ref) {
    if (!ref || !ref.startsWith('sb:')) return ref;
    const hit = this.urls.get(ref);
    if (hit && hit.exp > Date.now()) return hit.url;
    const { data, error } = await this.sb.storage.from('photos').createSignedUrl(ref.slice(3), 60 * 60 * 24 * 7);
    if (error) return '';
    this.urls.set(ref, { url: data.signedUrl, exp: Date.now() + 6 * 864e5 });
    return data.signedUrl;
  }

  async loadStrokes(board) {
    const { data, error } = await this.sb.from('items').select('*')
      .eq('couple_id', this.s.coupleId).eq('kind', 'stroke').eq('data->>board', board).order('created_at').limit(5000);
    if (error) return;
    for (const r of data) this.s.items.set(r.id, this.row(r));
  }

  async savePushSub(sub) {
    const { error } = await this.sb.from('push_subs').upsert({
      endpoint: sub.endpoint, user_id: this.s.me, couple_id: this.s.coupleId, sub,
    }, { onConflict: 'endpoint' });
    if (error) throw error;
  }
}

export const store = new Store();
window.__store = store;
