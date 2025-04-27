/**
 * DeckManager handles all operations related to flashcard decks
 */
export class DeckManager {
    /**
     * @param {StorageManager} storageManager - The storage manager instance
     */
    constructor(storageManager) {
        this.storageManager = storageManager;
        this.decks = this.loadDecks();
    }
    
    /**
     * Loads all decks from storage
     * @returns {Object} Object with deck names as keys and deck data as values
     */
    loadDecks() {
        const data = this.storageManager.loadData();
        return data && data.decks ? data.decks : {};
    }
    
    /**
     * Saves all decks to storage
     * @returns {boolean} Success status
     */
    saveDecks() {
        return this.storageManager.saveData({ decks: this.decks });
    }
    
    /**
     * Gets all decks
     * @returns {Object} All decks
     */
    getAllDecks() {
        return this.decks;
    }
    
    /**
     * Gets a specific deck by name
     * @param {string} deckName - The name of the deck to get
     * @returns {Object|null} The deck data or null if not found
     */
    getDeck(deckName) {
        return this.decks[deckName] || null;
    }
    
    /**
     * Checks if a deck with the given name exists
     * @param {string} deckName - The name to check
     * @returns {boolean} True if the deck exists
     */
    deckExists(deckName) {
        return !!this.decks[deckName];
    }
    
    /**
     * Adds a new deck or replaces an existing one
     * @param {string} deckName - The name of the deck
     * @param {Object} deckData - The deck data
     * @returns {boolean} Success status
     */
    addDeck(deckName, deckData) {
        this.decks[deckName] = deckData;
        return this.saveDecks();
    }
    
    /**
     * Updates a specific card in a deck
     * @param {string} deckName - The name of the deck
     * @param {number} cardIndex - The index of the card to update
     * @param {Object} cardData - The new card data
     * @returns {boolean} Success status
     */
    updateCard(deckName, cardIndex, cardData) {
        if (!this.decks[deckName] || !this.decks[deckName].cards[cardIndex]) {
            return false;
        }
        
        this.decks[deckName].cards[cardIndex] = {
            ...this.decks[deckName].cards[cardIndex],
            ...cardData
        };
        
        return this.saveDecks();
    }
    
    /**
     * Updates the stats for a deck
     * @param {string} deckName - The name of the deck
     * @param {Object} stats - The stats to update
     * @returns {boolean} Success status
     */
    updateDeckStats(deckName, stats) {
        if (!this.decks[deckName]) {
            return false;
        }
        
        this.decks[deckName].stats = {
            ...this.decks[deckName].stats,
            ...stats
        };
        
        return this.saveDecks();
    }
    
    /**
     * Deletes a deck
     * @param {string} deckName - The name of the deck to delete
     * @returns {boolean} Success status
     */
    deleteDeck(deckName) {
        if (!this.decks[deckName]) {
            return false;
        }
        
        delete this.decks[deckName];
        return this.saveDecks();
    }
    
    /**
     * Renames a deck
     * @param {string} oldName - The current name of the deck
     * @param {string} newName - The new name for the deck
     * @returns {boolean} Success status
     */
    renameDeck(oldName, newName) {
        if (!this.decks[oldName] || this.decks[newName]) {
            return false;
        }
        
        this.decks[newName] = this.decks[oldName];
        delete this.decks[oldName];
        return this.saveDecks();
    }
    
    /**
     * Merges two decks
     * @param {string} sourceDeckName - The name of the source deck
     * @param {string} targetDeckName - The name of the target deck
     * @returns {boolean} Success status
     */
    mergeDecks(sourceDeckName, targetDeckName) {
        const sourceDeck = this.decks[sourceDeckName];
        const targetDeck = this.decks[targetDeckName];
        
        if (!sourceDeck || !targetDeck) {
            return false;
        }
        
        // Combine cards
        const combinedCards = [...targetDeck.cards, ...sourceDeck.cards];
        
        // Combine categories
        const combinedCategories = Array.from(
            new Set([...(targetDeck.categories || []), ...(sourceDeck.categories || [])])
        );
        
        // Update target deck
        this.decks[targetDeckName] = {
            cards: combinedCards,
            categories: combinedCategories,
            stats: {
                ...targetDeck.stats,
                totalCards: combinedCards.length,
                lastModified: new Date().toISOString()
            }
        };
        
        // Delete source deck
        delete this.decks[sourceDeckName];
        
        return this.saveDecks();
    }
} 