// Leonida Trophy Guide: checklist tracker + guide reader, all offline.
// Data comes from data/trophies.json (official names, descriptions, grades;
// guides in our own words with their sources). Progress lives in localStorage
// and can be exported to a file and imported back. No network requests.
const EARNED_KEY = 'gta6-trophy-checklist-v2';
const SPOILER_KEY = 'gta6-trophy-spoiler';
const EXOPHASE_URL = 'https://www.exophase.com/game/grand-theft-auto-vi-psn/trophies/';
const PSNPROFILES_URL = 'https://psnprofiles.com/trophies/43531-grand-theft-auto-vi';

const rowsEl = document.getElementById('rows');
const detailEl = document.getElementById('detail');
const searchEl = document.getElementById('search');
const kindEl = document.getElementById('kind');
const gradeEl = document.getElementById('grade');
const earnedFilterEl = document.getElementById('earnedFilter');
const spoilerEl = document.getElementById('spoiler');

let guideDoc = null;
let earned = new Set(loadEarnedNames());
let spoilerOn = localStorage.getItem(SPOILER_KEY) === '1';
let selectedId = null;
let currentView = 'checklist';

function loadEarnedNames() {
  try {
    const parsed = JSON.parse(localStorage.getItem(EARNED_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function storeEarned() {
  localStorage.setItem(EARNED_KEY, JSON.stringify([...earned].sort()));
}

function storeSpoiler() {
  localStorage.setItem(SPOILER_KEY, spoilerOn ? '1' : '0');
}

function findTrophy(id) {
  return guideDoc.trophies.find((t) => t.id === id);
}

function isHiddenBySpoiler(t) {
  return spoilerOn && t.kind === 'story' && !earned.has(t.name);
}

function shownName(t) {
  return isHiddenBySpoiler(t) ? 'Hidden story trophy' : t.name;
}

function shownDescription(t) {
  return isHiddenBySpoiler(t)
    ? 'Hidden until earned — turn off the spoiler setting, or earn this trophy, to reveal it.'
    : t.description;
}

function gradeWord(t) {
  return t.grade.charAt(0).toUpperCase() + t.grade.slice(1);
}

function kindWord(t) {
  return t.missable ? 'Missable' : t.kind.charAt(0).toUpperCase() + t.kind.slice(1);
}

function passesFilters(t) {
  const q = searchEl.value.trim().toLowerCase();
  if (q && !(t.name + ' ' + t.description + ' ' + t.guide).toLowerCase().includes(q)) return false;
  if (kindEl.value === 'missable' && !t.missable) return false;
  if (kindEl.value === 'online') return false;
  if (kindEl.value !== 'all' && kindEl.value !== 'missable' && kindEl.value !== 'online' && t.kind !== kindEl.value) return false;
  if (gradeEl.value !== 'all' && t.grade !== gradeEl.value) return false;
  if (earnedFilterEl.value === 'earned' && !earned.has(t.name)) return false;
  if (earnedFilterEl.value === 'todo' && earned.has(t.name)) return false;
  return true;
}

function renderProgress() {
  const total = guideDoc.trophies.length;
  const byGrade = { platinum: 0, gold: 0, silver: 0, bronze: 0 };
  for (const t of guideDoc.trophies) if (earned.has(t.name)) byGrade[t.grade]++;
  document.getElementById('barFill').style.width = `${(earned.size / total) * 100}%`;
  document.getElementById('progressText').textContent = `${earned.size} of ${total} earned`;
  document.getElementById('gradeText').textContent =
    `${byGrade.platinum} platinum · ${byGrade.gold} gold · ${byGrade.silver} silver · ${byGrade.bronze} bronze`;
  document.getElementById('leftText').textContent = `${total - earned.size} to go`;
}

function makeBadge(text, cls) {
  const el = document.createElement('span');
  el.className = `badge ${cls}`;
  el.textContent = text;
  return el;
}

function makeRow(t, showMissableNote) {
  const li = document.createElement('li');
  li.dataset.id = String(t.id);
  li.tabIndex = 0;
  li.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      selectedId = t.id;
      if (showMissableNote) switchView('checklist');
      renderEverything();
    }
  });
  if (earned.has(t.name)) li.classList.add('earned');
  if (selectedId === t.id) li.classList.add('selected');
  const box = document.createElement('input');
  box.type = 'checkbox';
  box.checked = earned.has(t.name);
  box.setAttribute('aria-label', `Earned: ${t.name}`);
  box.addEventListener('click', (event) => event.stopPropagation());
  box.addEventListener('change', () => {
    if (box.checked) earned.add(t.name);
    else earned.delete(t.name);
    storeEarned();
    renderEverything();
  });
  const body = document.createElement('div');
  const title = document.createElement('h3');
  title.textContent = showMissableNote ? t.name : shownName(t);
  if (!showMissableNote && isHiddenBySpoiler(t)) {
    const tag = document.createElement('span');
    tag.className = 'hidden-tag';
    tag.textContent = ' · hidden';
    title.append(tag);
  }
  const desc = document.createElement('p');
  desc.textContent = showMissableNote && t.missableNote
    ? `${t.description} — ${t.missableNote}`
    : shownDescription(t);
  const meta = document.createElement('div');
  meta.className = 'meta';
  meta.append(makeBadge(gradeWord(t), t.grade));
  meta.append(makeBadge(kindWord(t), t.missable ? 'miss' : 'kind'));
  if (t.count) meta.append(makeBadge(`Target: ${t.count.toLocaleString('en-US')}`, 'kind'));
  body.append(title, desc, meta);
  const open = document.createElement('button');
  open.type = 'button';
  open.textContent = 'Guide';
  open.addEventListener('click', (event) => {
    event.stopPropagation();
    selectedId = t.id;
    switchView('checklist');
    renderEverything();
    detailEl.scrollIntoView({ block: 'nearest' });
  });
  li.append(box, body, open);
  li.addEventListener('click', () => {
    selectedId = t.id;
    if (showMissableNote) switchView('checklist');
    renderEverything();
  });
  return li;
}

function renderChecklist() {
  const list = guideDoc.trophies.filter(passesFilters);
  document.getElementById('onlineNote').hidden = kindEl.value !== 'online';
  document.getElementById('resultCount').textContent =
    kindEl.value === 'online'
      ? '0 trophies — the official list has no online trophies.'
      : `Showing ${list.length} of ${guideDoc.trophies.length} trophies`;
  rowsEl.replaceChildren();
  for (const t of list) rowsEl.append(makeRow(t, false));
}

function renderDetail() {
  const t = selectedId == null ? null : findTrophy(selectedId);
  detailEl.replaceChildren();
  if (!t) {
    const p = document.createElement('p');
    p.className = 'muted';
    p.textContent = 'Select a trophy to read its guide and sources.';
    detailEl.append(p);
    return;
  }
  const title = document.createElement('h2');
  title.textContent = shownName(t);
  const desc = document.createElement('p');
  desc.className = 'desc';
  desc.textContent = `“${shownDescription(t)}”`;
  const meta = document.createElement('div');
  meta.className = 'meta';
  meta.append(makeBadge(gradeWord(t), t.grade));
  meta.append(makeBadge(kindWord(t), t.missable ? 'miss' : 'kind'));
  if (t.count) meta.append(makeBadge(`Target: ${t.count.toLocaleString('en-US')}`, 'kind'));
  detailEl.append(title, desc, meta);
  if (t.missable && t.missableNote) {
    const warn = document.createElement('p');
    warn.className = 'warn';
    warn.textContent = `Missable — ${t.missableNote}`;
    detailEl.append(warn);
  }
  const guide = document.createElement('p');
  guide.className = 'guide';
  guide.textContent = isHiddenBySpoiler(t)
    ? 'This guide is hidden with the trophy until it is earned (spoiler setting is on).'
    : t.guide;
  detailEl.append(guide);
  if (!isHiddenBySpoiler(t)) {
    const sources = document.createElement('p');
    sources.className = 'sources';
    sources.textContent = 'Sources: ';
    const link1 = document.createElement('a');
    link1.href = EXOPHASE_URL;
    link1.textContent = 'Exophase — official trophy list (name, description, grade)';
    const link2 = document.createElement('a');
    link2.href = PSNPROFILES_URL;
    link2.textContent = 'PSNProfiles — trophy list (grade and count check)';
    sources.append(link1, document.createTextNode(' · '), link2, document.createTextNode('. Guide text is our own words from the official description.'));
    detailEl.append(sources);
  }
}

function renderRoadmap() {
  const list = document.getElementById('roadmap');
  list.replaceChildren();
  for (const stage of guideDoc.roadmap) {
    const li = document.createElement('li');
    const h = document.createElement('h3');
    const stageNo = document.createElement('span');
    stageNo.className = 'stage';
    stageNo.textContent = `Stage ${stage.stage} — `;
    h.append(stageNo, document.createTextNode(stage.title));
    const p = document.createElement('p');
    p.textContent = stage.text;
    const chips = document.createElement('div');
    chips.className = 'chips';
    for (const id of stage.trophies) {
      const t = findTrophy(id);
      const chip = document.createElement('span');
      chip.textContent = `${earned.has(t.name) ? '✓ ' : ''}${t.name} (${gradeWord(t)})`;
      if (earned.has(t.name)) chip.style.textDecoration = 'line-through';
      chip.addEventListener('click', () => {
        selectedId = id;
        switchView('checklist');
        renderEverything();
      });
      chips.append(chip);
    }
    li.append(h, p, chips);
    list.append(li);
  }
}

function renderMissable() {
  const list = document.getElementById('missableRows');
  list.replaceChildren();
  for (const t of guideDoc.trophies.filter((x) => x.missable)) {
    list.append(makeRow(t, true));
  }
}

function switchView(next) {
  currentView = next;
  for (const button of document.querySelectorAll('.tabs button')) {
    button.classList.toggle('active', button.dataset.view === next);
  }
  document.getElementById('view-checklist').hidden = next !== 'checklist';
  document.getElementById('view-roadmap').hidden = next !== 'roadmap';
  document.getElementById('view-missable').hidden = next !== 'missable';
}

function renderEverything() {
  renderProgress();
  renderChecklist();
  renderDetail();
  renderRoadmap();
  renderMissable();
}

function exportProgress() {
  const blob = new Blob([JSON.stringify({ game: 'Grand Theft Auto VI', earned: [...earned].sort() }, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'gta6-trophy-progress.json';
  a.click();
  URL.revokeObjectURL(a.href);
}

async function importProgress(file) {
  const data = JSON.parse(await file.text());
  const names = Array.isArray(data) ? data : data.earned;
  if (!Array.isArray(names)) throw new Error('Not a progress file: expected a list of trophy names.');
  const known = new Set(guideDoc.trophies.map((t) => t.name));
  earned = new Set(names.filter((n) => known.has(n)));
  storeEarned();
  renderEverything();
}

async function bootGuide() {
  const response = await fetch('data/trophies.json');
  guideDoc = await response.json();
  spoilerEl.checked = spoilerOn;
  for (const button of document.querySelectorAll('.tabs button')) {
    button.addEventListener('click', () => switchView(button.dataset.view));
  }
  searchEl.addEventListener('input', renderChecklist);
  kindEl.addEventListener('change', renderChecklist);
  gradeEl.addEventListener('change', renderChecklist);
  earnedFilterEl.addEventListener('change', renderChecklist);
  spoilerEl.addEventListener('change', () => {
    spoilerOn = spoilerEl.checked;
    storeSpoiler();
    renderEverything();
  });
  document.getElementById('export').addEventListener('click', exportProgress);
  document.getElementById('import').addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    try {
      await importProgress(file);
    } catch (error) {
      alert(`Could not import that file: ${error.message}`);
    }
    event.target.value = '';
  });
  document.getElementById('reset').addEventListener('click', () => {
    if (confirm('Clear all earned trophies?')) {
      earned = new Set();
      storeEarned();
      renderEverything();
    }
  });
  renderEverything();
}

await bootGuide();
