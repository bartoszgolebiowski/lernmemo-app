# App Vision

This project is about building a powerful yet user-friendly flashcard application that simplifies how users create and study flashcards. Our primary goals are:

1. **Ease of Use**: Quickly create flashcards from images, CSV files, or manual inputs.  
2. **Engaging Study Experience**: Provide a flashcard game that is flexible and convenient for regular practice.  
3. **Accessibility & Growth**: Allow users to register, track progress, and scale up to a premium plan with higher limits.

## Core Functionalities

### 1. Extract Flashcards from Images
- **Image Upload**: The user uploads an image via the web or mobile interface.
- **AI Parsing**: The app uses AI to detect text and generate potential flashcards.
- **Flashcard Templates**: The recognized text is automatically converted into front/back question-answer pairs. The user can then review and confirm or modify them.

### 2. Import Flashcards via CSV
- **CSV Upload**: In addition to images, users can upload CSV files containing flashcard data.
- **Auto-Parsing**: The system reads the CSV and proposes flashcards accordingly.
- **Editable Templates**: Users can edit, delete, or merge entries before finalizing the set of flashcards.

### 3. Flashcard Game
- **Select Attachments**: Users can pick one or more imported sets (from images or CSV) to include in the game.
- **Dynamic Number of Questions**: Users choose the desired question count or simply use all flashcards from selected attachments.
- **Game Persistence**: If a user closes the tab or loses connection, the game state is saved so they can resume later.
- **Quick Play Mode**: A “one-click” game from the main view for easy daily practice.

### 4. Flashcard Management
- **Editing & Deletion**: Users have a dedicated UI to manage existing flashcards. They can edit question-answer pairs or remove them entirely.
- **Attachments Overview**: Easily see which images and CSV files have been uploaded and the flashcards they generated.

### 5. Statistics and Tracking
- **Daily/Weekly Progress**: Track how many flashcards have been completed today and on previous days.
- **Game Summary**: After finishing (or pausing) a game, view a summary of correct, incorrect, or skipped answers.
- **Personal Dashboard**: See global stats, daily streaks, or most challenging flashcards.

### 6. Account System
- **Registration & Login**: Basic authentication for storing user data (flashcards, stats, etc.).
- **Subscription Tiers**:
  - **Free Plan**: Full access to all features, but with limited usage (e.g., maximum flashcards, limited image processing, etc.).
  - **Premium Plan**: Larger usage limits and priority processing.

## Vision Highlights
1. **User-Friendly AI Integration**: Streamlined import from images or CSV without needing specialized knowledge.
2. **Motivational Learning Experience**: Gamified studying plus visual progress indicators.
3. **Scalable for Growth**: Designed to accommodate increasing numbers of uploads and users.
4. **Continuous Engagement**: Daily stats, quick play mode, and persistent games encourage frequent use.

## Next Steps
- **Technical Design**: Choose frameworks and libraries for image processing, CSV handling, user authentication, and subscription management.
- **Prototyping**: Create initial UI wireframes and run quick AI integration tests (image parsing).
- **Iterative Development**: Build core features, gather feedback, and refine the user journey.
