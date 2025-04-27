import { StorageManager } from './storageManager.js';
import { DeckManager } from './deckManager.js';
import { UIManager } from './uiManager.js';
import { StudySession } from './studySession.js';

class FlashcardApp {
    constructor() {
        this.storageManager = new StorageManager();
        this.deckManager = new DeckManager(this.storageManager);
        this.uiManager = new UIManager();
        this.studySession = null;
        
        this.deckLibraryEl = document.getElementById('deckLibrary');
        this.deckConfigEl = document.getElementById('deckConfig');
        this.studyModeEl = document.getElementById('studyMode');
        this.deckConfigTitleEl = document.getElementById('deckConfigTitle');
        this.deckListEl = document.getElementById('deckList');
        this.csvFileInputEl = document.getElementById('csvFileInput');
        this.downloadTemplateBtn = document.getElementById('downloadTemplateBtn');
        this.studyConfigFormEl = document.getElementById('studyConfigForm');
        this.cardLimitEl = document.getElementById('cardLimit');
        this.customCardLimitEl = document.getElementById('customCardLimit');
        this.categorySelectEl = document.getElementById('categorySelect');
        this.themeToggleEl = document.getElementById('themeToggle');
        this.backToLibraryBtn = document.getElementById('backToLibrary');
        this.backToConfigBtn = document.getElementById('backToConfig');
        this.modalOverlayEl = document.getElementById('modalOverlay');
        this.modalEl = document.getElementById('modal');
        this.modalTitleEl = document.getElementById('modalTitle');
        this.modalContentEl = document.getElementById('modalContent');
        this.modalCancelBtn = document.getElementById('modalCancelBtn');
        this.modalConfirmBtn = document.getElementById('modalConfirmBtn');
        
        this.currentDeck = null;
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.loadDecks();
        this.loadThemePreference();
    }
    
    setupEventListeners() {
        // File import
        this.csvFileInputEl.addEventListener('change', this.handleFileImport.bind(this));
        this.downloadTemplateBtn.addEventListener('click', this.downloadTemplate.bind(this));
        
        // Navigation 
        this.backToLibraryBtn.addEventListener('click', this.showDeckLibrary.bind(this));
        this.backToConfigBtn.addEventListener('click', this.showDeckConfig.bind(this));
        
        // Form events
        this.cardLimitEl.addEventListener('change', this.toggleCustomCardLimit.bind(this));
        this.studyConfigFormEl.addEventListener('submit', this.handleStudyStart.bind(this));
        
        // Theme toggle
        this.themeToggleEl.addEventListener('change', this.toggleTheme.bind(this));
        
        // Modal events
        this.modalCancelBtn.addEventListener('click', () => this.closeModal());
        
        // Global keyboard shortcuts
        document.addEventListener('keydown', this.handleKeyboardShortcuts.bind(this));
    }
    
    loadDecks() {
        const decks = this.deckManager.getAllDecks();
        this.uiManager.renderDeckList(this.deckListEl, decks, this.handleDeckSelect.bind(this), this.handleDeckRename.bind(this), this.handleDeckDelete.bind(this), this.handleDeckMerge.bind(this));
    }
    
    loadThemePreference() {
        const darkModeEnabled = localStorage.getItem('darkMode') === 'true';
        if (darkModeEnabled) {
            document.body.classList.add('dark-theme');
            this.themeToggleEl.checked = true;
        }
    }
    
    toggleTheme() {
        document.body.classList.toggle('dark-theme');
        const isDarkMode = document.body.classList.contains('dark-theme');
        localStorage.setItem('darkMode', isDarkMode);
    }
    
    async handleFileImport(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        try {
            const deckData = await this.parseCSVFile(file);
            const deckName = file.name.replace('.csv', '');
            
            if (this.deckManager.deckExists(deckName)) {
                this.showModal(
                    'Deck Already Exists',
                    `A deck named "${deckName}" already exists. Do you want to replace it?`,
                    () => {
                        this.deckManager.addDeck(deckName, deckData);
                        this.loadDecks();
                        this.uiManager.showNotification('Deck replaced successfully!', 'success');
                    }
                );
            } else {
                this.deckManager.addDeck(deckName, deckData);
                this.loadDecks();
                this.uiManager.showNotification('Deck imported successfully!', 'success');
            }
        } catch (error) {
            this.uiManager.showNotification(`Error importing deck: ${error.message}`, 'error');
        }
        
        // Reset file input
        event.target.value = '';
    }
    
    parseCSVFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const csv = e.target.result;
                    const lines = csv.split('\n');
                    const headers = lines[0].split(',').map(header => header.trim().toLowerCase());
                    
                    // Validate required columns
                    if (!headers.includes('question') || !headers.includes('answer')) {
                        reject(new Error('CSV must include "question" and "answer" columns'));
                        return;
                    }
                    
                    const cards = [];
                    const categories = new Set();
                    
                    for (let i = 1; i < lines.length; i++) {
                        if (!lines[i].trim()) continue;
                        
                        const values = this.parseCSVLine(lines[i]);
                        if (values.length !== headers.length) {
                            reject(new Error(`Line ${i+1} has ${values.length} values but should have ${headers.length}`));
                            return;
                        }
                        
                        const card = {};
                        headers.forEach((header, index) => {
                            card[header] = values[index];
                        });
                        
                        // Add default values if not present
                        card.viewed = card.viewed || 0;
                        card.correct = card.correct || 0;
                        card.difficulty = card.difficulty || 'unrated';
                        
                        if (card.category) {
                            categories.add(card.category);
                        }
                        
                        cards.push(card);
                    }
                    
                    resolve({
                        cards,
                        categories: Array.from(categories),
                        stats: {
                            created: new Date().toISOString(),
                            lastStudied: null,
                            totalCards: cards.length
                        }
                    });
                } catch (error) {
                    reject(new Error('Failed to parse CSV: ' + error.message));
                }
            };
            
            reader.onerror = () => {
                reject(new Error('Failed to read file'));
            };
            
            reader.readAsText(file);
        });
    }
    
    parseCSVLine(line) {
        const result = [];
        let inQuotes = false;
        let currentValue = '';
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(currentValue.trim());
                currentValue = '';
            } else {
                currentValue += char;
            }
        }
        
        // Add the last value
        result.push(currentValue.trim());
        return result;
    }
    
    downloadTemplate() {
        const template = 'question,answer,category,image_url\n"What is the capital of France?","Paris","Geography",""\n"What is 2+2?","4","Math",""';
        const blob = new Blob([template], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'flashcard_template.csv';
        a.click();
        URL.revokeObjectURL(url);
    }
    
    handleDeckSelect(deckName) {
        this.currentDeck = this.deckManager.getDeck(deckName);
        if (!this.currentDeck) return;
        
        // Update deck config UI
        this.deckConfigTitleEl.textContent = `Configure Study: ${deckName}`;
        
        // Populate categories dropdown
        this.populateCategoryDropdown();
        
        // Show deck config screen
        this.uiManager.showSection(this.deckConfigEl);
    }
    
    populateCategoryDropdown() {
        // Clear existing options except the first one
        while (this.categorySelectEl.options.length > 1) {
            this.categorySelectEl.remove(1);
        }
        
        // Add categories from the deck
        const categories = this.currentDeck.categories || [];
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            this.categorySelectEl.appendChild(option);
        });
        
        // Show/hide category dropdown based on if there are categories
        document.getElementById('categorySelectGroup').style.display = categories.length > 0 ? 'block' : 'none';
    }
    
    handleDeckDelete(deckName) {
        this.showModal(
            'Delete Deck',
            `Are you sure you want to delete "${deckName}"? This cannot be undone.`,
            () => {
                this.deckManager.deleteDeck(deckName);
                this.loadDecks();
                this.uiManager.showNotification('Deck deleted successfully!', 'success');
            }
        );
    }
    
    handleDeckRename(deckName) {
        this.modalTitleEl.textContent = 'Rename Deck';
        this.modalContentEl.innerHTML = `
            <p>Enter a new name for "${deckName}":</p>
            <input type="text" id="newDeckName" value="${deckName}" class="modal-input">
        `;
        
        this.modalConfirmBtn.onclick = () => {
            const newName = document.getElementById('newDeckName').value.trim();
            if (!newName) {
                this.uiManager.showNotification('Deck name cannot be empty', 'error');
                return;
            }
            
            if (newName === deckName) {
                this.closeModal();
                return;
            }
            
            if (this.deckManager.deckExists(newName)) {
                this.uiManager.showNotification('A deck with this name already exists', 'error');
                return;
            }
            
            this.deckManager.renameDeck(deckName, newName);
            this.loadDecks();
            this.closeModal();
            this.uiManager.showNotification('Deck renamed successfully!', 'success');
        };
        
        this.modalOverlayEl.classList.remove('hidden');
    }
    
    handleDeckMerge(deckName) {
        const decks = this.deckManager.getAllDecks();
        const otherDecks = Object.keys(decks).filter(name => name !== deckName);
        
        if (otherDecks.length === 0) {
            this.uiManager.showNotification('No other decks available to merge with', 'error');
            return;
        }
        
        this.modalTitleEl.textContent = 'Merge Decks';
        
        let deckOptions = '';
        otherDecks.forEach(name => {
            deckOptions += `<option value="${name}">${name}</option>`;
        });
        
        this.modalContentEl.innerHTML = `
            <p>Select the deck to merge with "${deckName}":</p>
            <select id="mergeTargetDeck" class="modal-input">
                ${deckOptions}
            </select>
            <p class="modal-help">This will combine all cards from both decks.</p>
        `;
        
        this.modalConfirmBtn.onclick = () => {
            const targetDeckName = document.getElementById('mergeTargetDeck').value;
            this.deckManager.mergeDecks(deckName, targetDeckName);
            this.loadDecks();
            this.closeModal();
            this.uiManager.showNotification('Decks merged successfully!', 'success');
        };
        
        this.modalOverlayEl.classList.remove('hidden');
    }
    
    toggleCustomCardLimit() {
        if (this.cardLimitEl.value === 'custom') {
            this.customCardLimitEl.classList.remove('hidden');
        } else {
            this.customCardLimitEl.classList.add('hidden');
        }
    }
    
    handleStudyStart(event) {
        event.preventDefault();
        
        if (!this.currentDeck) return;
        
        // Get form values
        const formData = new FormData(this.studyConfigFormEl);
        const cardOrder = formData.get('cardOrder');
        
        let cardLimit;
        if (this.cardLimitEl.value === 'custom') {
            cardLimit = parseInt(this.customCardLimitEl.value, 10) || 10;
        } else if (this.cardLimitEl.value === 'all') {
            cardLimit = this.currentDeck.cards.length;
        } else {
            cardLimit = parseInt(this.cardLimitEl.value, 10);
        }
        
        const timeLimit = parseInt(document.getElementById('timeLimit').value, 10) || 0;
        const selectedCategory = this.categorySelectEl.value;
        
        // Get difficulty options
        const difficultyOptions = [];
        document.querySelectorAll('input[name="difficulty"]:checked').forEach(checkbox => {
            difficultyOptions.push(checkbox.value);
        });
        
        // Initialize study session
        this.studySession = new StudySession(
            this.currentDeck, 
            {
                cardOrder,
                cardLimit,
                timeLimit,
                category: selectedCategory,
                difficulties: difficultyOptions
            },
            this.deckManager
        );
        
        if (this.studySession.cards.length === 0) {
            this.uiManager.showNotification('No cards match your criteria', 'error');
            return;
        }
        
        // Update UI
        this.uiManager.renderStudySession(this.studySession);
        
        // Start session
        this.studySession.start();
        
        // Show study mode section
        this.uiManager.showSection(this.studyModeEl);
    }
    
    showDeckLibrary() {
        this.uiManager.showSection(this.deckLibraryEl);
    }
    
    showDeckConfig() {
        if (this.studySession) {
            this.studySession.end();
            this.studySession = null;
        }
        
        this.uiManager.showSection(this.deckConfigEl);
    }
    
    showModal(title, content, confirmCallback) {
        this.modalTitleEl.textContent = title;
        this.modalContentEl.innerHTML = `<p>${content}</p>`;
        this.modalConfirmBtn.onclick = () => {
            confirmCallback();
            this.closeModal();
        };
        this.modalOverlayEl.classList.remove('hidden');
    }
    
    closeModal() {
        this.modalOverlayEl.classList.add('hidden');
    }
    
    handleKeyboardShortcuts(event) {
        // Only handle shortcuts if we're in study mode and have an active session
        if (!this.studySession || this.studyModeEl.classList.contains('hidden')) {
            return;
        }
        
        switch (event.key) {
            case ' ':
                // Space to flip card
                event.preventDefault();
                this.studySession.flipCurrentCard();
                break;
            case 'ArrowRight':
                // Right arrow for next card
                this.studySession.nextCard();
                break;
            case 'ArrowLeft':
                // Left arrow for previous card
                this.studySession.previousCard();
                break;
            case 'e':
            case 'E':
                // E to mark as easy
                if (this.studySession.isCardFlipped) {
                    this.studySession.markCurrentCard('easy');
                }
                break;
            case 'd':
            case 'D':
                // D to mark as difficult
                if (this.studySession.isCardFlipped) {
                    this.studySession.markCurrentCard('difficult');
                }
                break;
            case 'h':
            case 'H':
                // H to show hint
                if (!this.studySession.isCardFlipped) {
                    this.studySession.showHint();
                }
                break;
        }
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new FlashcardApp();
}); 