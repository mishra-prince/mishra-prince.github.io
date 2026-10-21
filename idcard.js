import { RibbonStrand, clamp, screenGravity, ropePath, ribbonPath, fitWholePhoto } from './idcard-physics.js';
import { socialLinks } from './social-links.js';

export function initIDCard({ openDialog, copyText }) {
  const $ = selector => document.querySelector(selector);
  const root = document.documentElement;
  const stage = $('#lanyard-stage'), card = $('#id-card');
  if (!stage || !card) return;
  const strands = [new RibbonStrand({ side: -1 }), new RibbonStrand({ side: 1 })];
  const grip = $('#lanyard-grip'), svg = $('#lanyard-svg');
  const holdButton = $('#id-hold'), tiltButton = $('#id-tilt');
  const sensorStatus = $('#id-sensor-status');
  let width = 0, measuredHeight = 0, cardWidth = 264, back = false, manualHold = false;
  let frameId = 0, lastTime = 0, inView = true;
  let pointer = null, sensorEnabled = false, sensorPending = false;
  let sensorTimeout = 0, sensorGeneration = 0, neutral = null;
  let sensorGravity = { x: 0, y: 1 };
  const motion = () => root.dataset.motion !== 'off';
  const held = () => manualHold || !motion();
  const screenAngle = () => screen.orientation?.angle ?? window.orientation ?? 0;

  function draw() {
    // Card position is deliberately absent: only the fabric is simulated.
    strands.forEach((strand, i) => {
      $(`#lanyard-curve-${i}`).setAttribute('d', ropePath(strand.nodes));
      $(`#lanyard-ribbon-${i}`).setAttribute('d', ribbonPath(strand.nodes, i ? 20 : 18, i ? 1 : -1));
    });
  }
  function updateLabels() {
    holdButton.setAttribute('aria-pressed', String(held()));
    holdButton.textContent = held() ? '▷ Resume band' : 'Ⅱ Pause band';
    holdButton.disabled = !motion();
    $('#id-motion-label').textContent = !motion() ? 'MOTION IS OFF' : manualHold ? 'BAND PAUSED' : sensorEnabled ? 'BAND TILT ON' : 'DRAG THE BAND';
  }
  function stopFrame() { cancelAnimationFrame(frameId); frameId = 0; lastTime = 0; }
  function wake() {
    if (!frameId && inView && !document.hidden && !held()) frameId = requestAnimationFrame(tick);
  }
  function tick(time) {
    frameId = 0;
    if (!inView || document.hidden || held()) { lastTime = 0; return; }
    const delta = lastTime ? Math.min((time - lastTime) / 1000, .04) : 1 / 60;
    lastTime = time;
    strands.forEach(strand => { strand.setGravity(sensorGravity.x, sensorGravity.y); strand.update(delta); });
    draw(); wake();
  }
  function center() { strands.forEach(strand => strand.reset()); draw(); }
  function resize() {
    const rect = stage.getBoundingClientRect();
    if (!rect.width || width === rect.width && measuredHeight === rect.height && cardWidth === card.offsetWidth) return;
    endDrag(); width = rect.width; measuredHeight = rect.height; cardWidth = card.offsetWidth;
    const cardTop = rect.height - card.offsetHeight - 44;
    // Position the card only on layout changes, independently of all physics.
    stage.style.setProperty('--id-top', `${cardTop}px`);
    stage.style.setProperty('--grip-height', `${cardTop - 25}px`);
    const attachment = cardTop - 22, span = Math.min(62, width * .18);
    strands.forEach((strand, i) => strand.configure({
      start: { x: width / 2 + (i ? span : -span), y: 8 },
      end: { x: width / 2 + (i ? 4 : -4), y: attachment }, width
    }));
    $('#lanyard-loop').setAttribute('d', `M${width / 2 - span} 8 C${width / 2 - span} -20 ${width / 2 + span} -20 ${width / 2 + span} 8`);
    svg.setAttribute('viewBox', `0 0 ${width} ${rect.height}`);
    draw(); wake();
  }
  function setHold(value) {
    manualHold = value;
    if (held()) { endDrag(); stopFrame(); }
    updateLabels(); wake();
  }
  function flip() {
    back = !back;
    card.classList.toggle('is-flipped', back);
    $('#id-front').inert = back; $('#id-back').inert = !back;
    $('#id-front').setAttribute('aria-hidden', String(back));
    $('#id-back').setAttribute('aria-hidden', String(!back));
    $('#id-flip').setAttribute('aria-pressed', String(back));
    $('#id-flip').textContent = back ? '↶ Front of pass' : '↻ Dot-matrix back';
  }
  $('#id-flip').addEventListener('click', flip);
  holdButton.addEventListener('click', () => setHold(!manualHold));
  $('#id-reset').addEventListener('click', () => {
    endDrag(); neutral = null; sensorGravity = { x: 0, y: 1 };
    center(); wake();
    if (sensorEnabled) sensorStatus.textContent = 'Band reset. Hold your phone comfortably, then tilt to move the fabric.';
  });

  function point(event) {
    const rect = stage.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }
  grip.addEventListener('pointerdown', event => {
    if (event.button !== 0 || held()) return;
    const p = point(event);
    const candidates = strands.map((strand, index) => ({ ...strand.nearest(p.x, p.y), strand: index })).sort((a, b) => a.distance - b.distance);
    const chosen = candidates[0], strand = strands[chosen.strand], node = strand.nodes[chosen.index];
    pointer = { id: event.pointerId, strand, index: chosen.index, offsetX: p.x - node.x, offsetY: p.y - node.y, lastX: p.x, lastY: p.y, time: event.timeStamp, vx: 0, vy: 0 };
    strand.grab(chosen.index, node.x, node.y);
    grip.setPointerCapture(event.pointerId); grip.classList.add('is-dragging');
    grip.focus({ preventScroll: true }); event.preventDefault(); wake();
  });
  grip.addEventListener('pointermove', event => {
    if (!pointer || event.pointerId !== pointer.id) return;
    const p = point(event), dt = Math.max(.008, (event.timeStamp - pointer.time) / 1000);
    pointer.vx = (p.x - pointer.lastX) / dt; pointer.vy = (p.y - pointer.lastY) / dt;
    Object.assign(pointer, { lastX: p.x, lastY: p.y, time: event.timeStamp });
    pointer.strand.grab(pointer.index, p.x - pointer.offsetX, p.y - pointer.offsetY);
    event.preventDefault(); wake();
  });
  function endDrag(event) {
    if (!pointer || event && event.pointerId !== pointer.id) return;
    const previous = pointer; pointer = null;
    const fresh = (!event || event.timeStamp - previous.time < 100) && event?.type !== 'pointercancel';
    previous.strand.release(fresh ? previous.vx : 0, fresh ? previous.vy : 0);
    if (grip.hasPointerCapture(previous.id)) grip.releasePointerCapture(previous.id);
    grip.classList.remove('is-dragging'); wake();
  }
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(type => grip.addEventListener(type, endDrag));
  function bandKeyboard(event) {
    if (event.target !== grip && event.target !== card) return;
    if (['ArrowLeft', 'ArrowRight', ' ', 'Home', 'Enter'].includes(event.key)) event.preventDefault();
    if (event.key === 'Home') { center(); wake(); }
    if (event.key === ' ' && motion()) setHold(!manualHold);
    if (event.key === 'Enter' && event.target === card) flip();
    if (motion() && !held() && ['ArrowLeft', 'ArrowRight'].includes(event.key)) { strands.forEach(strand => strand.nudge(event.key === 'ArrowLeft' ? -180 : 180)); wake(); }
  }
  grip.addEventListener('keydown', bandKeyboard); card.addEventListener('keydown', bandKeyboard);

  function disableSensor(message = '') {
    sensorGeneration++;
    clearTimeout(sensorTimeout);
    window.removeEventListener('deviceorientation', onOrientation);
    sensorEnabled = false; sensorPending = false; neutral = null;
    sensorGravity = { x: 0, y: 1 };
    tiltButton.disabled = false;
    tiltButton.textContent = '⌁ Enable phone tilt'; tiltButton.setAttribute('aria-pressed', 'false');
    sensorStatus.textContent = message; updateLabels(); wake();
  }
  function onOrientation(event) {
    // null sensor values must never be mistaken for zero degrees.
    if (typeof event.beta !== 'number' || typeof event.gamma !== 'number' || !Number.isFinite(event.beta) || !Number.isFinite(event.gamma)) return;
    const orientation = screenAngle();
    if (!neutral || neutral.screen !== orientation) neutral = { beta: event.beta, gamma: event.gamma, screen: orientation };
    const wrap = n => (n + 540) % 360 - 180;
    const gravity = screenGravity(wrap(event.beta - neutral.beta), wrap(event.gamma - neutral.gamma), orientation);
    if (!gravity) return;
    sensorGravity = gravity;
    if (!sensorEnabled) {
      clearTimeout(sensorTimeout); sensorPending = false; sensorEnabled = true;
      tiltButton.disabled = false; tiltButton.textContent = '⌁ Phone tilt on'; tiltButton.setAttribute('aria-pressed', 'true');
      sensorStatus.textContent = 'Tilt gently to move the band. The ID stays fixed. Reset ↺ recalibrates.';
      updateLabels();
    }
    wake();
  }
  tiltButton.addEventListener('click', async () => {
    if (sensorEnabled || sensorPending) { disableSensor(); return; }
    if (!motion()) { sensorStatus.textContent = 'Turn Motion on in the footer to use phone tilt. The QR codes and photo still work.'; return; }
    const Sensor = window.DeviceOrientationEvent;
    if (!window.isSecureContext || !Sensor) { sensorStatus.textContent = 'Phone tilt isn’t available in this browser. You can still drag the band or use ← →.'; return; }
    sensorPending = true; tiltButton.disabled = true;
    sensorStatus.textContent = 'Waiting for phone tilt access…';
    const generation = ++sensorGeneration;
    try {
      // Permission is requested directly inside this click, before any await.
      const permission = typeof Sensor.requestPermission === 'function' ? Sensor.requestPermission() : Promise.resolve('granted');
      const result = await permission;
      if (generation !== sensorGeneration) return;
      if (result !== 'granted') { disableSensor('Phone tilt access wasn’t granted. Drag the band or use ← → instead.'); return; }
      neutral = null;
      window.addEventListener('deviceorientation', onOrientation, { passive: true });
      sensorStatus.textContent = 'Move your phone slightly to connect the tilt sensor…';
      sensorTimeout = setTimeout(() => {
        if (!sensorEnabled) disableSensor('No tilt data arrived. Try a supported phone browser, or drag the band.');
      }, 7000);
    } catch { if (generation === sensorGeneration) disableSensor('This browser couldn’t enable phone tilt. Dragging and keyboard controls are ready.'); }
  });

  const observer = new MutationObserver(() => {
    if (!motion()) { endDrag(); stopFrame(); disableSensor(); center(); }
    updateLabels(); wake();
  });
  observer.observe(root, { attributes: true, attributeFilter: ['data-motion'] });
  document.addEventListener('visibilitychange', () => { if (document.hidden) { endDrag(); stopFrame(); } else wake(); });
  if ('IntersectionObserver' in window) new IntersectionObserver(entries => {
    inView = entries[0].isIntersecting;
    if (inView) wake(); else { endDrag(); stopFrame(); }
  }, { rootMargin: '100px' }).observe(stage);
  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(stage);
  else window.addEventListener('resize', resize);
  resize(); updateLabels();
  if (motion()) { strands.forEach(strand => strand.nudge(100)); draw(); wake(); }
  setupPortrait($('#id-portrait'), motion);
  setupFullMatrix($('#id-back-matrix'), $('#id-photo'));

  let selected = 'linkedin';
  const dialog = $('#social-qr-dialog');
  function selectSocial(key) {
    const social = socialLinks[key];
    if (!social) return;
    selected = key;
    $('#social-qr-title').textContent = key === 'github' ? 'Explore the code.' : key === 'whatsapp' ? 'Say hello.' : 'Let’s connect.';
    $('#social-qr-handle').textContent = social.handle;
    $('#social-qr-image').src = social.qr; $('#social-qr-image').alt = `${social.label} ${key === 'whatsapp' ? 'contact' : 'profile'} QR code`;
    $('#social-qr-open').href = social.url; $('#social-qr-open').textContent = `Open ${social.label} ↗`;
    $('#social-qr-download').href = social.qr; $('#social-qr-download').download = `Prince-${social.label}-QR.svg`;
    document.querySelectorAll('[data-qr-tab]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.qrTab === key)));
  }
  document.querySelectorAll('[data-social-qr]').forEach(button => button.addEventListener('click', () => {
    selectSocial(button.dataset.socialQr); openDialog(dialog);
  }));
  document.querySelectorAll('[data-qr-tab]').forEach(button => button.addEventListener('click', () => selectSocial(button.dataset.qrTab)));
  $('#social-qr-copy').addEventListener('click', () => copyText(socialLinks[selected].url, `${socialLinks[selected].label} link copied.`));
}

function setupPortrait(button, motion) {
  const image = button.querySelector('img'), canvas = button.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  let samples = [], w = 0, h = 0, locked = false, hovered = false, raf = 0, last = 0;
  let pointer = { x: 100, y: 70 };
  function draw(time = 0) {
    ctx.fillStyle = '#101b21'; ctx.fillRect(0, 0, w, h);
    for (const sample of samples) {
      const distance = Math.hypot(sample.x - pointer.x, sample.y - pointer.y);
      const ripple = hovered && motion() ? Math.sin(distance * .07 - time * .003) * .28 * Math.max(0, 1 - distance / 90) : 0;
      ctx.fillStyle = sample.colour;
      ctx.beginPath(); ctx.arc(sample.x, sample.y, Math.max(.35, sample.radius + ripple), 0, Math.PI * 2); ctx.fill();
    }
  }
  function loop(time) {
    raf = 0;
    if (time - last >= 32) { draw(time); last = time; }
    if (hovered && motion() && !document.hidden) raf = requestAnimationFrame(loop);
  }
  function prepare() {
    if (!image.complete || !image.naturalWidth) return;
    w = button.clientWidth; h = button.clientHeight;
    if (!w || !h) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const source = document.createElement('canvas'); source.width = w; source.height = h;
    const sourceContext = source.getContext('2d', { willReadFrequently: true });
    if (!sourceContext) return;
    // Match the photo's object-fit, 55% crop, and 1.58 scale exactly.
    const scale = Math.max(w / image.naturalWidth, h / image.naturalHeight) * 1.58;
    const iw = image.naturalWidth * scale, ih = image.naturalHeight * scale;
    sourceContext.drawImage(image, (w - iw) * .5, (h - ih) * .55, iw, ih);
    const pixels = sourceContext.getImageData(0, 0, w, h).data;
    samples = [];
    for (let y = 2; y < h; y += 4) for (let x = 2; x < w; x += 4) {
      const i = (Math.floor(y) * w + Math.floor(x)) * 4;
      const [r, g, b] = [pixels[i], pixels[i + 1], pixels[i + 2]];
      const light = (.2126 * r + .7152 * g + .0722 * b) / 255;
      samples.push({ x, y, radius: .65 + light * 1.15, colour: `rgb(${Math.round(r * .6 + 77)} ${Math.round(g * .68 + 76)} ${Math.round(b * .6 + 48)})` });
    }
    draw();
  }
  image.addEventListener('load', prepare); prepare();
  if ('ResizeObserver' in window) new ResizeObserver(prepare).observe(button);
  button.addEventListener('pointerenter', event => {
    if (event.pointerType === 'touch') return;
    hovered = true; button.classList.add('is-hovered');
    if (!raf) raf = requestAnimationFrame(loop);
  });
  button.addEventListener('pointermove', event => {
    const rect = button.getBoundingClientRect();
    pointer = { x: clamp((event.clientX - rect.left) / rect.width * w, 0, w), y: clamp((event.clientY - rect.top) / rect.height * h, 0, h) };
    button.style.setProperty('--dot-x', `${pointer.x}px`); button.style.setProperty('--dot-y', `${pointer.y}px`);
    if (!motion()) draw();
  });
  function leave() { hovered = false; button.classList.remove('is-hovered'); cancelAnimationFrame(raf); raf = 0; draw(); }
  button.addEventListener('pointerleave', leave);
  button.addEventListener('click', () => {
    locked = !locked; button.classList.toggle('is-matrix', locked); button.setAttribute('aria-pressed', String(locked)); draw();
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) leave(); });
}

function setupFullMatrix(canvas, image) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  function render() {
    if (!image.complete || !image.naturalWidth) return;
    const width = canvas.clientWidth, height = canvas.clientHeight;
    if (!width || !height) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#0c1917'; ctx.fillRect(0, 0, width, height);
    const source = document.createElement('canvas'); source.width = width; source.height = height;
    const sample = source.getContext('2d', { willReadFrequently: true });
    if (!sample) return;
    // Contain the complete source image; every edge remains in the composition.
    const fit = fitWholePhoto(image.naturalWidth, image.naturalHeight, width - 12, height - 64);
    fit.x += 6; fit.y += 32;
    sample.drawImage(image, fit.x, fit.y, fit.width, fit.height);
    const pixels = sample.getImageData(0, 0, width, height).data;
    for (let y = 1.5; y < height; y += 3) for (let x = 1.5; x < width; x += 3) {
      const i = (Math.floor(y) * width + Math.floor(x)) * 4;
      if (pixels[i + 3] === 0) continue;
      const brightness = (.2126 * pixels[i] + .7152 * pixels[i + 1] + .0722 * pixels[i + 2]) / 255;
      const light = Math.pow(brightness, .8);
      ctx.fillStyle = `rgb(${Math.round(48 + light * 183)} ${Math.round(85 + light * 162)} ${Math.round(61 + light * 148)})`;
      ctx.beginPath(); ctx.arc(x, y, .24 + light * 1.12, 0, Math.PI * 2); ctx.fill();
    }
  }
  image.addEventListener('load', render); render();
  if ('ResizeObserver' in window) new ResizeObserver(render).observe(canvas);
  else window.addEventListener('resize', render);
}
