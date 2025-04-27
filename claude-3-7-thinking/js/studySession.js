/**
 * Manages a study session for a flashcard deck
 */
export class StudySession {
    /**
     * @param {Object} deck - The deck object
     * @param {Object} options - Session options
     * @param {DeckManager} deckManager - The deck manager instance
     */
    constructor(deck, options, deckManager) {
        this.deck = deck;
        this.deckManager = deckManager;
        this.options = {
            cardOrder: options.cardOrder || 'sequential',
            cardLimit: options.cardLimit || deck.cards.length,
            timeLimit: options.timeLimit || 0,
            category: options.category || 'all',
            difficulties: options.difficulties || ['all']
        };
        
        this.currentIndex = 0;
        this.isCardFlipped = false;
        this.autoPlayInterval = null;
        this.timerInterval = null;
        this.remainingTime = this.options.timeLimit;
        
        // Callbacks - will be set by UI Manager
        this.onCardFlip = null;
        this.onCardChange = null;
        this.onTimerUpdate = null;
        
        // Initialize cards for the session
        this.initializeCards();
    }
    
    /**
     * Filters and shuffles cards based on session options
     */
    initializeCards() {
        let filteredCards = [...this.deck.cards];
        
        // Filter by category if specified
        if (this.options.category !== 'all') {
            filteredCards = filteredCards.filter(card => card.category === this.options.category);
        }
        
        // Filter by difficulty if specified
        if (!this.options.difficulties.includes('all')) {
            filteredCards = filteredCards.filter(card => this.options.difficulties.includes(card.difficulty));
        }
        
        // Limit number of cards if specified
        if (this.options.cardLimit < filteredCards.length) {
            filteredCards = filteredCards.slice(0, this.options.cardLimit);
        }
        
        // Shuffle if random order
        if (this.options.cardOrder === 'random') {
            this.shuffleCards(filteredCards);
        }
        
        this.cards = filteredCards;
    }
    
    /**
     * Shuffles array in place using Fisher-Yates algorithm
     * @param {Array} array - Array to shuffle
     */
    shuffleCards(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }
    
    /**
     * Starts the session
     */
    start() {
        this.currentIndex = 0;
        this.isCardFlipped = false;
        
        // Start timer if time limit is set
        if (this.options.timeLimit > 0) {
            this.remainingTime = this.options.timeLimit;
            this.startTimer();
        }
        
        // Update deck stats
        this.deckManager.updateDeckStats(this.getDeckName(), {
            lastStudied: new Date().toISOString()
        });
    }
    
    /**
     * Ends the session
     */
    end() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        
        if (this.autoPlayInterval) {
            clearInterval(this.autoPlayInterval);
            this.autoPlayInterval = null;
        }
    }
    
    /**
     * Starts the timer
     */
    startTimer() {
        if (this.timerInterval) clearInterval(this.timerInterval);
        
        this.timerInterval = setInterval(() => {
            this.remainingTime--;
            
            if (this.onTimerUpdate) {
                this.onTimerUpdate(this.remainingTime);
            }
            
            if (this.remainingTime <= 0) {
                clearInterval(this.timerInterval);
                this.nextCard();
            }
        }, 1000);
    }
    
    /**
     * Resets the timer
     */
    resetTimer() {
        if (this.options.timeLimit > 0) {
            this.remainingTime = this.options.timeLimit;
            if (this.onTimerUpdate) {
                this.onTimerUpdate(this.remainingTime);
            }
            this.startTimer();
        }
    }
    
    /**
     * Gets the current card
     * @returns {Object} The current card
     */
    getCurrentCard() {
        return this.cards[this.currentIndex];
    }
    
    /**
     * Gets the deck name
     * @returns {string} The deck name
     */
    getDeckName() {
        return Object.keys(this.deckManager.getAllDecks()).find(name => 
            this.deckManager.getDeck(name) === this.deck
        );
    }
    
    /**
     * Flips the current card
     */
    flipCurrentCard() {
        this.isCardFlipped = !this.isCardFlipped;
        
        if (this.onCardFlip) {
            this.onCardFlip(this.isCardFlipped);
        }
        
        // Update card stats when flipped to answer
        if (this.isCardFlipped) {
            const currentCard = this.getCurrentCard();
            const deckName = this.getDeckName();
            const cardIndex = this.deck.cards.indexOf(currentCard);
            
            if (cardIndex !== -1) {
                this.deckManager.updateCard(deckName, cardIndex, {
                    viewed: (currentCard.viewed || 0) + 1
                });
            }
            
            // Stop timer when card is flipped
            if (this.timerInterval) {
                clearInterval(this.timerInterval);
                this.timerInterval = null;
            }
        }
    }
    
    /**
     * Moves to the next card
     */
    nextCard() {
        if (this.currentIndex < this.cards.length - 1) {
            this.currentIndex++;
            this.isCardFlipped = false;
            
            if (this.onCardChange) {
                this.onCardChange();
            }
            
            this.resetTimer();
        } else {
            // End of deck
            this.showCompletionMessage();
        }
    }
    
    /**
     * Moves to the previous card
     */
    previousCard() {
        if (this.currentIndex > 0) {
            this.currentIndex--;
            this.isCardFlipped = false;
            
            if (this.onCardChange) {
                this.onCardChange();
            }
            
            this.resetTimer();
        }
    }
    
    /**
     * Marks the current card with a difficulty rating
     * @param {string} difficulty - The difficulty rating (easy, difficult)
     */
    markCurrentCard(difficulty) {
        const currentCard = this.getCurrentCard();
        const deckName = this.getDeckName();
        const cardIndex = this.deck.cards.indexOf(currentCard);
        
        if (cardIndex !== -1) {
            const updates = { difficulty };
            
            if (difficulty === 'easy') {
                updates.correct = (currentCard.correct || 0) + 1;
            }
            
            this.deckManager.updateCard(deckName, cardIndex, updates);
        }
        
        // Automatically move to next card after marking
        setTimeout(() => this.nextCard(), 500);
    }
    
    /**
     * Shows a hint for the current card
     */
    showHint() {
        const currentCard = this.getCurrentCard();
        
        if (currentCard && currentCard.hint) {
            alert(`Hint: ${currentCard.hint}`);
        }
    }
    
    /**
     * Toggles auto-play mode
     */
    toggleAutoPlay() {
        if (this.autoPlayInterval) {
            clearInterval(this.autoPlayInterval);
            this.autoPlayInterval = null;
            document.getElementById('autoPlayBtn').textContent = 'Auto Play';
        } else {
            // Auto flip card after 3 seconds, then move to next card after 2 more seconds
            this.autoPlayInterval = setInterval(() => {
                if (!this.isCardFlipped) {
                    this.flipCurrentCard();
                    
                    // Schedule moving to next card after viewing the answer
                    setTimeout(() => {
                        this.nextCard();
                    }, 2000);
                }
            }, 5000);
            
            document.getElementById('autoPlayBtn').textContent = 'Stop Auto';
        }
    }
    
    /**
     * Shows session completion message
     */
    showCompletionMessage() {
        // End any running intervals
        this.end();
        
        // Display completion notification
        const correct = this.cards.filter(card => card.difficulty === 'easy').length;
        const message = `
            <div class="completion-message">
                <h3>Session Complete!</h3>
                <p>You've reviewed all ${this.cards.length} cards.</p>
                <p>${correct} cards marked as easy.</p>
                <p>${this.cards.length - correct} cards marked as difficult or unrated.</p>
                <button id="returnToLibraryBtn" class="button primary">Return to Library</button>
            </div>
        `;
        
        // Create modal or notification
        const modalContent = document.getElementById('modalContent');
        const modalTitle = document.getElementById('modalTitle');
        const modalOverlay = document.getElementById('modalOverlay');
        const modalConfirmBtn = document.getElementById('modalConfirmBtn');
        const modalCancelBtn = document.getElementById('modalCancelBtn');
        
        modalTitle.textContent = 'Session Complete';
        modalContent.innerHTML = message;
        modalConfirmBtn.style.display = 'none';
        modalCancelBtn.textContent = 'Close';
        modalOverlay.classList.remove('hidden');
        
        // Add event listener to return button
        document.getElementById('returnToLibraryBtn').addEventListener('click', () => {
            modalOverlay.classList.add('hidden');
            document.getElementById('backToLibrary').click();
        });
    }
} 