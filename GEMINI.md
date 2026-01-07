# GEMINI.md

This file provides context and guidance for Gemini when working with the DeskPlanner repository.

## Project Overview

DeskPlanner is a client-side React Single Page Application (SPA) designed for managing coworking desk bookings. It features a calendar interface for tracking desk availability, person assignments, and room bookings. The application supports data persistence via LocalStorage (for demos/offline) or MongoDB Atlas (for production) and is deployed as a static site on GitHub Pages.

## Technology Stack

-   **Frontend Framework**: React 18
-   **Language**: TypeScript
-   **Build Tool**: Vite
-   **State Management & Data Fetching**: TanStack Query (React Query)
-   **Routing**: Wouter
-   **UI Components**: shadcn/ui (Radix UI primitives + Tailwind CSS)
-   **Styling**: Tailwind CSS
-   **Validation**: Zod
-   **Icons**: Lucide React, React Icons
-   **Date Handling**: date-fns, dayjs

## Architecture

### Directory Structure

-   `client/src/`: Main frontend source code.
    -   `components/`: React components (business logic).
    -   `components/ui/`: Reusable UI primitives (shadcn/ui).
    -   `hooks/`: Custom React hooks.
    -   `lib/`: Utility functions and data store implementations.
    -   `pages/`: Top-level page components.
-   `shared/`: Code shared between frontend and potential backend (currently mostly types and schemas).
-   `attached_assets/`: Static assets.
-   `dist/`: Production build output.

### Path Aliases

The project uses the following TypeScript/Vite path aliases:

-   `@/` → `/client/src/`
-   `@shared/` → `/shared/`
-   `@assets/` → `/attached_assets/`

### Data Storage

The application uses a **Storage Abstraction Pattern** defined by the `IDataStore` interface.
-   **LocalStorage**: Implemented in `client/src/lib/localStorage.ts`.
-   **MongoDB Atlas**: Implemented in `client/src/lib/mongoDataStore.ts` using the Data API.
-   **Configuration**: The active storage engine is selected via the `VITE_STORAGE_TYPE` environment variable (`mongodb` or `localStorage`).

## Development Workflow

### Prerequisites

-   Node.js
-   npm

### Commands

| Command | Description |
| :--- | :--- |
| `npm run dev` | Start the development server with hot reload. |
| `npm run build` | Type-check and build the application for production. |
| `npm run preview` | Preview the production build locally. |
| `npm run check` | Run TypeScript type checking. |
| `npm run lint` | Run linting (TypeScript no-emit). |
| `npm run deploy` | Build and deploy to GitHub Pages. |

### Environment Configuration

Copy `.env.example` to `.env` to configure the application.

-   `VITE_STORAGE_TYPE`: Set to `mongodb` or `localStorage`.
-   `VITE_MONGODB_DATA_API_URL`: MongoDB Atlas Data API endpoint.
-   `VITE_MONGODB_DATA_API_KEY`: MongoDB Atlas Data API key.

## Key Files

-   `CLAUDE.md`: Original AI guidance file.
-   `shared/schema.ts`: Zod schemas and TypeScript type definitions for core entities (DeskBooking, Desk, etc.).
-   `client/src/lib/dataStore.ts`: Factory for creating the appropriate data store instance.
-   `client/src/pages/desk-calendar.tsx`: Main calendar view logic.
-   `vite.config.ts`: Vite configuration including plugins and aliases.
