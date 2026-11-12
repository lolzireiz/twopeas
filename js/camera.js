// In-app camera: the photo comes out exactly like the preview (selfies stay mirrored like a mirror).
import { toast } from './util.js';

export function openCamera() {
  return new Promise((resolve) => {
    if (!navigator.mediaDevices?.getUserMedia) { toast("This phone can't open the camera here. Use 'Choose a photo' instead."); resolve(null); return; }
    let facing = 'user';
    let stream = null;
    let done = false;
    const el = document.createElement('div');
    el.className = 'cam';
    el.innerHTML = `<video playsinline autoplay muted></video>
      <div class="cam-flash"></div>
      <div class="cam-top"><button class="cam-x" aria-label="Close">✕</button></div>
      <div class="cam-bar"><span></span><button class="cam-shoot" aria-label="Take photo"></button><button class="cam-flip" aria-label="Switch camera">🔄</button></div>`;
    document.body.appendChild(el);
    const video = el.querySelector('video');
    const stop = () => stream?.getTracks().forEach((t) => t.stop());
    const finish = (blob) => { if (done) return; done = true; stop(); el.remove(); resolve(blob); };
    async function start() {
      stop();
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing, width: { ideal: 1920 }, height: { ideal: 1440 } }, audio: false });
      } catch {
        toast('Allow camera access to take a snap (iPhone Settings, Safari, Camera)');
        finish(null);
        return;
      }
      video.srcObject = stream;
      video.classList.toggle('mirror', facing === 'user');
      await video.play().catch(() => {});
    }
    el.querySelector('.cam-x').onclick = () => finish(null);
    el.querySelector('.cam-flip').onclick = () => { facing = facing === 'user' ? 'environment' : 'user'; start(); };
    el.querySelector('.cam-shoot').onclick = () => {
      const w = video.videoWidth;
      const h = video.videoHeight;
      if (!w) return;
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      const ctx = c.getContext('2d');
      if (facing === 'user') { ctx.translate(w, 0); ctx.scale(-1, 1); }
      ctx.drawImage(video, 0, 0, w, h);
      el.querySelector('.cam-flash').classList.add('on');
      c.toBlob((b) => setTimeout(() => finish(b), 180), 'image/jpeg', 0.9);
    };
    start();
  });
}
