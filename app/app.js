// Leonida Trophy Guide: checklist tracker + guide reader, all offline.
// Data comes from data/trophies.json (official names, descriptions, grades;
// guides in our own words with their sources). Progress lives in localStorage
// and can be exported to a file and imported back. No network requests.
const KEY = 'gta6-trophy-checklist-v2';
const SPOILER_KEY = 'gta6-trophy-spoiler';
const EXOPHASE = 'https://www.exophase.com/game/grand-theft-auto-vi-psn/trophies/';
const PSNPROFILES = 'https://psnprofiles.com/trophies/43531-grand-theft-auto-vi';

const rowsEl = document.getElementById('rows');
const detailEl = document.getElementById('detail');
const searchEl = document.getElementById('search');
const kindEl = document.getElementById('kind');
const gradeEl = document.getElementById('grade');
const earnedFilterEl = document.getElementById('earnedFilter');
const spoilerEl = document.getElementById('spoiler');

let doc = null;
let earned = new Set(readStoredEarned());
let spoiler = localStorage.getItem(SPOILER_KEY) === '1';
let selectedId = null;
let view = 'checklist';

function readStoredEarned() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(raw) ? raw.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function saveEarned() {
  localStorage.setItem(KEY, JSON.stringify([...earned].sort()));
}

function saveSpoiler() {
  localStorage.setItem(SPOILER_KEY, spoiler ? '1' : '0');
}

function trophyById(id) {
  return doc.trophies.find((t) => t.id === id);
}

function isSpoilerHidden(t) {
  return spoiler && t.kind === 'story' && !earned.has(t.name);
}

function visibleName(t) {
  return isSpoilerHidden(t) ? 'Hidden story trophy' : t.name;
}

function visibleDescription(t) {
  return isSpoilerHidden(t)
    ? 'Hidden until earned — turn off the spoiler setting, or earn this trophy, to reveal it.'
    : t.description;
}

function gradeLabel(t) {
  return t.grade.charAt(0).toUpperCase() + t.grade.slice(1);
}

function kindLabel(t) {
  return t.missable ? 'Missable' : t.kind.charAt(0).toUpperCase() + t.kind.slice(1);
}

function matchesFilters(t) {
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
  const total = doc.trophies.length;
  const counts = { platinum: 0, gold: 0, silver: 0, bronze: 0 };
  for (const t of doc.trophies) if (earned.has(t.name)) counts[t.grade]++;
  document.getElementById('barFill').style.width = `${(earned.size / total) * 100}%`;
  document.getElementById('progressText').textContent = `${earned.size} of ${total} earned`;
  document.getElementById('gradeText').textContent =
    `${counts.platinum} platinum · ${counts.gold} gold · ${counts.silver} silver · ${counts.bronze} bronze`;
  document.getElementById('leftText').textContent = `${total - earned.size} to go`;
}

function badge(text, cls) {
  const s = document.createElement('span');
  s.className = `badge ${cls}`;
  s.textContent = text;
  return s;
}

function renderChecklist() {
  const list = doc.trophies.filter(matchesFilters);
  document.getElementById('onlineNote').hidden = kindEl.value !== 'online';
  document.getElementById('resultCount').textContent =
    kindEl.value === 'online'
      ? '0 trophies — the official list has no online trophies.'
      : `Showing ${list.length} of ${doc.trophies.length} trophies`;
  rowsEl.replaceChildren();
  for (const t of list) {
    const li = document.createElement('li');
    li.dataset.id = String(t.id);
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
      saveEarned();
      renderAll();
    });
    const body = document.createElement('div');
    const title = document.createElement('h3');
    title.textContent = visibleName(t);
    if (isSpoilerHidden(t)) {
      const tag = document.createElement('span');
      tag.className = 'hidden-tag';
      tag.textContent = ' · hidden';
      title.append(tag);
    }
    const desc = document.createElement('p');
    desc.textContent = visibleDescription(t);
    const meta = document.createElement('div');
    meta.className = 'meta';
    meta.append(badge(gradeLabel(t), t.grade));
    meta.append(badge(kindLabel(t), t.missable ? 'miss' : 'kind'));
    if (t.count) meta.append(badge(`Target: ${t.count.toLocaleString('en-US')}`, 'kind'));
    body.append(title, desc, meta);
    const open = document.createElement('button');
    open.type = 'button';
    open.textContent = 'Guide';
    open.addEventListener('click', (event) => {
      event.stopPropagation();
      selectedId = t.id;
      renderAll();
      detailEl.scrollIntoView({ block: 'nearest' });
    });
    li.append(box, body, open);
    li.addEventListener('click', () => {
      selectedId = t.id;
      renderAll();
    });
    rowsEl.append(li);
  }
}

function renderDetail() {
  const t = selectedId == null ? null : trophyById(selectedId);
  detailEl.replaceChildren();
  if (!t) {
    const p = document.createElement('p');
    p.className = 'muted';
    p.textContent = 'Select a trophy to read its guide and sources.';
    detailEl.append(p);
    return;
  }
  const title = document.createElement('h2');
  title.textContent = visibleName(t);
  const desc = document.createElement('p');
  desc.className = 'desc';
  desc.textContent = `“${visibleDescription(t)}”`;
  const meta = document.createElement('div');
  meta.className = 'meta';
  meta.append(badge(gradeLabel(t), t.grade));
  meta.append(badge(kindLabel(t), t.missable ? 'miss' : 'kind'));
  if (t.count) meta.append(badge(`Target: ${t.count.toLocaleString('en-US')}`, 'kind'));
  detailEl.append(title, desc, meta);
  if (t.missable && t.missableNote) {
    const warn = document.createElement('p');
    warn.className = 'warn';
    warn.textContent = `Missable — ${t.missableNote}`;
    detailEl.append(warn);
  }
  const guide = document.createElement('p');
  guide.className = 'guide';
  guide.textContent = isSpoilerHidden(t)
    ? 'This guide is hidden with the trophy until it is earned (spoiler setting is on).'
    : t.guide;
  detailEl.append(guide);
  if (!isSpoilerHidden(t)) {
    const sources = document.createElement('p');
    sources.className = 'sources';
    sources.textContent = 'Sources: ';
    const a1 = document.createElement('a');
    a1.href = EXOPHASE;
    a1.textContent = 'Exophase — official trophy list (name, description, grade)';
    const a2 = document.createElement('a');
    a2.href = PSNPROFILES;
    a2.textContent = 'PSNProfiles — trophy list (grade and count check)';
    sources.append(a1, document.createTextNode(' · '), a2, document.createTextNode('. Guide text is our own words from the official description.'));
    detailEl.append(sources);
  }
}

function renderRoadmap() {
  const list = document.getElementById('roadmap');
  list.replaceChildren();
  for (const stage of doc.roadmap) {
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
      const t = trophyById(id);
      const chip = document.createElement('span');
      chip.textContent = `${earned.has(t.name) ? '✓ ' : ''}${t.name} (${gradeLabel(t)})`;
      if (earned.has(t.name)) chip.style.textDecoration = 'line-through';
      chip.addEventListener('click', () => {
        selectedId = id;
        setView('checklist');
        renderAll();
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
  for (const t of doc.trophies.filter((x) => x.missable)) {
    const li = document.createElement('li');
    li.dataset.id = String(t.id);
    if (earned.has(t.name)) li.classList.add('earned');
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = earned.has(t.name);
    box.addEventListener('click', (event) => event.stopPropagation());
    box.addEventListener('change', () => {
      if (box.checked) earned.add(t.name);
      else earned.delete(t.name);
      saveEarned();
      renderAll();
    });
    const body = document.createElement('div');
    const title = document.createElement('h3');
    title.textContent = t.name;
    const desc = document.createElement('p');
    desc.textContent = t.missableNote ? `${t.description} — ${t.missableNote}` : t.description;
    const meta = document.createElement('div');
    meta.className = 'meta';
    meta.append(badge(gradeLabel(t), t.grade), badge('Missable', 'miss'));
    const open = document.createElement('button');
    open.type = 'button';
    open.textContent = 'Guide';
    open.addEventListener('click', (event) => {
      event.stopPropagation();
      selectedId = t.id;
      setView('checklist');
      renderAll();
    });
    body.append(title, desc, meta);
    li.append(box, body, open);
    li.addEventListener('click', () => {
      selectedId = t.id;
      setView('checklist');
      renderAll();
    });
    list.append(li);
  }
}

function setView(next) {
  view = next;
  for (const button of document.querySelectorAll('.tabs button')) {
    button.classList.toggle('active', button.dataset.view === next);
  }
  document.getElementById('view-checklist').hidden = next !== 'checklist';
  document.getElementById('view-roadmap').hidden = next !== 'roadmap';
  document.getElementById('view-missable').hidden = next !== 'missable';
}

function renderAll() {
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
  const known = new Set(doc.trophies.map((t) => t.name));
  earned = new Set(names.filter((n) => known.has(n)));
  saveEarned();
  renderAll();
}

async function loadGuide() {
  const response = await fetch('data/trophies.json');
  doc = await response.json();
  spoilerEl.checked = spoiler;
  for (const button of document.querySelectorAll('.tabs button')) {
    button.addEventListener('click', () => {
      setView(button.dataset.view);
    });
  }
  searchEl.addEventListener('input', renderChecklist);
  kindEl.addEventListener('change', renderChecklist);
  gradeEl.addEventListener('change', renderChecklist);
  earnedFilterEl.addEventListener('change', renderChecklist);
  spoilerEl.addEventListener('change', () => {
    spoiler = spoilerEl.checked;
    saveSpoiler();
    renderAll();
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
      saveEarned();
      renderAll();
    }
  });
  renderAll();
}

await loadGuide();
