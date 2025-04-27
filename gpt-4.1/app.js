// ========== State & Storage ==========
const STORAGE_KEY = 'flashcard_decks_v1';
const STATS_KEY = 'flashcard_stats_v1';
const MODE_KEY = 'flashcard_mode';
let decks = {};
let stats = {};
let currentDeck = null;
let studyCards = [];
let studyIndex = 0;
let studyOrder = 'sequential';
let studyNum = 10;
let studyCategory = '';
let studyTimeLimit = 0;
let studyTimer = null;
let autoplay = false;
let darkMode = false;

// ========== Utility ==========
function saveDecks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(decks));
}
function loadDecks() {
  decks = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
}
function saveStats() {
  localStorage.setItem(STATS_KEY, JSON.stringify(stats));
}
function loadStats() {
  stats = JSON.parse(localStorage.getItem(STATS_KEY) || '{}');
}
function saveMode() {
  localStorage.setItem(MODE_KEY, darkMode ? 'dark' : 'light');
}
function loadMode() {
  darkMode = localStorage.getItem(MODE_KEY) === 'dark';
  document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
  document.getElementById('toggle-mode').textContent = darkMode ? '☀️' : '🌙';
}
function showError(msg) {
  const err = document.getElementById('error-message');
  err.textContent = msg;
  err.hidden = false;
  setTimeout(() => { err.hidden = true; }, 4000);
}
function getDeckStats(deckName) {
  if (!stats[deckName]) stats[deckName] = {};
  return stats[deckName];
}
function getCardStats(deckName, cardIdx) {
  const deckStats = getDeckStats(deckName);
  if (!deckStats[cardIdx]) deckStats[cardIdx] = {viewed:0, correct:0, incorrect:0, easy:false, difficult:false};
  return deckStats[cardIdx];
}
function getDeckCategories(deck) {
  const cats = new Set();
  deck.cards.forEach(c => { if (c.category) cats.add(c.category); });
  return Array.from(cats);
}
function downloadCSV(filename, content) {
  const blob = new Blob([content], {type: 'text/csv'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ========== Deck Management ==========
function renderDeckList() {
  const list = document.getElementById('deck-list');
  list.innerHTML = '';
  Object.entries(decks).forEach(([name, deck]) => {
    const li = document.createElement('li');
    li.innerHTML = `<span tabindex="0">${name} (${deck.cards.length} cards)</span>`;
    const studyBtn = document.createElement('button');
    studyBtn.textContent = 'Study';
    studyBtn.onclick = () => showStudyConfig(name);
    studyBtn.setAttribute('aria-label', `Study deck ${name}`);
    const renameBtn = document.createElement('button');
    renameBtn.textContent = 'Rename';
    renameBtn.onclick = () => renameDeck(name);
    renameBtn.setAttribute('aria-label', `rename deck ${name}`);
    const delBtn = document.createElement('button');
    delBtn.textContent = 'Delete';
    delBtn.onclick = () => deleteDeck(name);
    delBtn.setAttribute('aria-label', `delete deck ${name}`);
    li.append(studyBtn, renameBtn, delBtn);
    list.appendChild(li);
  });
}
function deleteDeck(name) {
  if (confirm(`Delete deck '${name}'?`)) {
    delete decks[name];
    delete stats[name];
    saveDecks();
    saveStats();
    renderDeckList();
  }
}
function renameDeck(oldName) {
  const newName = prompt('Rename deck:', oldName);
  if (!newName || newName === oldName || decks[newName]) return;
  decks[newName] = decks[oldName];
  delete decks[oldName];
  stats[newName] = stats[oldName] || {};
  delete stats[oldName];
  saveDecks();
  saveStats();
  renderDeckList();
}
function handleCSVUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete: (results) => {
      const {data, errors, meta} = results;
      if (errors.length) {
        showError('CSV parse error: ' + errors[0].message);
        return;
      }
      if (!meta.fields.includes('question') || !meta.fields.includes('answer')) {
        showError('CSV must have columns: question, answer');
        return;
      }
      const cards = data.map(row => ({
        question: row.question || '',
        answer: row.answer || '',
        image_url: row.image_url || '',
        category: row.category || ''
      })).filter(c => c.question && c.answer);
      if (!cards.length) {
        showError('No valid cards found.');
        return;
      }
      let name = file.name.replace(/\.csv$/i, '');
      let base = name, i = 2;
      while (decks[name]) name = base + ' (' + (i++) + ')';
      decks[name] = {cards};
      saveDecks();
      renderDeckList();
      e.target.value = '';
    }
  });
}
function downloadSampleCSV() {
  const sample = 'question,answer,image_url,category\nWhat is the capital of France?,Paris,,Geography\n2+2=?,4,,Math\n';
  downloadCSV('sample_flashcards.csv', sample);
}

// ========== Study Config ==========
function showStudyConfig(deckName) {
  currentDeck = deckName;
  document.getElementById('deck-library').hidden = true;
  document.getElementById('study-config').hidden = false;
  document.getElementById('study-interface').hidden = true;
  document.getElementById('merge-decks').hidden = true;
  // Populate categories
  const catSel = document.getElementById('category-select');
  catSel.innerHTML = '<option value="">All</option>';
  getDeckCategories(decks[deckName]).forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = cat;
    catSel.appendChild(opt);
  });
}
document.getElementById('back-to-library').onclick = () => {
  document.getElementById('deck-library').hidden = false;
  document.getElementById('study-config').hidden = true;
};
document.getElementById('study-options').onsubmit = e => {
  e.preventDefault();
  studyOrder = document.getElementById('order-mode').value;
  studyNum = parseInt(document.getElementById('num-cards').value) || 10;
  studyTimeLimit = parseInt(document.getElementById('time-limit').value) || 0;
  studyCategory = document.getElementById('category-select').value;
  startStudy();
};

// ========== Study Interface ==========
function startStudy() {
  const deck = decks[currentDeck];
  let cards = deck.cards.map((c, i) => ({...c, idx: i}));
  if (studyCategory) cards = cards.filter(c => c.category === studyCategory);
  if (studyOrder === 'random') cards = shuffle(cards);
  if (studyNum > 0 && studyNum < cards.length) cards = cards.slice(0, studyNum);
  studyCards = cards;
  studyIndex = 0;
  document.getElementById('deck-library').hidden = true;
  document.getElementById('study-config').hidden = true;
  document.getElementById('study-interface').hidden = false;
  document.getElementById('merge-decks').hidden = true;
  renderCard();
}
function renderCard() {
  if (!studyCards.length) {
    showError('No cards to study.');
    exitStudy();
    return;
  }
  const card = studyCards[studyIndex];
  const deckStats = getDeckStats(currentDeck);
  const cardStats = getCardStats(currentDeck, card.idx);
  // Progress
  document.getElementById('progress').textContent = `Card ${studyIndex+1} / ${studyCards.length}`;
  // Card faces
  const flashcard = document.getElementById('flashcard');
  flashcard.classList.remove('flipped');
  flashcard.querySelector('.card-front').textContent = card.question;
  flashcard.querySelector('.card-back').textContent = card.answer;
  // Image
  const img = document.getElementById('card-image');
  if (card.image_url) {
    img.src = card.image_url;
    img.hidden = false;
    img.alt = 'Card image';
  } else {
    img.hidden = true;
    img.alt = '';
  }
  // Mark controls
  document.getElementById('mark-easy').style.background = cardStats.easy ? 'var(--easy)' : '';
  document.getElementById('mark-difficult').style.background = cardStats.difficult ? 'var(--difficult)' : '';
  // Timer
  if (studyTimeLimit > 0) {
    if (studyTimer) clearTimeout(studyTimer);
    studyTimer = setTimeout(() => {
      nextCard();
    }, studyTimeLimit * 1000);
  }
  // Focus for accessibility
  flashcard.focus();
}
function flipCard() {
  const flashcard = document.getElementById('flashcard');
  flashcard.classList.toggle('flipped');
}
function prevCard() {
  if (studyIndex > 0) {
    studyIndex--;
    renderCard();
  }
}
function nextCard() {
  if (studyIndex < studyCards.length - 1) {
    studyIndex++;
    renderCard();
  } else {
    exitStudy();
  }
}
function markCard(type) {
  const card = studyCards[studyIndex];
  const cardStats = getCardStats(currentDeck, card.idx);
  cardStats.viewed++;
  if (type === 'correct') cardStats.correct++;
  if (type === 'incorrect') cardStats.incorrect++;
  if (type === 'easy') cardStats.easy = !cardStats.easy;
  if (type === 'difficult') cardStats.difficult = !cardStats.difficult;
  saveStats();
  renderCard();
}
function showHint() {
  showError('No hint available for this card.');
}
function exitStudy() {
  if (studyTimer) clearTimeout(studyTimer);
  document.getElementById('deck-library').hidden = false;
  document.getElementById('study-config').hidden = true;
  document.getElementById('study-interface').hidden = true;
  document.getElementById('merge-decks').hidden = true;
  renderDeckList();
}
function shuffle(arr) {
  return arr.map(a => [Math.random(), a]).sort((a,b)=>a[0]-b[0]).map(a=>a[1]);
}

// ========== Keyboard Shortcuts ==========
document.addEventListener('keydown', e => {
  if (document.getElementById('study-interface').hidden) return;
  if (e.key === 'ArrowRight') nextCard();
  if (e.key === 'ArrowLeft') prevCard();
  if (e.key === ' ') { e.preventDefault(); flipCard(); }
  if (e.key === 'e') markCard('easy');
  if (e.key === 'd') markCard('difficult');
  if (e.key === 'c') markCard('correct');
  if (e.key === 'i') markCard('incorrect');
  if (e.key === 'h') showHint();
});

// ========== Event Listeners ==========
document.getElementById('csv-upload').addEventListener('change', handleCSVUpload);
document.getElementById('download-template').onclick = downloadSampleCSV;
document.getElementById('toggle-mode').onclick = () => {
  darkMode = !darkMode;
  document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
  document.getElementById('toggle-mode').textContent = darkMode ? '☀️' : '🌙';
  saveMode();
};
document.getElementById('flip-card').onclick = flipCard;
document.getElementById('prev-card').onclick = prevCard;
document.getElementById('next-card').onclick = nextCard;
document.getElementById('autoplay').onclick = () => {
  autoplay = !autoplay;
  if (autoplay) autoPlayLoop();
};
document.getElementById('mark-easy').onclick = () => markCard('easy');
document.getElementById('mark-difficult').onclick = () => markCard('difficult');
document.getElementById('mark-correct').onclick = () => markCard('correct');
document.getElementById('mark-incorrect').onclick = () => markCard('incorrect');
document.getElementById('show-hint').onclick = showHint;
document.getElementById('exit-study').onclick = exitStudy;

function autoPlayLoop() {
  if (!autoplay || document.getElementById('study-interface').hidden) return;
  flipCard();
  setTimeout(() => {
    nextCard();
    if (autoplay) autoPlayLoop();
  }, (studyTimeLimit > 0 ? studyTimeLimit : 2) * 1000);
}

// ========== Deck Merging ==========
document.getElementById('merge-form').onsubmit = e => {
  e.preventDefault();
  const checked = Array.from(document.querySelectorAll('#merge-options input:checked'));
  if (checked.length < 2) {
    showError('Select at least two decks to merge.');
    return;
  }
  const merged = [];
  checked.forEach(cb => {
    merged.push(...decks[cb.value].cards);
  });
  let name = prompt('Name for merged deck:', 'Merged Deck');
  if (!name) return;
  let base = name, i = 2;
  while (decks[name]) name = base + ' (' + (i++) + ')';
  decks[name] = {cards: merged};
  saveDecks();
  renderDeckList();
  document.getElementById('merge-decks').hidden = true;
  document.getElementById('deck-library').hidden = false;
};
document.getElementById('cancel-merge').onclick = () => {
  document.getElementById('merge-decks').hidden = true;
  document.getElementById('deck-library').hidden = false;
};
function showMergeDecks() {
  document.getElementById('deck-library').hidden = true;
  document.getElementById('merge-decks').hidden = false;
  const opts = document.getElementById('merge-options');
  opts.innerHTML = '';
  Object.keys(decks).forEach(name => {
    const label = document.createElement('label');
    label.innerHTML = `<input type="checkbox" value="${name}"> ${name}`;
    opts.appendChild(label);
  });
}

// ========== Accessibility ==========
document.getElementById('deck-list').addEventListener('keydown', e => {
  if (e.key === 'Enter' && e.target.tagName === 'SPAN') {
    const name = e.target.textContent.split(' (')[0];
    showStudyConfig(name);
  }
});

// ========== Service Worker for Offline ==========
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js');
  });
}

// ========== Init ==========
function init() {
  loadDecks();
  loadStats();
  loadMode();
  renderDeckList();
}
init(); 