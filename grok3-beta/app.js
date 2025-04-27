// Flashcard App JavaScript

// Global state
let decks = JSON.parse(localStorage.getItem('decks')) || {};
let currentDeck = null;
let currentCards = [];
let currentCardIndex = 0;
let isFlipped = false;
let autoPlayInterval = null;
let timerInterval = null;

// DOM elements
const themeToggle = document.getElementById('themeToggle');
const csvUpload = document.getElementById('csvUpload');
const deckList = document.getElementById('deckList');
const studyConfig = document.getElementById('studyConfig');
const studyInterface = document.getElementById('studyInterface');
const orderToggle = document.getElementById('orderToggle');
const cardCount = document.getElementById('cardCount');
const timeLimit = document.getElementById('timeLimit');
const categorySelect = document.getElementById('categorySelect');
const startStudy = document.getElementById('startStudy');
const mergeDecks = document.getElementById('mergeDecks');
const cardContainer = document.getElementById('cardContainer');
const question = document.getElementById('question');
const questionImage = document.getElementById('questionImage');
const answer = document.getElementById('answer');
const answerImage = document.getElementById('answerImage');
const flipCard = document.getElementById('flipCard');
const markCorrect = document.getElementById('markCorrect');
const markIncorrect = document.getElementById('markIncorrect');
const markEasy = document.getElementById('markEasy');
const markDifficult = document.getElementById('markDifficult');
const showHint = document.getElementById('showHint');
const prevCard = document.getElementById('prevCard');
const autoPlay = document.getElementById('autoPlay');
const nextCard = document.getElementById('nextCard');
const progress = document.getElementById('progress');
const timer = document.getElementById('timer');
const timeLeft = document.getElementById('timeLeft');
const backToConfig = document.getElementById('backToConfig');

// Initialize app
function initApp() {
    updateDeckList();
    themeToggle.addEventListener('click', toggleTheme);
    csvUpload.addEventListener('change', handleCsvUpload);
    startStudy.addEventListener('click', startStudySession);
    mergeDecks.addEventListener('click', mergeAllDecks);
    flipCard.addEventListener('click', flipCurrentCard);
    markCorrect.addEventListener('click', () => markResponse(true));
    markIncorrect.addEventListener('click', () => markResponse(false));
    markEasy.addEventListener('click', () => markDifficulty('easy'));
    markDifficult.addEventListener('click', () => markDifficulty('difficult'));
    showHint.addEventListener('click', displayHint);
    prevCard.addEventListener('click', showPreviousCard);
    autoPlay.addEventListener('click', toggleAutoPlay);
    nextCard.addEventListener('click', showNextCard);
    backToConfig.addEventListener('click', returnToConfig);
    setupKeyboardShortcuts();
    if (localStorage.getItem('theme') === 'dark') {
        document.body.classList.add('dark');
    }
    console.log('Flashcard App Initialized');
}

// Theme toggle
function toggleTheme() {
    document.body.classList.toggle('dark');
    localStorage.setItem('theme', document.body.classList.contains('dark') ? 'dark' : 'light');
}

// Handle CSV file upload
function handleCsvUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        const text = e.target.result;
        const lines = text.split('\n');
        if (lines.length < 2) {
            alert('Invalid CSV format: Missing headers or data');
            return;
        }
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        if (!headers.includes('question') || !headers.includes('answer')) {
            alert('Invalid CSV format: Missing required columns (question, answer)');
            return;
        }
        const cards = [];
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            const values = line.split(',');
            if (values.length < headers.length) continue;
            const card = {
                question: values[headers.indexOf('question')] || '',
                answer: values[headers.indexOf('answer')] || '',
                image_url: headers.includes('image_url') ? values[headers.indexOf('image_url')] : '',
                category: headers.includes('category') ? values[headers.indexOf('category')] : '',
                stats: { viewed: 0, correct: 0, incorrect: 0 },
                difficulty: 'normal'
            };
            if (card.question && card.answer) cards.push(card);
        }
        if (cards.length === 0) {
            alert('No valid cards found in CSV');
            return;
        }
        const deckName = file.name.split('.')[0];
        decks[deckName] = { name: deckName, cards };
        localStorage.setItem('decks', JSON.stringify(decks));
        updateDeckList();
        alert(`Deck '${deckName}' uploaded with ${cards.length} cards`);
        event.target.value = '';
    };
    reader.readAsText(file);
}

// Update deck list display
function updateDeckList() {
    deckList.innerHTML = '';
    for (const deckName in decks) {
        const deck = decks[deckName];
        const deckItem = document.createElement('div');
        deckItem.className = 'p-4 bg-gray-200 dark:bg-gray-700 rounded-lg shadow-sm flex justify-between items-center';
        deckItem.innerHTML = `
            <div>
                <h3 class="text-lg font-medium">${deck.name}</h3>
                <p class="text-sm text-gray-600 dark:text-gray-400">${deck.cards.length} cards</p>
            </div>
            <div>
                <button onclick="selectDeck('${deck.name}')" class="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700">Study</button>
                <button onclick="renameDeck('${deck.name}')" class="px-3 py-1 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 ml-2">Rename</button>
                <button onclick="deleteDeck('${deck.name}')" class="px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 ml-2">Delete</button>
            </div>
        `;
        deckList.appendChild(deckItem);
    }
}

// Select a deck for study
function selectDeck(deckName) {
    currentDeck = decks[deckName];
    updateCategorySelect();
    studyConfig.classList.remove('hidden');
    deckList.parentElement.classList.add('hidden');
}

// Update category select options
function updateCategorySelect() {
    categorySelect.innerHTML = '<option value="">All Categories</option>';
    const categories = new Set(currentDeck.cards.map(card => card.category).filter(cat => cat));
    categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        option.textContent = cat;
        categorySelect.appendChild(option);
    });
}

// Start study session
function startStudySession() {
    if (!currentDeck) return;
    let cards = currentDeck.cards.slice();
    const selectedCategory = categorySelect.value;
    if (selectedCategory) {
        cards = cards.filter(card => card.category === selectedCategory);
    }
    const count = parseInt(cardCount.value) || cards.length;
    cards = cards.slice(0, count);
    if (orderToggle.value === 'random') {
        cards = cards.sort(() => Math.random() - 0.5);
    }
    currentCards = cards;
    currentCardIndex = 0;
    isFlipped = false;
    studyConfig.classList.add('hidden');
    studyInterface.classList.remove('hidden');
    showCard();
    updateProgress();
    const timePerCard = parseInt(timeLimit.value) || 0;
    if (timePerCard > 0) {
        startTimer(timePerCard);
    }
}

// Show current card
function showCard() {
    if (currentCardIndex < 0 || currentCardIndex >= currentCards.length) return;
    const card = currentCards[currentCardIndex];
    question.textContent = card.question;
    answer.textContent = card.answer;
    if (card.image_url) {
        questionImage.src = card.image_url;
        questionImage.classList.remove('hidden');
        answerImage.src = card.image_url;
        answerImage.classList.remove('hidden');
    } else {
        questionImage.classList.add('hidden');
        answerImage.classList.add('hidden');
    }
    cardContainer.classList.remove('flipped');
    isFlipped = false;
    card.stats.viewed++;
    localStorage.setItem('decks', JSON.stringify(decks));
}

// Flip current card
function flipCurrentCard() {
    cardContainer.classList.toggle('flipped');
    isFlipped = !isFlipped;
}

// Show previous card
function showPreviousCard() {
    if (currentCardIndex > 0) {
        currentCardIndex--;
        showCard();
        updateProgress();
        resetTimer();
    }
}

// Show next card
function showNextCard() {
    if (currentCardIndex < currentCards.length - 1) {
        currentCardIndex++;
        showCard();
        updateProgress();
        resetTimer();
    }
}

// Update progress display
function updateProgress() {
    progress.textContent = `${currentCardIndex + 1}/${currentCards.length}`;
}

// Return to configuration
function returnToConfig() {
    studyInterface.classList.add('hidden');
    studyConfig.classList.remove('hidden');
    clearInterval(timerInterval);
    timer.classList.add('hidden');
    clearInterval(autoPlayInterval);
    autoPlay.textContent = 'Auto Play';
    autoPlayInterval = null;
}

// Mark response as correct or incorrect
function markResponse(correct) {
    if (!currentCards[currentCardIndex]) return;
    const card = currentCards[currentCardIndex];
    if (correct) {
        card.stats.correct++;
    } else {
        card.stats.incorrect++;
    }
    localStorage.setItem('decks', JSON.stringify(decks));
    showNextCard();
}

// Mark card difficulty
function markDifficulty(difficulty) {
    if (!currentCards[currentCardIndex]) return;
    currentCards[currentCardIndex].difficulty = difficulty;
    localStorage.setItem('decks', JSON.stringify(decks));
}

// Display hint
function displayHint() {
    if (!currentCards[currentCardIndex]) return;
    const card = currentCards[currentCardIndex];
    const hint = card.answer.substring(0, Math.min(30, card.answer.length));
    alert(`Hint: ${hint}...`);
}

// Toggle auto play
function toggleAutoPlay() {
    if (autoPlayInterval) {
        clearInterval(autoPlayInterval);
        autoPlayInterval = null;
        autoPlay.textContent = 'Auto Play';
    } else {
        autoPlayInterval = setInterval(() => {
            if (!isFlipped) {
                flipCurrentCard();
            } else {
                showNextCard();
            }
        }, 3000);
        autoPlay.textContent = 'Stop Auto Play';
    }
}

// Start timer for each card
function startTimer(seconds) {
    let timeRemaining = seconds;
    timer.classList.remove('hidden');
    timeLeft.textContent = timeRemaining;
    timerInterval = setInterval(() => {
        timeRemaining--;
        timeLeft.textContent = timeRemaining;
        if (timeRemaining <= 0) {
            showNextCard();
            timeRemaining = seconds;
        }
    }, 1000);
}

// Reset timer
function resetTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        const timePerCard = parseInt(timeLimit.value) || 0;
        if (timePerCard > 0) {
            startTimer(timePerCard);
        }
    }
}

// Setup keyboard shortcuts
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (event) => {
        if (studyInterface.classList.contains('hidden')) return;
        switch (event.key) {
            case ' ':
                event.preventDefault();
                flipCurrentCard();
                break;
            case 'ArrowLeft':
                showPreviousCard();
                break;
            case 'ArrowRight':
                showNextCard();
                break;
            case 'c':
                markResponse(true);
                break;
            case 'i':
                markResponse(false);
                break;
            case 'e':
                markDifficulty('easy');
                break;
            case 'd':
                markDifficulty('difficult');
                break;
            case 'h':
                displayHint();
                break;
        }
    });
}

// Rename a deck
function renameDeck(deckName) {
    const newName = prompt(`Enter new name for deck '${deckName}':`, deckName);
    if (newName && newName !== deckName) {
        if (decks[newName]) {
            alert('A deck with this name already exists.');
            return;
        }
        decks[newName] = { ...decks[deckName], name: newName };
        delete decks[deckName];
        localStorage.setItem('decks', JSON.stringify(decks));
        updateDeckList();
    }
}

// Delete a deck
function deleteDeck(deckName) {
    if (confirm(`Are you sure you want to delete deck '${deckName}'?`)) {
        delete decks[deckName];
        localStorage.setItem('decks', JSON.stringify(decks));
        updateDeckList();
    }
}

// Merge all decks
function mergeAllDecks() {
    const deckNames = Object.keys(decks);
    if (deckNames.length < 2) {
        alert('You need at least two decks to merge.');
        return;
    }
    const newDeckName = prompt('Enter name for the merged deck:');
    if (!newDeckName) return;
    if (decks[newDeckName]) {
        alert('A deck with this name already exists.');
        return;
    }
    const mergedCards = deckNames.reduce((acc, name) => acc.concat(decks[name].cards), []);
    decks[newDeckName] = { name: newDeckName, cards: mergedCards };
    localStorage.setItem('decks', JSON.stringify(decks));
    updateDeckList();
    alert(`Merged ${deckNames.length} decks into '${newDeckName}' with ${mergedCards.length} cards.`);
}

initApp(); 