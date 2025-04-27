document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const deckManagementSection = document.getElementById('deck-management');
    const studyConfigSection = document.getElementById('study-config');
    const studyInterfaceSection = document.getElementById('study-interface');
    const studyResultsSection = document.getElementById('study-results');
    const sections = [deckManagementSection, studyConfigSection, studyInterfaceSection, studyResultsSection];

    const uploadButton = document.getElementById('upload-button');
    const csvUploadInput = document.getElementById('csv-upload');
    const deckListDiv = document.getElementById('deck-list');
    const importStatusDiv = document.getElementById('import-status');
    const mergeButton = document.getElementById('merge-button');

    const configDeckName = document.getElementById('config-deck-name');
    const studyOptionsForm = document.getElementById('study-options-form');
    const studyOrderSelect = document.getElementById('study-order');
    const numCardsInput = document.getElementById('num-cards');
    const setAllCardsButton = document.getElementById('set-all-cards');
    const studyCategorySelect = document.getElementById('study-category');
    const timeLimitInput = document.getElementById('time-limit');
    const startStudyButton = document.getElementById('start-study-button');
    const cancelConfigButton = document.getElementById('cancel-config-button');

    const studyDeckName = document.getElementById('study-deck-name');
    const studyProgressDiv = document.getElementById('study-progress');
    const timerDisplayDiv = document.getElementById('timer-display');
    const timerSpan = timerDisplayDiv.querySelector('span');
    const flashcardContainer = document.getElementById('flashcard-container');
    const flashcardDiv = document.getElementById('flashcard');
    const cardQuestionP = document.getElementById('card-question');
    const cardAnswerP = document.getElementById('card-answer');
    const cardImage = document.getElementById('card-image');
    const hintArea = document.getElementById('hint-area');
    const showHintButton = document.getElementById('show-hint-button');
    const hintText = document.getElementById('hint-text');
    const prevCardButton = document.getElementById('prev-card');
    const flipCardButton = document.getElementById('flip-card');
    const nextCardButton = document.getElementById('next-card');
    const markCorrectButton = document.getElementById('mark-correct');
    const markIncorrectButton = document.getElementById('mark-incorrect');
    const markEasyButton = document.getElementById('mark-easy');
    const markDifficultButton = document.getElementById('mark-difficult');
    const toggleAutoplayButton = document.getElementById('toggle-autoplay');
    const finishSessionButton = document.getElementById('finish-session');

    const resultsSummaryDiv = document.getElementById('results-summary');
    const cardResultsList = document.getElementById('card-results-list');
    const returnToLibraryButton = document.getElementById('return-to-library');
    const restartStudyButton = document.getElementById('restart-study');

    const themeToggle = document.getElementById('theme-toggle');

    // --- State Variables ---
    let decks = {}; // { deckId: { name: 'Deck Name', cards: [], stats: {} } }
    let currentDeckId = null;
    let currentStudySession = {
        cards: [],
        currentIndex: 0,
        config: {},
        stats: {},
        startTime: null,
        timerInterval: null,
        timeLeft: 0,
        autoplayInterval: null,
        isAutoplaying: false
    };
    let cardTimerInterval = null;

    const LOCAL_STORAGE_KEY = 'flashcardAppDecks';

    // --- Utility Functions ---
    const generateId = () => `deck_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const sanitizeHTML = (str) => {
        const temp = document.createElement('div');
        temp.textContent = str;
        return temp.innerHTML;
    };

    const showSection = (sectionToShow) => {
        sections.forEach(section => {
            if (section === sectionToShow) {
                section.classList.remove('hidden-section');
                section.classList.add('active-section');
            } else {
                section.classList.remove('active-section');
                section.classList.add('hidden-section');
            }
        });
    };

    // --- Local Storage --- 
    const saveDecks = () => {
        try {
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(decks));
        } catch (e) {
            console.error("Error saving decks to localStorage:", e);
            setStatusMessage("Error saving decks. Local storage might be full or disabled.", true);
        }
    };

    const loadDecks = () => {
        const storedDecks = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (storedDecks) {
            try {
                decks = JSON.parse(storedDecks);
                // Ensure stats object exists for older saved decks
                Object.values(decks).forEach(deck => {
                    if (!deck.stats) deck.stats = {};
                    deck.cards.forEach((card, index) => {
                        if (!deck.stats[index]) {
                            deck.stats[index] = { viewed: 0, correct: 0, incorrect: 0, status: 'neutral' }; // status: neutral, easy, difficult
                        }
                        // Ensure status exists
                        if (deck.stats[index].status === undefined) {
                            deck.stats[index].status = 'neutral';
                        }
                    });
                });
            } catch (e) {
                console.error("Error parsing decks from localStorage:", e);
                decks = {};
                setStatusMessage("Error loading decks from storage. Data might be corrupted.", true);
            }
        } else {
            decks = {};
        }
        renderDeckList();
    };

    // --- UI Updates ---
    const setStatusMessage = (message, isError = false) => {
        importStatusDiv.textContent = message;
        importStatusDiv.style.color = isError ? 'var(--error-color)' : 'var(--secondary-text)';
        setTimeout(() => { importStatusDiv.textContent = ''; }, 5000);
    };

    const renderDeckList = () => {
        deckListDiv.innerHTML = ''; // Clear existing list
        const sortedDeckIds = Object.keys(decks).sort((a, b) => decks[a].name.localeCompare(decks[b].name));

        if (sortedDeckIds.length === 0) {
            deckListDiv.innerHTML = '<p>No decks uploaded yet. Upload a CSV file to get started!</p>';
            mergeButton.disabled = true;
            return;
        }

        sortedDeckIds.forEach(deckId => {
            const deck = decks[deckId];
            const deckElement = document.createElement('div');
            deckElement.className = 'deck-item';
            deckElement.dataset.deckId = deckId;

            // Deck Info (Checkbox, Name, Count)
            const deckInfoDiv = document.createElement('div');
            deckInfoDiv.className = 'deck-info';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'deck-checkbox';
            checkbox.dataset.deckId = deckId;
            checkbox.setAttribute('aria-label', `Select deck ${deck.name} for merging`);
            checkbox.addEventListener('change', updateMergeButtonState);

            const nameSpan = document.createElement('span');
            nameSpan.className = 'deck-name';
            nameSpan.textContent = deck.name;
            nameSpan.title = `Study deck: ${deck.name}`;
            nameSpan.tabIndex = 0; // Make it focusable
            nameSpan.addEventListener('click', () => startConfiguringStudy(deckId));
            nameSpan.addEventListener('keydown', (e) => {
                 if (e.key === 'Enter' || e.key === ' ') {
                      startConfiguringStudy(deckId);
                 }
            });

            const countSpan = document.createElement('span');
            countSpan.className = 'deck-count';
            countSpan.textContent = `(${deck.cards.length} cards)`;

            deckInfoDiv.appendChild(checkbox);
            deckInfoDiv.appendChild(nameSpan);
            deckInfoDiv.appendChild(countSpan);

            // Deck Controls (Rename, Delete)
            const deckControlsDiv = document.createElement('div');
            deckControlsDiv.className = 'deck-controls';

            const renameButton = document.createElement('button');
            renameButton.textContent = 'Rename';
            renameButton.className = 'rename-deck';
            renameButton.addEventListener('click', () => renameDeck(deckId));

            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'Delete';
            deleteButton.className = 'delete-deck';
            deleteButton.addEventListener('click', () => deleteDeck(deckId));

            deckControlsDiv.appendChild(renameButton);
            deckControlsDiv.appendChild(deleteButton);

            deckElement.appendChild(deckInfoDiv);
            deckElement.appendChild(deckControlsDiv);
            deckListDiv.appendChild(deckElement);
        });
        updateMergeButtonState(); // Initial check
    };

    const updateMergeButtonState = () => {
        const selectedCheckboxes = deckListDiv.querySelectorAll('.deck-checkbox:checked');
        mergeButton.disabled = selectedCheckboxes.length < 2;
    };

    // --- Deck Management --- 
    const handleFileUpload = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const csvContent = e.target.result;
                const deckName = file.name.replace(/\.csv$/i, ''); // Use filename as deck name
                parseCsvAndAddDeck(csvContent, deckName);
            } catch (error) {
                console.error("Error processing file:", error);
                setStatusMessage(`Error processing file: ${error.message}`, true);
            }
        };
        reader.onerror = () => {
            setStatusMessage('Error reading file.', true);
        };
        reader.readAsText(file);
        csvUploadInput.value = ''; // Reset input for same-file upload
    };

    // Simple CSV Parser (handles basic quoting)
    const parseCsv = (csv) => {
        const lines = csv.split(/\r\n|\n/);
        if (lines.length < 2) throw new Error("CSV must have a header row and at least one data row.");

        const header = lines[0].split(',').map(h => h.trim().toLowerCase());
        const questionIndex = header.indexOf('question');
        const answerIndex = header.indexOf('answer');
        const categoryIndex = header.indexOf('category');
        const imageUrlIndex = header.indexOf('image_url');
        const hintIndex = header.indexOf('hint');

        if (questionIndex === -1 || answerIndex === -1) {
            throw new Error('CSV must include "question" and "answer" columns.');
        }

        const cards = [];
        let skippedCount = 0;

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue; // Skip empty lines

            // Basic handling for quoted fields containing commas
            const values = [];
            let currentField = '';
            let inQuotes = false;
            for (let j = 0; j < line.length; j++) {
                const char = line[j];
                if (char === '"') {
                    if (inQuotes && line[j + 1] === '"') { // Handle escaped quote ""
                        currentField += '"';
                        j++; // Skip next quote
                    } else {
                        inQuotes = !inQuotes;
                    }
                } else if (char === ',' && !inQuotes) {
                    values.push(currentField.trim());
                    currentField = '';
                } else {
                    currentField += char;
                }
            }
            values.push(currentField.trim()); // Add last field

            const question = values[questionIndex];
            const answer = values[answerIndex];

            if (!question || !answer) {
                skippedCount++;
                console.warn(`Skipping row ${i + 1}: Missing question or answer.`);
                continue;
            }

            cards.push({
                question: sanitizeHTML(question),
                answer: sanitizeHTML(answer),
                category: categoryIndex !== -1 ? sanitizeHTML(values[categoryIndex] || '') : '',
                imageUrl: imageUrlIndex !== -1 ? sanitizeHTML(values[imageUrlIndex] || '') : '',
                hint: hintIndex !== -1 ? sanitizeHTML(values[hintIndex] || '') : '',
            });
        }

        return { cards, skippedCount };
    };

    const parseCsvAndAddDeck = (csvContent, deckName) => {
        try {
            const { cards, skippedCount } = parseCsv(csvContent);

            if (cards.length === 0) {
                setStatusMessage(`No valid cards found in the CSV. ${skippedCount > 0 ? `(${skippedCount} rows skipped).` : ''}`, true);
                return;
            }

            const newDeckId = generateId();
            const newDeck = {
                id: newDeckId,
                name: sanitizeHTML(deckName),
                cards: cards,
                stats: {} // Initialize stats object
            };
            // Initialize stats for each card
            newDeck.cards.forEach((card, index) => {
                newDeck.stats[index] = { viewed: 0, correct: 0, incorrect: 0, status: 'neutral' };
            });

            decks[newDeckId] = newDeck;
            saveDecks();
            renderDeckList();
            setStatusMessage(`Deck "${newDeck.name}" imported successfully (${cards.length} cards). ${skippedCount > 0 ? `(${skippedCount} rows skipped).` : ''}`);
        } catch (error) {;
            console.error("Error parsing CSV:", error);
            setStatusMessage(`Error parsing CSV: ${error.message}`, true);
        }
    };

    const deleteDeck = (deckId) => {
        const deckName = decks[deckId]?.name;
        if (!deckName) return;

        if (confirm(`Are you sure you want to delete the deck "${deckName}"? This cannot be undone.`)) {
            delete decks[deckId];
            saveDecks();
            renderDeckList();
            setStatusMessage(`Deck "${deckName}" deleted.`);
        }
    };

    const renameDeck = (deckId) => {
        const deck = decks[deckId];
        if (!deck) return;

        const newName = prompt(`Enter new name for deck "${deck.name}":`, deck.name);
        if (newName && newName.trim() !== '') {
            deck.name = sanitizeHTML(newName.trim());
            saveDecks();
            renderDeckList();
            setStatusMessage(`Deck renamed to "${deck.name}".`);
        } else if (newName !== null) { // Handle empty input but not cancel
             setStatusMessage('Rename cancelled or invalid name entered.', true);
        }
    };

    const mergeDecks = () => {
        const selectedCheckboxes = deckListDiv.querySelectorAll('.deck-checkbox:checked');
        if (selectedCheckboxes.length < 2) {
            setStatusMessage('Select at least two decks to merge.', true);
            return;
        }

        const deckIdsToMerge = Array.from(selectedCheckboxes).map(cb => cb.dataset.deckId);
        const mergedCards = [];
        const mergedDeckNames = [];
        let cardIndexOffset = 0; // Keep track for merged stats indices

        deckIdsToMerge.forEach(id => {
            const deck = decks[id];
            if (deck) {
                 // Deep copy cards and stats to avoid modifying originals during merge prep
                 const deckCardsCopy = JSON.parse(JSON.stringify(deck.cards));
                 // We don't merge stats directly, new deck gets fresh stats
                mergedCards.push(...deckCardsCopy);
                mergedDeckNames.push(deck.name);
            }
        });

        const newDeckName = prompt('Enter a name for the merged deck:', `Merged: ${mergedDeckNames.join(', ')}`);
        if (!newDeckName || newDeckName.trim() === '') {
            setStatusMessage('Merge cancelled or invalid name entered.', true);
            return;
        }

        const newDeckId = generateId();
        const newDeck = {
            id: newDeckId,
            name: sanitizeHTML(newDeckName.trim()),
            cards: mergedCards,
            stats: {}
        };
        // Initialize stats for the new merged deck
        newDeck.cards.forEach((card, index) => {
            newDeck.stats[index] = { viewed: 0, correct: 0, incorrect: 0, status: 'neutral' };
        });

        decks[newDeckId] = newDeck;
        saveDecks();

        // Uncheck boxes after merge
        selectedCheckboxes.forEach(cb => cb.checked = false);

        renderDeckList(); // This will also update the merge button state
        setStatusMessage(`Created merged deck "${newDeck.name}" with ${mergedCards.length} cards.`);
    };

    // --- Study Configuration --- 
    const startConfiguringStudy = (deckId) => {
        currentDeckId = deckId;
        const deck = decks[deckId];
        if (!deck) return;

        configDeckName.textContent = `Configure Study: ${deck.name}`;

        // Set default number of cards (max or 10)
        numCardsInput.max = deck.cards.length;
        numCardsInput.value = Math.min(10, deck.cards.length);

        // Populate categories
        const categories = new Set(['all']); // Start with 'all'
        deck.cards.forEach(card => {
            if (card.category && card.category.trim() !== '') {
                categories.add(card.category.trim());
            }
        });

        studyCategorySelect.innerHTML = ''; // Clear previous options
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category === 'all' ? 'All Categories' : category;
            studyCategorySelect.appendChild(option);
        });

        // Reset other fields to defaults
        studyOrderSelect.value = 'random';
        timeLimitInput.value = 0;

        showSection(studyConfigSection);
    };

    setAllCardsButton.addEventListener('click', () => {
        if (currentDeckId && decks[currentDeckId]) {
            numCardsInput.value = decks[currentDeckId].cards.length;
        }
    });

    cancelConfigButton.addEventListener('click', () => {
        showSection(deckManagementSection);
        currentDeckId = null;
    });

    studyOptionsForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (!currentDeckId) return;

        const deck = decks[currentDeckId];
        const order = studyOrderSelect.value;
        const category = studyCategorySelect.value;
        let numCards = parseInt(numCardsInput.value, 10);
        const timeLimit = parseInt(timeLimitInput.value, 10);

        if (isNaN(numCards) || numCards < 1) {
            numCards = deck.cards.length; // Default to all if invalid
        }

        // Filter cards by category
        let filteredCards = deck.cards;
        if (category !== 'all') {
            filteredCards = deck.cards.filter(card => card.category === category);
        }

        if (filteredCards.length === 0) {
             setStatusMessage(`No cards found in category "${category}". Please select another category or "All Categories".`, true);
             showSection(studyConfigSection); // Stay on config screen
             return;
        }

        // Adjust numCards if it exceeds the filtered count
        numCards = Math.min(numCards, filteredCards.length);
        if (numCards < 1) numCards = 1; // Ensure at least one card

        let studyCards = filteredCards.map((card, index) => ({
            ...card,
            originalIndex: deck.cards.indexOf(card) // Keep track of original index for stats
        }));

        // Shuffle if random order is selected
        if (order === 'random') {
            for (let i = studyCards.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [studyCards[i], studyCards[j]] = [studyCards[j], studyCards[i]];
            }
        }

        // Select the requested number of cards
        studyCards = studyCards.slice(0, numCards);

        currentStudySession = {
            deckId: currentDeckId,
            cards: studyCards,
            currentIndex: 0,
            config: { order, numCards, category, timeLimit },
            stats: { // Session-specific stats
                correct: 0,
                incorrect: 0,
                skipped: 0, // Could add skipping later
                cardInteractions: {} // { originalIndex: { markedCorrect: false, markedIncorrect: false, easy: false, difficult: false } }
            },
            startTime: new Date(),
            timerInterval: null,
            timeLeft: timeLimit,
            autoplayInterval: null,
            isAutoplaying: false
        };

        // Initialize session stats structure
        studyCards.forEach(card => {
            currentStudySession.stats.cardInteractions[card.originalIndex] = {
                markedCorrect: false,
                markedIncorrect: false,
                easy: false,
                difficult: false
            };
        });

        startStudySession();
    });

    // --- Study Session --- 
    const startStudySession = () => {
        if (currentStudySession.cards.length === 0) {
            setStatusMessage('No cards to study with the selected configuration.', true);
            showSection(deckManagementSection);
            return;
        }
        studyDeckName.textContent = `Studying: ${decks[currentStudySession.deckId].name}`;
        currentStudySession.currentIndex = 0;
        currentStudySession.isAutoplaying = false;
        toggleAutoplayButton.textContent = 'Autoplay'; // Reset button text
        stopAutoplay();
        stopCardTimer();
        displayCard(currentStudySession.currentIndex);
        showSection(studyInterfaceSection);
        updateStudyProgress();
        updateNavigationButtons();
        startCardTimerIfNeeded();
    };

    const displayCard = (index) => {
        if (index < 0 || index >= currentStudySession.cards.length) return;

        const card = currentStudySession.cards[index];
        const originalIndex = card.originalIndex;
        const deck = decks[currentStudySession.deckId];

        // Increment view count for the card in the main deck stats
        if (deck && deck.stats[originalIndex]) {
            deck.stats[originalIndex].viewed = (deck.stats[originalIndex].viewed || 0) + 1;
            // Don't save yet, save at end of session or when returning to library
        }

        cardQuestionP.textContent = card.question;
        cardAnswerP.textContent = card.answer;

        if (card.imageUrl) {
            cardImage.src = card.imageUrl;
            cardImage.style.display = 'block';
            cardImage.alt = `Image for: ${card.question}`; // Better alt text
        } else {
            cardImage.style.display = 'none';
            cardImage.src = '';
            cardImage.alt = '';
        }

        flashcardDiv.classList.remove('is-flipped');
        flashcardDiv.style.transform = ''; // Reset potential inline transform from script

        // Hint visibility
        if (card.hint && card.hint.trim() !== '') {
             hintArea.style.display = 'block';
             showHintButton.style.display = 'inline-block';
             hintText.textContent = card.hint;
             hintText.style.display = 'none'; // Hide hint initially
        } else {
            hintArea.style.display = 'none';
        }

        updateFeedbackButtons(originalIndex);
        updateStudyProgress();
        updateNavigationButtons();
        startCardTimerIfNeeded(); // Restart timer for the new card
    };

    const flipCard = () => {
        flashcardDiv.classList.toggle('is-flipped');
    };

    const nextCard = () => {
        if (currentStudySession.currentIndex < currentStudySession.cards.length - 1) {
            currentStudySession.currentIndex++;
            displayCard(currentStudySession.currentIndex);
        } else {
            // Optionally, loop back to start or finish session
            // For now, just stay on the last card
            finishStudySession(); // Finish session when reaching the end via 'Next'
        }
    };

    const prevCard = () => {
        if (currentStudySession.currentIndex > 0) {
            currentStudySession.currentIndex--;
            displayCard(currentStudySession.currentIndex);
        }
    };

    const updateStudyProgress = () => {
        studyProgressDiv.textContent = `Card ${currentStudySession.currentIndex + 1} / ${currentStudySession.cards.length}`;
    };

    const updateNavigationButtons = () => {
        prevCardButton.disabled = currentStudySession.currentIndex === 0;
        // Disable next button if on the last card? Or let it trigger finish?
        // Let's allow 'Next' on the last card to trigger finishing the session.
        nextCardButton.disabled = false; // Always enabled unless only 1 card?
        // Handle case of 1 card:
        if (currentStudySession.cards.length <= 1) {
             prevCardButton.disabled = true;
             nextCardButton.disabled = true;
        }
    };

    const updateFeedbackButtons = (originalIndex) => {
        const cardSessionStats = currentStudySession.stats.cardInteractions[originalIndex] || {};
        const deckCardStats = decks[currentStudySession.deckId]?.stats[originalIndex] || {};

        markCorrectButton.disabled = cardSessionStats.markedCorrect || false;
        markIncorrectButton.disabled = cardSessionStats.markedIncorrect || false;
        markEasyButton.classList.toggle('active', deckCardStats.status === 'easy');
        markDifficultButton.classList.toggle('active', deckCardStats.status === 'difficult');
    };

    const markCard = (type) => {
        const card = currentStudySession.cards[currentStudySession.currentIndex];
        const originalIndex = card.originalIndex;
        const deck = decks[currentStudySession.deckId];
        if (!deck || !deck.stats[originalIndex]) return;

        const sessionStats = currentStudySession.stats.cardInteractions[originalIndex];

        switch (type) {
            case 'correct':
                if (!sessionStats.markedCorrect) {
                    deck.stats[originalIndex].correct = (deck.stats[originalIndex].correct || 0) + 1;
                    currentStudySession.stats.correct++;
                    sessionStats.markedCorrect = true;
                    sessionStats.markedIncorrect = false; // Can't be both in one session view
                }
                break;
            case 'incorrect':
                 if (!sessionStats.markedIncorrect) {
                    deck.stats[originalIndex].incorrect = (deck.stats[originalIndex].incorrect || 0) + 1;
                    currentStudySession.stats.incorrect++;
                    sessionStats.markedIncorrect = true;
                    sessionStats.markedCorrect = false; // Can't be both
                }
                break;
            case 'easy':
                deck.stats[originalIndex].status = deck.stats[originalIndex].status === 'easy' ? 'neutral' : 'easy';
                sessionStats.easy = (deck.stats[originalIndex].status === 'easy'); // Track in session too if needed
                sessionStats.difficult = false; // Cannot be both
                if(deck.stats[originalIndex].status === 'easy') deck.stats[originalIndex].status = 'easy'; // Ensure deck status is updated
                else if(deck.stats[originalIndex].status === 'difficult') deck.stats[originalIndex].status = 'neutral'; // Can toggle off easy
                break;
            case 'difficult':
                deck.stats[originalIndex].status = deck.stats[originalIndex].status === 'difficult' ? 'neutral' : 'difficult';
                sessionStats.difficult = (deck.stats[originalIndex].status === 'difficult');
                sessionStats.easy = false; // Cannot be both
                 if(deck.stats[originalIndex].status === 'difficult') deck.stats[originalIndex].status = 'difficult';
                 else if(deck.stats[originalIndex].status === 'easy') deck.stats[originalIndex].status = 'neutral'; // Can toggle off difficult
                break;
        }
        updateFeedbackButtons(originalIndex);
        // Don't save decks here, save at end
    };

     const showHint = () => {
        const card = currentStudySession.cards[currentStudySession.currentIndex];
        if (card.hint && card.hint.trim() !== '') {
            hintText.style.display = 'block';
            showHintButton.style.display = 'none'; // Hide button after showing hint
        }
    };

    const startCardTimerIfNeeded = () => {
        stopCardTimer(); // Clear any existing timer
        const timeLimit = currentStudySession.config.timeLimit;
        if (timeLimit > 0) {
            currentStudySession.timeLeft = timeLimit;
            timerDisplayDiv.style.display = 'block';
            timerSpan.textContent = currentStudySession.timeLeft;
            cardTimerInterval = setInterval(() => {
                currentStudySession.timeLeft--;
                timerSpan.textContent = currentStudySession.timeLeft;
                if (currentStudySession.timeLeft <= 0) {
                    stopCardTimer();
                    if (!flashcardDiv.classList.contains('is-flipped')) {
                        flipCard(); // Auto-flip when time runs out
                    }
                    // Optional: Automatically move to next card after a delay?
                    // setTimeout(nextCard, 1500); // Example: Move after 1.5s
                }
            }, 1000);
        }
        else {
            timerDisplayDiv.style.display = 'none';
        }
    };

    const stopCardTimer = () => {
        if (cardTimerInterval) {
            clearInterval(cardTimerInterval);
            cardTimerInterval = null;
        }
    };

    const toggleAutoplay = () => {
        if (currentStudySession.isAutoplaying) {
            stopAutoplay();
        } else {
            startAutoplay();
        }
    };

    const startAutoplay = () => {
        if (currentStudySession.autoplayInterval) return; // Already running
        currentStudySession.isAutoplaying = true;
        toggleAutoplayButton.textContent = 'Stop Autoplay';
        toggleAutoplayButton.classList.add('active'); // Optional styling

        const playNext = () => {
             // Flip if not already flipped
             if (!flashcardDiv.classList.contains('is-flipped')) {
                  flipCard();
             }
            // Wait a bit after flipping, then move to next
            setTimeout(() => {
                 if (currentStudySession.currentIndex < currentStudySession.cards.length - 1) {
                      nextCard();
                 } else {
                      stopAutoplay(); // Stop at the end
                      finishStudySession();
                 }
            }, 1500); // Wait 1.5 seconds on the answer before moving
        };

        // Use time limit if set, otherwise default interval
        const intervalTime = currentStudySession.config.timeLimit > 0
            ? (currentStudySession.config.timeLimit * 1000) + 1500 // Time limit + answer view time
            : 4000; // Default: 2.5s question + 1.5s answer = 4s

        // Initial delay before first action
        setTimeout(() => {
            playNext(); // Start the first cycle
            currentStudySession.autoplayInterval = setInterval(playNext, intervalTime);
        }, currentStudySession.config.timeLimit > 0 ? (currentStudySession.config.timeLimit * 1000) : 2500);
    };

    const stopAutoplay = () => {
        if (currentStudySession.autoplayInterval) {
            clearInterval(currentStudySession.autoplayInterval);
            currentStudySession.autoplayInterval = null;
        }
        currentStudySession.isAutoplaying = false;
        toggleAutoplayButton.textContent = 'Autoplay';
        toggleAutoplayButton.classList.remove('active');
    };


    const finishStudySession = () => {
        stopCardTimer();
        stopAutoplay();
        saveDecks(); // Save updated deck stats
        displayResults();
        showSection(studyResultsSection);
    };

    // --- Study Results --- 
    const displayResults = () => {
        const session = currentStudySession;
        const deck = decks[session.deckId];
        const timeTaken = Math.round((new Date() - session.startTime) / 1000); // Seconds

        resultsSummaryDiv.innerHTML = `
            <h3>Session Summary for "${deck.name}"</h3>
            <p>Cards Studied: ${session.cards.length}</p>
            <p>Correct: ${session.stats.correct}</p>
            <p>Incorrect: ${session.stats.incorrect}</p>
            <p>Time Taken: ${Math.floor(timeTaken / 60)}m ${timeTaken % 60}s</p>
            <p>Configuration: ${session.config.order}, ${session.config.category !== 'all' ? `Category: ${session.config.category}, ` : ''}${session.config.timeLimit > 0 ? `Time Limit: ${session.config.timeLimit}s` : 'No time limit'}</p>
        `;

        cardResultsList.innerHTML = '';
        session.cards.forEach((card, studyIndex) => {
            const originalIndex = card.originalIndex;
            const deckStats = deck.stats[originalIndex];
            const sessionStats = session.stats.cardInteractions[originalIndex];

            const li = document.createElement('li');
            li.innerHTML = `
                <div class="result-question">${studyIndex + 1}. ${card.question}</div>
                <div class="result-answer"><em>Answer:</em> ${card.answer}</div>
                <div class="result-stats">
                    Session: ${sessionStats.markedCorrect ? 'Correct' : (sessionStats.markedIncorrect ? 'Incorrect' : 'Not Marked')} | 
                    Marked: ${deckStats.status} | 
                    Overall Stats: Viewed ${deckStats.viewed}, Correct ${deckStats.correct}, Incorrect ${deckStats.incorrect}
                </div>
            `;
            cardResultsList.appendChild(li);
        });
    };

    returnToLibraryButton.addEventListener('click', () => {
        showSection(deckManagementSection);
        currentDeckId = null; // Clear current deck context
        currentStudySession = {}; // Clear session data
    });

    restartStudyButton.addEventListener('click', () => {
        // Reuse last configuration but reshuffle if needed
        if (currentStudySession.deckId) {
            // Need to reconstruct the study cards based on the original config
             const deck = decks[currentStudySession.deckId];
             const { order, category, numCards, timeLimit } = currentStudySession.config;

            let filteredCards = deck.cards;
            if (category !== 'all') {
                filteredCards = deck.cards.filter(card => card.category === category);
            }
             let studyCards = filteredCards.map((card) => ({
                 ...card,
                 originalIndex: deck.cards.indexOf(card)
            }));
            if (order === 'random') {
                 for (let i = studyCards.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [studyCards[i], studyCards[j]] = [studyCards[j], studyCards[i]];
                 }
            }
            studyCards = studyCards.slice(0, numCards);

            // Reset session object with new card order and fresh session stats
            currentStudySession = {
                deckId: currentStudySession.deckId,
                cards: studyCards,
                currentIndex: 0,
                config: currentStudySession.config, // Keep same config
                stats: { correct: 0, incorrect: 0, skipped: 0, cardInteractions: {} },
                startTime: new Date(),
                timerInterval: null,
                timeLeft: timeLimit,
                autoplayInterval: null,
                isAutoplaying: false
            };
            studyCards.forEach(card => {
                currentStudySession.stats.cardInteractions[card.originalIndex] = {
                     markedCorrect: false, markedIncorrect: false, easy: false, difficult: false
                };
            });

            startStudySession(); // Start the new session directly

        } else {
            showSection(deckManagementSection); // Go back to library if something went wrong
        }
    });

    // --- Theme Toggle ---
    const applyTheme = (theme) => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('flashcardTheme', theme);
        themeToggle.checked = (theme === 'dark');
    };

    themeToggle.addEventListener('change', () => {
        const newTheme = themeToggle.checked ? 'dark' : 'light';
        applyTheme(newTheme);
    });

    // --- Keyboard Shortcuts ---
    document.addEventListener('keydown', (e) => {
        // Only apply shortcuts if study interface is active and not typing in an input
        if (!studyInterfaceSection.classList.contains('active-section') ||
             ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) {
             return;
        }

        // Check if modifier keys are pressed (to avoid conflicts)
        if (e.ctrlKey || e.metaKey || e.altKey) {
             return;
        }

        switch (e.key) {
            case ' ': // Space
            case 'f': case 'F':
                e.preventDefault(); // Prevent space bar scrolling
                flipCard();
                break;
            case 'ArrowLeft':
            case 'p': case 'P':
                if (!prevCardButton.disabled) prevCard();
                break;
            case 'ArrowRight':
            case 'n': case 'N':
                 if (!nextCardButton.disabled) nextCard();
                break;
            case 'c': case 'C':
                 if (!markCorrectButton.disabled) markCard('correct');
                break;
            case 'i': case 'I':
                if (!markIncorrectButton.disabled) markCard('incorrect');
                break;
             case 'e': case 'E':
                 markCard('easy');
                 break;
            case 'd': case 'D':
                markCard('difficult');
                break;
            case 'h': case 'H':
                if (hintArea.style.display !== 'none' && showHintButton.style.display !== 'none') {
                    showHint();
                }
                break;
            case 'a': case 'A':
                toggleAutoplay();
                break;
        }
    });

    // --- Initialization ---
    uploadButton.addEventListener('click', () => csvUploadInput.click());
    csvUploadInput.addEventListener('change', handleFileUpload);
    mergeButton.addEventListener('click', mergeDecks);

    flashcardContainer.addEventListener('click', flipCard); // Allow clicking card to flip
    prevCardButton.addEventListener('click', prevCard);
    flipCardButton.addEventListener('click', flipCard);
    nextCardButton.addEventListener('click', nextCard);
    markCorrectButton.addEventListener('click', () => markCard('correct'));
    markIncorrectButton.addEventListener('click', () => markCard('incorrect'));
    markEasyButton.addEventListener('click', () => markCard('easy'));
    markDifficultButton.addEventListener('click', () => markCard('difficult'));
    showHintButton.addEventListener('click', showHint);
    toggleAutoplayButton.addEventListener('click', toggleAutoplay);
    finishSessionButton.addEventListener('click', finishStudySession);

    // Load initial state
    const savedTheme = localStorage.getItem('flashcardTheme') || 'light';
    applyTheme(savedTheme);
    loadDecks();
    showSection(deckManagementSection);
}); 