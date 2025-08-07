# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

DeskPlanner is a client-side React SPA for managing coworking desk bookings. It provides a calendar interface for tracking desk availability, person assignments, and room bookings across multiple coworking spaces. The app uses LocalStorage for data persistence and is deployed as a static website on GitHub Pages.

## Development Commands

```bash
# Start development server with hot reload
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Type checking
npm run check

# Lint (type check without emit)
npm run lint

# Deploy to GitHub Pages
npm run deploy
```

## Architecture & Key Design Patterns

### Tech Stack
- **Frontend**: React 18 + TypeScript + Vite + TanStack Query + Wouter routing
- **UI Components**: shadcn/ui (47 components in `/client/src/components/ui/`)
- **Data Storage**: Dual support for LocalStorage and MongoDB Atlas via Data API
- **Validation**: Zod schemas in `/shared/schema.ts`
- **Deployment**: Static site on GitHub Pages

### MongoDB Setup

The app supports MongoDB Atlas through the Data API. To enable MongoDB:

1. **Enable Data API in MongoDB Atlas**:
   - Go to your MongoDB Atlas dashboard
   - Navigate to "Data API" in the left sidebar
   - Enable the Data API and create an API key
   - Note your Data API endpoint URL

2. **Configure Environment Variables**:
   - Copy `.env.example` to `.env`
   - Set `VITE_MONGODB_DATA_API_URL` with your endpoint
   - Set `VITE_MONGODB_DATA_API_KEY` with your API key
   - Set `VITE_STORAGE_TYPE=mongodb` to use MongoDB (or `localStorage` for local storage)

3. **IP Whitelisting**:
   - Ensure your IP address is whitelisted in MongoDB Atlas Network Access
   - Or use 0.0.0.0/0 for development (not recommended for production)

### Core Architectural Decisions

1. **Storage Abstraction Pattern**: All data operations go through `IDataStore` interface with implementations for:
   - LocalStorage (`/client/src/lib/dataStore.ts`) - for offline/demo use
   - MongoDB Atlas Data API (`/client/src/lib/mongoDataStore.ts`) - for production use
   - Storage type is determined by `VITE_STORAGE_TYPE` environment variable

2. **Shared Schema**: Type definitions and Zod schemas in `/shared/schema.ts` ensure type safety and data validation throughout the application.

3. **Component Architecture**: 
   - Business components in `/client/src/components/` (Calendar, BookingActions, etc.)
   - UI primitives from shadcn/ui in `/client/src/components/ui/`
   - All components use TypeScript interfaces for props

4. **Calendar System**: 
   - Supports weekly/monthly views with desk availability tracking
   - Three booking statuses: Available, Booked, Assigned
   - Bulk operations via Ctrl+click and range selection
   - Real-time statistics calculation

### Data Model

```typescript
// Core entities (defined in /shared/schema.ts)
- DeskBooking: Complete booking with person, dates, pricing, title
- Desk: Room (2 rooms) and desk number (8 desks total)
- WaitingListEntry: Queue management for desk requests
- AppSettings: User preferences and currency configuration
```

### Path Aliases

The project uses these import aliases:
- `@/` → `/client/src/`
- `@shared/` → `/shared/`
- `@assets/` → `/client/src/assets/`

### Key Files for Understanding Architecture

- `/client/src/lib/dataStore.ts` - Factory for creating data store instances
- `/client/src/lib/localStorage.ts` - LocalStorage implementation of data persistence
- `/client/src/pages/desk-calendar.tsx` - Main calendar page with complex interaction logic
- `/shared/schema.ts` - All type definitions and validation schemas
- `/client/src/hooks/use-toast.ts` - Toast notification system for error handling

## Testing

No test framework is currently configured. When implementing tests, consider the calendar interaction logic and data store abstraction as priority areas for coverage.