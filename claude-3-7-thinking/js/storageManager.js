/**
 * StorageManager handles all local storage operations for the flashcard app
 */
export class StorageManager {
    constructor() {
        this.storageKey = 'flashcards_app_data';
        
        // Check if local storage is available
        this.isAvailable = this.checkStorageAvailability();
    }
    
    /**
     * Checks if localStorage is available in the browser
     * @returns {boolean} True if localStorage is available
     */
    checkStorageAvailability() {
        try {
            const testKey = '__storage_test__';
            localStorage.setItem(testKey, testKey);
            localStorage.removeItem(testKey);
            return true;
        } catch (e) {
            return false;
        }
    }
    
    /**
     * Saves data to localStorage
     * @param {Object} data - Data to save
     * @returns {boolean} Success status
     */
    saveData(data) {
        if (!this.isAvailable) return false;
        
        try {
            const serializedData = JSON.stringify(data);
            localStorage.setItem(this.storageKey, serializedData);
            return true;
        } catch (e) {
            console.error('Failed to save to localStorage:', e);
            return false;
        }
    }
    
    /**
     * Loads data from localStorage
     * @returns {Object|null} The stored data or null if not found
     */
    loadData() {
        if (!this.isAvailable) return null;
        
        try {
            const serializedData = localStorage.getItem(this.storageKey);
            if (serializedData === null) return null;
            return JSON.parse(serializedData);
        } catch (e) {
            console.error('Failed to load from localStorage:', e);
            return null;
        }
    }
    
    /**
     * Clears all app data from localStorage
     * @returns {boolean} Success status
     */
    clearData() {
        if (!this.isAvailable) return false;
        
        try {
            localStorage.removeItem(this.storageKey);
            return true;
        } catch (e) {
            console.error('Failed to clear localStorage:', e);
            return false;
        }
    }
} 