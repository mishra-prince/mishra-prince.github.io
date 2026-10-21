import { initIDCard } from './idcard.js';
import { projects, categoryLabels, filterProjects, matchCommands, projectFromHash, escapeHTML } from './projects.js';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const root = document.documentElement;
const state = { filter: 'all', flipped: new Set(), commandIndex: 0, filteredCommands: [], returnHash: '#projects' };
const dialogs = $$('dialog');
let toastTimer;

function setting(key, fallback) {
  try { return localStorage.getItem(`prince-${key}`) || fallback; } catch { return fallback; }
}
function saveSetting(key, value) {
  try { localStorage.setItem(`prince-${key}`, value); } catch { /* Settings remain usable for this visit. */ }
}
function notify(message) {
  clearTimeout(toastTimer);
  const toast = $('#toast');
  const host = dialogs.find(dialog => dialog.open) || document.body;
  if (toast.parentElement !== host) host.append(toast);
  toast.textContent = message;
  toast.classList.add('visible');
  toastTimer = setTimeout(() => toast.classList.remove('visible'), 3200);
}
function setTheme(theme, persist = true) {
  root.dataset.theme = theme;
  $('#theme-toggle').setAttribute('aria-pressed', String(theme === 'dark'));
  $('#theme-toggle').setAttribute('aria-label', `Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`);
  $('meta[name="theme-color"]').content = theme === 'dark' ? '#1e2529' : '#f7f4ea';
  if (persist) saveSetting('theme', theme);
}
function setMotion(value, persist = true) {
  root.dataset.motion = value;
  $('#motion-toggle').textContent = `Motion: ${value}`;
  $('#motion-toggle').setAttribute('aria-pressed', String(value === 'off'));
  if (persist) saveSetting('motion', value);
}
setTheme(root.dataset.theme === 'dark' ? 'dark' : 'light', false);
if (/Mac|iPhone|iPad/.test(navigator.platform || '')) $('.command-trigger kbd').textContent = '⌘ K';
const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || false;
setMotion(setting('motion', prefersReducedMotion ? 'off' : 'on'), false);
$('#theme-toggle').addEventListener('click', () => setTheme(root.dataset.theme === 'dark' ? 'light' : 'dark'));
$('#motion-toggle').addEventListener('click', () => setMotion(root.dataset.motion === 'off' ? 'on' : 'off'));

function renderCover(type) {
  switch (type) {
    case 'payment': return '<div class="payment-cover"><div class="payment-caption"><span>SPENDING POLICY</span><span>DEMO</span></div><div class="payment-amount">$2.00 <span style="font-size:10px;font-family:var(--mono)">/ $10.00</span></div><div class="payment-bar"><i></i></div><div class="payment-receipt"><span>DELIVERY INTEGRITY</span><b>✓ VERIFIED</b></div></div>';
    case 'calendar': return '<div class="calendar-cover"><div class="calendar-top"><span>YOUR NEXT BUILD</span><span>← →</span></div><div class="calendar-grid">' + Array.from({ length: 14 }, (_, i) => `<span class="${[4, 9].includes(i) ? 'marked' : ''}">${i + 8}</span>`).join('') + '</div><div class="calendar-tag"><i></i> DEADLINE? ON THE RADAR.</div></div>';
    case 'voice': return '<div class="voice-cover"><div class="voice-wave">' + [12, 23, 36, 22, 44, 30, 18, 41, 28, 13].map(height => `<i style="--bar:${height}px"></i>`).join('') + '</div><div class="voice-caption"><strong>Hello. Namaste.</strong>VOICE → MEMORY → HUMAN REVIEW</div></div>';
    case 'ant': return '<div class="ant-cover"><div class="ant-icon"><i></i><i></i><i></i></div><div class="ant-data">PROTOCOL PREVIEW<br>STATE <b>WAIT_PC</b><br>TELEMETRY 5 Hz<br><span>PC ↔ ESP32-C3</span></div></div>';
    case 'shield': return '<div class="shield-cover"><span class="shield-glyph">!</span><div class="shield-lines">SEMANTIC RISK / DEMO<strong>PAUSE. VERIFY.</strong><div class="shield-pips"><i></i><i></i><i></i><i></i></div>TRUST TAKES MORE THAN A VOICE</div></div>';
    case 'sensor': return '<div class="sensor-cover"><div class="sensor-box"><b>⌑</b><span>DETECTION</span></div><span class="sensor-arrow">→</span><div class="sensor-box"><b>!</b><span>DRIVER ALERT</span></div></div>';
    default: return '';
  }
}

function renderProjects() {
  const visible = filterProjects(state.filter);
  $('#projects-grid').innerHTML = visible.map(project => {
    const flipped = state.flipped.has(project.id);
    return `<article class="project-card${flipped ? ' is-flipped' : ''}" style="--card-color:${project.colour}" data-project="${project.id}" aria-label="${escapeHTML(project.name)} project">
      <div class="card-rotator"><div class="card-face card-front" aria-hidden="${flipped}" ${flipped ? 'inert' : ''}><div class="card-topline"><span>${project.label}</span><span>${project.status}</span></div><h3>${project.name}</h3><p class="card-description">${project.summary}</p><div class="project-cover" aria-hidden="true">${renderCover(project.cover)}</div></div>
      <div class="card-face card-back" aria-hidden="${!flipped}" ${!flipped ? 'inert' : ''}><span class="back-eyebrow">${project.name.toUpperCase()} / FIELD NOTES</span><h3>Under the hood.</h3><div class="back-tech">${project.tech.map(tech => `<span>${escapeHTML(tech)}</span>`).join('')}</div><ul class="back-details">${project.facts.map(fact => `<li>${escapeHTML(fact)}</li>`).join('')}</ul><span class="back-footnote">EVERY BUILD LEAVES YOU A LITTLE BETTER.</span></div></div>
      <div class="card-footer"><button type="button" data-flip="${project.id}" aria-pressed="${flipped}" aria-label="${flipped ? 'Show the front of' : 'Flip'} ${project.name}">${flipped ? '↶ Back to cover' : '↻ Flip card'}</button><button type="button" data-explore="${project.id}" aria-label="Explore ${project.name}">Explore build <span aria-hidden="true">↗</span></button></div></article>`;
  }).join('');
  $('#project-count').textContent = state.filter === 'all' ? `Showing all ${visible.length} projects.` : `Showing ${visible.length} ${categoryLabels[state.filter]} ${visible.length === 1 ? 'project' : 'projects'}.`;
}
function flipCard(id) {
  const card = $(`[data-project="${id}"]`);
  if (!card) return;
  const flipped = !state.flipped.has(id);
  if (flipped) state.flipped.add(id); else state.flipped.delete(id);
  card.classList.toggle('is-flipped', flipped);
  $('.card-front', card).setAttribute('aria-hidden', String(flipped));
  $('.card-back', card).setAttribute('aria-hidden', String(!flipped));
  $('.card-front', card).inert = flipped;
  $('.card-back', card).inert = !flipped;
  const button = $('[data-flip]', card);
  button.setAttribute('aria-pressed', String(flipped));
  const project = projects.find(project => project.id === id);
  button.setAttribute('aria-label', `${flipped ? 'Show the front of' : 'Flip'} ${project.name}`);
  button.textContent = flipped ? '↶ Back to cover' : '↻ Flip card';
  $('#project-count').textContent = `${project.name}: showing ${flipped ? 'technical field notes' : 'the project cover'}.`;
}
$('#projects-grid').addEventListener('click', event => {
  const flip = event.target.closest('[data-flip]');
  const explore = event.target.closest('[data-explore]');
  if (flip) flipCard(flip.dataset.flip);
  if (explore) openProject(explore.dataset.explore);
});
$$('[data-filter]').forEach(button => button.addEventListener('click', () => {
  state.filter = button.dataset.filter;
  $$('[data-filter]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
  renderProjects();
}));
renderProjects();

function closeDialog(dialog, updateHash = true) {
  if (!dialog.open) return;
  if (dialog.id === 'project-dialog' && updateHash && projectFromHash(location.hash)) history.replaceState(null, '', state.returnHash);
  dialog.close();
}
function openDialog(dialog) {
  dialog.returnFocus = document.activeElement;
  dialogs.filter(item => item !== dialog && item.open).forEach(item => closeDialog(item));
  if (!dialog.open) dialog.showModal();
}
dialogs.forEach(dialog => {
  $$('[data-close-dialog]', dialog).forEach(button => button.addEventListener('click', () => closeDialog(dialog)));
  dialog.addEventListener('cancel', event => { event.preventDefault(); closeDialog(dialog); });
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) closeDialog(dialog);
  });
  dialog.addEventListener('close', () => queueMicrotask(() => {
    if ($('#toast').parentElement === dialog) document.body.append($('#toast'));
    const target = dialog.returnFocus;
    if (!dialogs.some(item => item.open) && target?.isConnected && !target.closest('dialog:not([open])')) target.focus({ preventScroll: true });
  }));
});

function openProject(id, updateHash = true) {
  const project = projects.find(item => item.id === id);
  if (!project) return;
  const dialog = $('#project-dialog');
  if (!dialog.open) state.returnHash = projectFromHash(location.hash) ? '#projects' : location.hash || '#projects';
  dialog.style.setProperty('--modal-color', project.colour);
  $('#project-dialog-kicker').textContent = `${project.label} / PROJECT FILE`;
  $('#project-dialog-body').innerHTML = `<div class="project-dialog-content"><div class="project-modal-label"><span aria-hidden="true"></span>${project.status}</div><h2 id="project-dialog-title">${project.name}</h2><p class="project-modal-lede">${project.detail}</p><div class="project-modal-tech">${project.tech.map(tech => `<span>${escapeHTML(tech)}</span>`).join('')}</div><div class="project-modal-grid"><section><h3>THE WHAT IF</h3><p>${project.problem}</p></section><section><h3>WHAT I BUILT</h3><ul>${project.built.map(item => `<li>${escapeHTML(item)}</li>`).join('')}</ul></section><section style="grid-column:1/-1"><h3>WHAT IT TAUGHT ME</h3><p>${project.learning}</p></section></div><p class="project-modal-scope"><strong>Current scope.</strong> ${project.scope}</p><div class="project-modal-actions">${project.repo ? `<a class="button button-dark" href="https://github.com/mishra-prince/${project.repo}" target="_blank" rel="noopener noreferrer">Explore the source ↗</a>` : '<a class="button button-dark" href="mailto:pm023847@gmail.com?subject=Passenger%20Detector%20project">Ask me about this build ↗</a>'}<button type="button" class="button button-paper" id="share-project">Copy project link ⧉</button></div></div>`;
  $('#share-project').addEventListener('click', () => copyText(`${location.origin}${location.pathname}#project=${project.id}`, 'Project link copied.'));
  openDialog(dialog);
  dialog.scrollTop = 0;
  if (updateHash) history.replaceState(null, '', `#project=${project.id}`);
}
function openResume() {
  const image = $('#resume-image');
  if (!image.getAttribute('src')) image.src = image.dataset.src;
  openDialog($('#resume-dialog'));
}
$('#resume-trigger').addEventListener('click', openResume);
window.addEventListener('hashchange', () => {
  const project = projectFromHash(location.hash);
  if (project) openProject(project.id, false);
  else closeDialog($('#project-dialog'), false);
});

async function copyText(text, successMessage) {
  try {
    if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text);
    else {
      const textarea = document.createElement('textarea');
      textarea.value = text; textarea.style.position = 'fixed'; textarea.style.opacity = '0';
      document.body.append(textarea); textarea.select();
      const success = document.execCommand('copy'); textarea.remove();
      if (!success) throw new Error('Clipboard unavailable');
    }
    notify(successMessage);
  } catch { notify(text); }
}
$('#copy-email').addEventListener('click', () => copyText('pm023847@gmail.com', 'Email copied. Say hello!'));

const menuButton = $('#menu-toggle');
function closeMenu() { $('#main-nav').classList.remove('open'); menuButton.setAttribute('aria-expanded', 'false'); menuButton.setAttribute('aria-label', 'Open navigation'); }
menuButton.addEventListener('click', () => {
  const open = $('#main-nav').classList.toggle('open');
  menuButton.setAttribute('aria-expanded', String(open)); menuButton.setAttribute('aria-label', `${open ? 'Close' : 'Open'} navigation`);
});
$$('#main-nav a').forEach(link => link.addEventListener('click', closeMenu));
document.addEventListener('click', event => { if (!event.target.closest('.site-header')) closeMenu(); });

function showTab(id, focus = false) {
  const tabs = $$('[data-tab]');
  tabs.forEach(tab => {
    const active = tab.dataset.tab === id;
    tab.setAttribute('aria-selected', String(active)); tab.tabIndex = active ? 0 : -1;
    $(`#panel-${tab.dataset.tab}`).hidden = !active;
    if (active && focus) tab.focus();
  });
}
$$('[data-tab]').forEach((tab, index, tabs) => {
  tab.addEventListener('click', () => showTab(tab.dataset.tab));
  tab.addEventListener('keydown', event => {
    let target;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') target = (index + 1) % tabs.length;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') target = (index - 1 + tabs.length) % tabs.length;
    if (event.key === 'Home') target = 0;
    if (event.key === 'End') target = tabs.length - 1;
    if (target !== undefined) { event.preventDefault(); showTab(tabs[target].dataset.tab, true); }
  });
});

function closeByte() { $('#byte-bubble').hidden = true; $('#avatar-button').setAttribute('aria-expanded', 'false'); }
$('#avatar-button').addEventListener('click', () => {
  const open = $('#byte-bubble').hidden;
  $('#byte-bubble').hidden = !open; $('#avatar-button').setAttribute('aria-expanded', String(open));
});
$('#byte-close').addEventListener('click', closeByte);
$('#byte-bubble a').addEventListener('click', closeByte);
document.addEventListener('click', event => { if (!event.target.closest('.hero-art')) closeByte(); });

function navigate(id) {
  closeMenu();
  const element = document.getElementById(id);
  if (element) { history.replaceState(null, '', `#${id}`); element.scrollIntoView({ behavior: root.dataset.motion === 'off' ? 'instant' : 'smooth' }); }
}
const commands = [
  { label: 'Explore the project drawer', keywords: 'projects builds work software robots', hint: 'GO TO SECTION', run: () => navigate('projects') },
  { label: 'Meet the human', keywords: 'about prince biography', hint: 'GO TO SECTION', run: () => navigate('about') },
  { label: 'Open my toolkit', keywords: 'skills python languages hardware', hint: 'GO TO SECTION', run: () => navigate('toolkit') },
  { label: 'Read the journey', keywords: 'school education experience certifications', hint: 'GO TO SECTION', run: () => navigate('journey') },
  { label: 'Say hello', keywords: 'contact email internship', hint: 'GO TO SECTION', run: () => navigate('contact') },
  { label: 'View my résumé', keywords: 'resume cv download pdf word', hint: 'OPEN DOCUMENT', run: openResume },
  { label: 'Copy my email address', keywords: 'contact clipboard', hint: 'QUICK ACTION', run: () => copyText('pm023847@gmail.com', 'Email copied. Say hello!') },
  { label: 'Switch colour theme', keywords: 'dark light color appearance', hint: 'QUICK ACTION', run: () => setTheme(root.dataset.theme === 'dark' ? 'light' : 'dark') },
  ...projects.map(project => ({ label: project.name, keywords: `${project.category} ${project.tech.join(' ')}`, hint: 'OPEN PROJECT', run: () => openProject(project.id) }))
];
function renderCommandResults() {
  state.filteredCommands = matchCommands(commands, $('#command-input').value);
  state.commandIndex = 0;
  $('#command-results').innerHTML = state.filteredCommands.length ? state.filteredCommands.map((command, index) => `<li role="presentation"><button type="button" role="option" id="command-option-${index}" data-command="${index}" aria-selected="${index === 0}"><span>${escapeHTML(command.label)}</span><span>${command.hint} ↵</span></button></li>`).join('') : '<li class="command-empty" role="presentation">No matches. Try “projects”, “résumé” or “Python”.</li>';
  updateCommandSelection();
}
function updateCommandSelection() {
  const options = $$('[data-command]', $('#command-results'));
  options.forEach((option, index) => option.setAttribute('aria-selected', String(index === state.commandIndex)));
  if (options[state.commandIndex]) $('#command-input').setAttribute('aria-activedescendant', options[state.commandIndex].id);
  else $('#command-input').removeAttribute('aria-activedescendant');
}
function runCommand(index) {
  const command = state.filteredCommands[index];
  if (!command) return;
  closeDialog($('#command-dialog')); command.run();
}
function openCommands() {
  $('#command-input').value = ''; renderCommandResults(); openDialog($('#command-dialog')); $('#command-input').focus();
}
$('#command-trigger').addEventListener('click', openCommands);
$('#command-input').addEventListener('input', renderCommandResults);
$('#command-input').addEventListener('keydown', event => {
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault();
    if (!state.filteredCommands.length) return;
    state.commandIndex = (state.commandIndex + (event.key === 'ArrowDown' ? 1 : -1) + state.filteredCommands.length) % state.filteredCommands.length;
    updateCommandSelection();
    $(`#command-option-${state.commandIndex}`)?.scrollIntoView({ block: 'nearest' });
  }
  if (event.key === 'Enter') { event.preventDefault(); runCommand(state.commandIndex); }
});
$('#command-results').addEventListener('click', event => {
  const option = event.target.closest('[data-command]');
  if (option) runCommand(Number(option.dataset.command));
});
document.addEventListener('keydown', event => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault(); if ($('#command-dialog').open) closeDialog($('#command-dialog')); else openCommands();
  }
  if (event.key === 'Escape') { closeMenu(); closeByte(); }
});

function updateClock() {
  try { $('#delhi-clock').textContent = `${new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date())} IST`; }
  catch { $('#delhi-clock').textContent = 'IST'; }
}
updateClock(); setInterval(updateClock, 60000);
$('#year').textContent = new Date().getFullYear();
let scrollPending = false;
function updateProgress() {
  const total = document.documentElement.scrollHeight - innerHeight;
  $('#progress-bar').style.width = `${total > 0 ? Math.min(100, Math.max(0, scrollY / total * 100)) : 0}%`;
  scrollPending = false;
}
window.addEventListener('scroll', () => { if (!scrollPending) { scrollPending = true; requestAnimationFrame(updateProgress); } }, { passive: true });
window.addEventListener('resize', updateProgress); updateProgress();

if ('IntersectionObserver' in window) {
  const reveals = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.remove('pending'); reveals.unobserve(entry.target); } }), { threshold: 0.12 });
  $$('.reveal').forEach(element => { if (!prefersReducedMotion && root.dataset.motion !== 'off') element.classList.add('pending'); reveals.observe(element); });
  const sections = new IntersectionObserver(entries => entries.forEach(entry => {
    if (entry.isIntersecting) $$('#main-nav a').forEach(link => { if (link.hash === `#${entry.target.id}`) link.setAttribute('aria-current', 'location'); else link.removeAttribute('aria-current'); });
  }), { rootMargin: '-15% 0px -65% 0px' });
  ['projects', 'about', 'journey', 'contact'].forEach(id => sections.observe(document.getElementById(id)));
}
const linkedProject = projectFromHash(location.hash);
if (linkedProject) { document.getElementById('projects').scrollIntoView({ behavior: 'instant' }); openProject(linkedProject.id, false); }

initIDCard({ openDialog, copyText });
