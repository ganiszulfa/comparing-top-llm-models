# Browser-Based Flashcard Application

A simple, responsive flashcard application that runs directly in your web browser.

## Features

-   **Deck Management:**
    -   Upload decks from CSV files (`question`, `answer` required; `image_url`, `category`, `hint` optional).
    -   View library of uploaded decks with names and card counts.
    -   Rename or delete decks.
    -   Merge multiple selected decks into a new deck.
    -   Decks are persisted in your browser's local storage.
-   **Study Interface:**
    -   Configure study sessions: random/sequential order, number of cards, category filter, optional time limit per card.
    -   Clean card flipping animation.
    -   Progress tracking (current card / total).
    -   Navigation controls (Previous, Flip, Next).
    -   Autoplay mode.
-   **Study Features:**
    -   Mark cards as correct or incorrect.
    -   Mark cards as "Easy" or "Difficult" for review.
    -   Card statistics (viewed, correct, incorrect counts) are tracked per deck and saved.
    -   Hint system (if hints are provided in the CSV).
    -   Keyboard shortcuts for common actions (Space/F: Flip, Left/P: Prev, Right/N: Next, C: Correct, I: Incorrect, E: Easy, D: Difficult, H: Hint, A: Autoplay).
-   **Visual Design:**
    -   Responsive layout for desktop and mobile.
    -   Light/Dark mode toggle.
    -   Displays images associated with cards.
-   **Offline Capable:** Works without an internet connection after the initial load.
-   **Accessibility:** Basic keyboard navigation and focus indicators.

## How to Use

1.  **Clone or Download:** Get the `index.html`, `style.css`, `script.js`, and `sample_deck.csv` files.
2.  **Open `index.html`:** Open the `index.html` file directly in your web browser (like Chrome, Firefox, Edge, Safari).
3.  **Upload Decks:**
    -   Click the "Upload Deck (CSV)" button and select your CSV file.
    -   The CSV must have columns named `question` and `answer`.
    -   Optional columns: `image_url`, `category`, `hint`. Column order doesn't matter, but the names must match exactly (case-insensitive).
    -   Use the "Download Sample CSV" link to see the expected format.
4.  **Manage Decks:**
    -   Your uploaded decks will appear in the "Deck Library".
    -   Click on a deck name to start configuring a study session.
    -   Use the Rename/Delete buttons for each deck.
    -   Select checkboxes next to deck names (at least two) and click "Merge Selected Decks" to combine them.
5.  **Study:**
    -   Choose your study options (order, number of cards, category, time limit).
    -   Click "Start Studying".
    -   Use the controls or keyboard shortcuts to navigate, flip cards, and provide feedback.
    -   Finish the session or click "Finish Study Session" early.
6.  **Review Results:** View a summary and detailed statistics after completing a session.

## CSV Format Details

-   The first row **must** be the header row.
-   Header names must include `question` and `answer`. Case is ignored (e.g., `Question` works).
-   Optional headers: `image_url`, `category`, `hint`.
-   Data should be comma-separated. If your text includes commas, enclose it in double quotes (e.g., `"This question, with a comma, is tricky"`). Basic CSV parsing is used, so complex cases with escaped quotes might not work perfectly.
-   Blank lines are ignored.
-   Rows missing a `question` or `answer` will be skipped during import.

## Local Storage

All deck data and study statistics are stored in your browser's local storage. Clearing your browser's site data for this page will remove all saved decks and progress. 