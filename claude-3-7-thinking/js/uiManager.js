/**
 * UIManager handles all UI rendering and updates
 */
export class UIManager {
    constructor() {
        this.notificationTimeout = null;
    }
    
    /**
     * Shows the specified section and hides all others
     * @param {HTMLElement} sectionElement - The section element to show
     */
    showSection(sectionElement) {
        // Hide all sections
        document.querySelectorAll('.section').forEach(section => {
            section.classList.remove('active');
            section.classList.add('hidden');
        });
        
        // Show the target section
        sectionElement.classList.remove('hidden');
        sectionElement.classList.add('active');
    }
    
    /**
     * Renders the list of decks
     * @param {HTMLElement} deckListElement - The deck list container element
     * @param {Object} decks - Object containing all decks
     * @param {Function} onSelectDeck - Callback when a deck is selected
     * @param {Function} onRenameDeck - Callback when a deck is renamed
     * @param {Function} onDeleteDeck - Callback when a deck is deleted
     * @param {Function} onMergeDeck - Callback when a deck is merged
     */
    renderDeckList(deckListElement, decks, onSelectDeck, onRenameDeck, onDeleteDeck, onMergeDeck) {
        deckListElement.innerHTML = '';
        
        const deckNames = Object.keys(decks);
        
        if (deckNames.length === 0) {
            deckListElement.innerHTML = `
                <div class="empty-state">
                    <p>No decks yet! Import a CSV file to get started.</p>
                </div>
            `;
            return;
        }
        
        deckNames.forEach(deckName => {
            const deck = decks[deckName];
            const deckElement = document.createElement('div');
            deckElement.className = 'deck-card';
            
            const lastStudied = deck.stats.lastStudied 
                ? new Date(deck.stats.lastStudied).toLocaleDateString() 
                : 'Never';
            
            deckElement.innerHTML = `
                <div class="deck-title">${deckName}</div>
                <div>${deck.cards.length} cards</div>
                <div class="deck-meta">
                    <span>Last studied: ${lastStudied}</span>
                    <span>${deck.categories ? deck.categories.length : 0} categories</span>
                </div>
                <div class="deck-actions">
                    <button class="deck-action-btn rename-btn" title="Rename Deck">✏️</button>
                    <button class="deck-action-btn merge-btn" title="Merge Deck">🔄</button>
                    <button class="deck-action-btn delete-btn" title="Delete Deck">🗑️</button>
                </div>
            `;
            
            // Set up event listeners
            deckElement.addEventListener('click', (e) => {
                // Ignore clicks on action buttons
                if (e.target.closest('.deck-action-btn')) return;
                onSelectDeck(deckName);
            });
            
            const renameBtn = deckElement.querySelector('.rename-btn');
            const mergeBtn = deckElement.querySelector('.merge-btn');
            const deleteBtn = deckElement.querySelector('.delete-btn');
            
            renameBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                onRenameDeck(deckName);
            });
            
            mergeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                onMergeDeck(deckName);
            });
            
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                onDeleteDeck(deckName);
            });
            
            deckListElement.appendChild(deckElement);
        });
    }
    
    /**
     * Renders a study session
     * @param {StudySession} studySession - The study session object
     */
    renderStudySession(studySession) {
        // Set up event listeners for study controls
        const flipCardBtn = document.getElementById('flipCardBtn');
        const nextCardBtn = document.getElementById('nextCardBtn');
        const prevCardBtn = document.getElementById('prevCardBtn');
        const markEasyBtn = document.getElementById('markEasyBtn');
        const markDifficultBtn = document.getElementById('markDifficultBtn');
        const showHintBtn = document.getElementById('showHintBtn');
        const autoPlayBtn = document.getElementById('autoPlayBtn');
        const ratingControls = document.getElementById('ratingControls');
        
        // Remove existing listeners (for potential reuse)
        flipCardBtn.replaceWith(flipCardBtn.cloneNode(true));
        nextCardBtn.replaceWith(nextCardBtn.cloneNode(true));
        prevCardBtn.replaceWith(prevCardBtn.cloneNode(true));
        markEasyBtn.replaceWith(markEasyBtn.cloneNode(true));
        markDifficultBtn.replaceWith(markDifficultBtn.cloneNode(true));
        showHintBtn.replaceWith(showHintBtn.cloneNode(true));
        autoPlayBtn.replaceWith(autoPlayBtn.cloneNode(true));
        
        // Get the fresh references
        const newFlipCardBtn = document.getElementById('flipCardBtn');
        const newNextCardBtn = document.getElementById('nextCardBtn');
        const newPrevCardBtn = document.getElementById('prevCardBtn');
        const newMarkEasyBtn = document.getElementById('markEasyBtn');
        const newMarkDifficultBtn = document.getElementById('markDifficultBtn');
        const newShowHintBtn = document.getElementById('showHintBtn');
        const newAutoPlayBtn = document.getElementById('autoPlayBtn');
        
        // Add new event listeners
        newFlipCardBtn.addEventListener('click', () => studySession.flipCurrentCard());
        newNextCardBtn.addEventListener('click', () => studySession.nextCard());
        newPrevCardBtn.addEventListener('click', () => studySession.previousCard());
        newMarkEasyBtn.addEventListener('click', () => studySession.markCurrentCard('easy'));
        newMarkDifficultBtn.addEventListener('click', () => studySession.markCurrentCard('difficult'));
        newShowHintBtn.addEventListener('click', () => studySession.showHint());
        newAutoPlayBtn.addEventListener('click', () => studySession.toggleAutoPlay());
        
        // Set initial card content
        this.updateCardContent(studySession);
        
        // Update progress
        this.updateProgress(studySession);
        
        // Set up callback for card flip events
        studySession.onCardFlip = (isFlipped) => {
            const cardElement = document.getElementById('flashcard');
            if (isFlipped) {
                cardElement.classList.add('flipped');
                ratingControls.classList.remove('hidden');
            } else {
                cardElement.classList.remove('flipped');
                ratingControls.classList.add('hidden');
            }
        };
        
        // Set up callback for navigation events
        studySession.onCardChange = () => {
            this.updateCardContent(studySession);
            this.updateProgress(studySession);
        };
        
        // Set up timer if needed
        const timerElement = document.getElementById('timer');
        if (studySession.options.timeLimit > 0) {
            timerElement.classList.remove('hidden');
            studySession.onTimerUpdate = (seconds) => {
                const minutes = Math.floor(seconds / 60);
                const remainingSeconds = seconds % 60;
                timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
            };
        } else {
            timerElement.classList.add('hidden');
        }
    }
    
    /**
     * Updates the card content based on the current card in the study session
     * @param {StudySession} studySession - The study session object
     */
    updateCardContent(studySession) {
        const currentCard = studySession.getCurrentCard();
        if (!currentCard) return;
        
        const questionText = document.getElementById('questionText');
        const answerText = document.getElementById('answerText');
        const questionImage = document.getElementById('questionImage');
        const answerImage = document.getElementById('answerImage');
        const questionImageContainer = document.getElementById('questionImageContainer');
        const answerImageContainer = document.getElementById('answerImageContainer');
        const showHintBtn = document.getElementById('showHintBtn');
        
        // Set text content
        questionText.textContent = currentCard.question;
        answerText.textContent = currentCard.answer;
        
        // Handle images if present
        if (currentCard.image_url) {
            questionImage.src = currentCard.image_url;
            questionImageContainer.classList.remove('hidden');
        } else {
            questionImageContainer.classList.add('hidden');
        }
        
        // Check if we should show the hint button
        if (currentCard.hint) {
            showHintBtn.classList.remove('hidden');
        } else {
            showHintBtn.classList.add('hidden');
        }
        
        // Reset the card flip state
        const cardElement = document.getElementById('flashcard');
        cardElement.classList.remove('flipped');
        
        // Hide rating controls when card is not flipped
        document.getElementById('ratingControls').classList.add('hidden');
    }
    
    /**
     * Updates the progress display
     * @param {StudySession} studySession - The study session object
     */
    updateProgress(studySession) {
        const current = studySession.currentIndex + 1;
        const total = studySession.cards.length;
        const progressText = document.getElementById('progressText');
        const progressFill = document.getElementById('progressFill');
        
        progressText.textContent = `Card ${current} of ${total}`;
        progressFill.style.width = `${(current / total) * 100}%`;
    }
    
    /**
     * Shows a notification message
     * @param {string} message - The message to display
     * @param {string} type - The type of notification (success, error, info)
     */
    showNotification(message, type = 'info') {
        // Clear existing notification if any
        if (this.notificationTimeout) {
            clearTimeout(this.notificationTimeout);
            const oldNotification = document.querySelector('.notification');
            if (oldNotification) {
                oldNotification.remove();
            }
        }
        
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        // Add to DOM
        document.body.appendChild(notification);
        
        // Make it visible
        setTimeout(() => {
            notification.classList.add('visible');
        }, 10);
        
        // Set timeout to remove
        this.notificationTimeout = setTimeout(() => {
            notification.classList.remove('visible');
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 3000);
    }
} 