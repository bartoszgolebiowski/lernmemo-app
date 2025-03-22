# AI Rules for lernmemo

# App Vision

This project is about building a powerful yet user-friendly flashcard application that simplifies how users create and study flashcards. Our primary goals are:

1. **Ease of Use**: Quickly create flashcards from images, CSV files, or manual inputs.  
2. **Engaging Study Experience**: Provide a flashcard game that is flexible and convenient for regular practice.  
3. **Accessibility & Growth**: Allow users to register, track progress, and scale up to a premium plan with higher limits.

## Coding practices

### Guidelines for AI Support Level

#### I am an expert

- Favor elegant, maintainable solutions over verbose code. Assume understanding of language idioms and design patterns.
- Highlight potential performance implications and optimization opportunities in suggested code.
- Frame solutions within broader architectural contexts and suggest design alternatives when appropriate.
- Focus comments on 'why' not 'what' - assume code readability through well-named functions and variables.
- Proactively address edge cases, race conditions, and security considerations without being prompted.
- When debugging, provide targeted diagnostic approaches rather than shotgun solutions.
- Suggest comprehensive testing strategies rather than just example tests, including considerations for mocking, test organization, and coverage.

## Testing

### Guidelines for Unit Testing

#### Vitest

- Use Vitest for faster testing in Vite-based projects
- Leverage the vi object for mocks and spies
- Implement the test.each pattern for parameterized tests
- Use the setup files for global test configuration
- Leverage the inline snapshot feature for small snapshots
- Use the watch mode for development
- Leverage the UI mode for interactive test exploration
- Implement mocking for modules and dependencies
- Use happy-dom for DOM testing environment

## Database

### Guidelines for SQL

#### SQLite

- **SQLite + Drizzle-ORM + Turso**
  - Primary relational database is SQLite for local development.
  - Drizzle-ORM provides a type-safe, lightweight ORM layer.
  - Turso offers an external database service (HTTP-based) for synchronization and/or production data storage.

## Frontend

### Guidelines for React

#### React Coding Standards

- Use functional components with hooks instead of class components
- Use the useCallback hook for event handlers passed to child components to prevent unnecessary re-renders
- Use the new use hook for data fetching in React 19+ projects
- Leverage Server Components for {{data_fetching_heavy_components}} when using React with Next.js or similar frameworks
- Consider using the new useOptimistic hook for optimistic UI updates in forms
- Use useTransition for non-urgent state updates to keep the UI responsive

### Guidelines for Styling

#### Tailwind

- Use the @layer directive to organize styles into components, utilities, and base layers
- Implement Just-in-Time (JIT) mode for development efficiency and smaller CSS bundles
- Use arbitrary values with square brackets (e.g., w-[123px]) for precise one-off designs
- Leverage the @apply directive in component classes to reuse utility combinations
- Implement the Tailwind configuration file for customizing theme, plugins, and variants
- Use component extraction for repeated UI patterns instead of copying utility classes
- Leverage the theme() function in CSS for accessing Tailwind theme values
- Implement dark mode with the dark: variant
- Use responsive variants (sm:, md:, lg:, etc.) for adaptive designs
- Leverage state variants (hover:, focus:, active:, etc.) for interactive elements
