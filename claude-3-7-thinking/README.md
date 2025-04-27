# FlashCards App

A responsive browser-based flashcard application that allows users to create, manage, and study flashcard decks without requiring any build/compile step.

## Features

### Deck Management
- Upload flashcard decks via CSV files
- View all decks in a library view
- Local storage persistence between sessions
- Delete or rename decks
- Merge decks

### Study Interface
- Configure study sessions with various options:
  - Random or sequential card order
  - Number of cards to study
  - Time limit per card
  - Category filters
  - Difficulty filters
- Clean card flipping animation
- Progress tracking
- Navigation controls

### Study Features
- Track statistics for each card
- Mark cards as "easy" or "difficult"
- Keyboard shortcuts
- Auto-play mode
- Hint system for difficult cards

### Visual Design
- Responsive design for mobile and desktop
- Light/dark mode toggle
- Image support
- Accessible design

## Getting Started

1. Clone this repository or download the files
2. Open `index.html` in your web browser
3. Import a CSV file to create your first flashcard deck

## CSV Format

The application expects CSV files with the following format:

```
question,answer,category,image_url
"What is the capital of France?","Paris","Geography",""
"What is 2+2?","4","Math",""
```

Required columns:
- `question` - The front side of the flashcard
- `answer` - The back side of the flashcard

Optional columns:
- `category` - Category for grouping cards
- `image_url` - URL to an image to display on the card
- `hint` - Optional hint for difficult cards

You can download a template CSV file from the application's main screen.

## Keyboard Shortcuts

- `Space` - Flip the current card
- `Right Arrow` - Next card
- `Left Arrow` - Previous card
- `E` - Mark card as easy
- `D` - Mark card as difficult
- `H` - Show hint (if available)

## Browser Compatibility

This application works in all modern browsers and can function without an internet connection after the initial load.

## Technical Details

The application is built using vanilla JavaScript with a module-based architecture:

- `app.js` - Main application controller
- `storageManager.js` - Handles data persistence
- `deckManager.js` - Manages deck operations
- `uiManager.js` - Handles UI rendering
- `studySession.js` - Controls the study session logic

All data is stored in the browser's localStorage, allowing the app to work offline and persist data between sessions.

## Contributing

Feel free to fork this project and submit pull requests. You can also open issues for bug reports or feature requests. 