# Architecture

This document outlines the major architectural decisions and the rationale behind them. It covers how the frontend and backend are organized, how they communicate with each other and external services, and how data is stored and retrieved.

---

## 1. Overall Approach

- **Monolithic Structure**: Frontend and backend live within the same process, simplifying deployment and maintenance.  
- **HTTP Communication**: All communication between the frontend and backend uses standard HTTP requests/responses.

---
## 2. High-Level Components

1. **Frontend**: Renders the user interface, sends requests to the backend via HTTP.
2. **Backend**: Handles business logic, communicates with the SQL database, and integrates with external services.
3. **SQL Database**: Primary data store for the application.
4. **External Services**: Gemini AI for flashcard parsing, external authentication providers, and any additional resources accessible via HTTP.

---

## 3. Frontend

- The frontend (web UI) is served by the same process that hosts our backend, simplifying the deployment approach.
- All user interactions (image/CSV upload, flashcard management, etc.) generate HTTP requests handled by the backend.

### Why Monolithic?
- **Single Deployable Unit**: Easier to host, manage, and version.
- **Lower Operational Complexity**: No need to coordinate multiple services or containers.

---

## 4. Backend

- **HTTP REST Endpoints**: Expose CRUD operations for flashcards, user stats, and game sessions.
- **Business Logic Layer**: 
  - Validates inputs from the UI.
  - Applies rules (e.g., limits on free-tier accounts).
  - Orchestrates AI requests and merges results into the database.

### Technology Choices (Example)
- **Framework**: Could be built with Node.js, Python, or any desired server-side framework.  
- **Language**: Choice depends on team expertise—e.g., JavaScript/TypeScript or Python.

---

## 5. Database (SQL)

- **Rationale**: 
  - Familiar relational schemas for structured data (flashcards, user profiles, subscription tiers, etc.).
  - Easy to handle transactions, references between multiple tables (e.g., one user can have many flashcard sets).
- **Integration**: 
  - The backend connects to the SQL database via an ORM or direct SQL queries.
  - For reliability and scalability, we can employ features like connection pooling.

---

## 6. External Services

### 6.1 Gemini for AI Integration
- **Purpose**: Processes images and CSV data to generate flashcards automatically.
- **Integration**: 
  - The backend sends requests to Gemini’s API via HTTP.
  - Receives text recognition or other AI-generated data.
  - Stores the results in the SQL database.

### 6.2 External Authentication Providers
- **Purpose**: Handle user authentication and reduce liability for storing sensitive information.
- **Integration**:
  - Users are redirected to trusted providers (e.g., Google, Facebook, etc.) to authenticate.
  - Once authenticated, the provider returns an access token or unique user ID that our app can store.

### 6.3 External Database via HTTP
- **Use Case**: Potentially store or retrieve additional data from a managed database service that exposes an HTTP connection string.
- **Integration**:
  - The backend uses the provided HTTP endpoint to interact with the external DB (if it’s part of a broader enterprise environment or specialized service).

---

## 7. Security Considerations

1. **HTTPS Enforcement**: All traffic should be encrypted (SSL/TLS) to protect user data in transit.  
2. **Authentication Tokens**: Use secure tokens from external auth providers to maintain user sessions.  
3. **Role-Based Access**: Certain features (e.g., premium-tier usage) require additional checks before processing.  
4. **AI Requests**: Ensure that the data sent to external AI services is sanitized and stored/processed according to privacy guidelines.

---

## 8. Future Evolution

- **Microservices**: If the application grows in complexity, the AI integration or other subsystems could be split into independent services.
- **Cloud Deployment**: Containerization and orchestration (e.g., Docker, Kubernetes) can be introduced for scaling as user traffic increases.
- **Caching Layer**: Adding Redis or an equivalent store to reduce load on the SQL database for frequently accessed data.

---
