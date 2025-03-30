This document outlines the main technologies used across the frontend and backend of this project.

---

## Frontend

- **React + Remix-Run**
  - Combines React’s component-driven UI approach with Remix-Run’s server-side rendering and routing capabilities.
- **TypeScript**
  - Adds static typing for improved developer experience and fewer runtime errors.
- **Vitest**
  - A fast and lightweight testing framework suited for React and TypeScript.
- **Happy-DOM**
  - Provides a DOM implementation for testing, enabling UI tests without a real browser.
- **Zod & Zod-Form-Data**
  - Schema-based validation library to ensure safe and consistent data handling in forms.
- **Clerk** 
  - Authentication solution that manages user sessions and identity without storing sensitive user data in-house.
- **Tailwind CSS**
  - Utility-first CSS framework for rapid UI development.
- **Stripe**
  - Payment processing platform for subscription management and payment processing.

---

## Backend

- **Node.js**
  - JavaScript runtime environment for server-side logic.
- **Remix-Run**
  - Used as the server framework to handle routing, server-side rendering (where appropriate), and HTTP requests within Node.js.
- **TypeScript**
  - Ensures type safety and maintainable code on the backend as well.
- **SQLite + Drizzle-ORM + Turso**
  - Primary relational database is SQLite for local development.
  - Drizzle-ORM provides a type-safe, lightweight ORM layer.
  - Turso offers an external database service (HTTP-based) for synchronization and/or production data storage.
- **Clerk**
  - Handles server-side authentication flows consistently with the frontend.
- **Cloudflare R2**
  - Used for storing uploaded images (e.g., user-uploaded flashcard images) in a scalable and cost-effective object storage service.
- **Stripe**
  - API integration for subscription management, payment processing, and webhooks.

---