# DeskPlanner

A modern, feature-rich desk booking and coworking space management application built with React and TypeScript.

[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](https://choosealicense.com/licenses/mit/)
[![React](https://img.shields.io/badge/React-18.3-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue.svg)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC.svg)](https://tailwindcss.com/)

---

## Overview

DeskPlanner provides an intuitive calendar interface for managing desk availability, person assignments, and bookings across multiple coworking spaces. Whether you're running a small office or a large coworking facility, DeskPlanner helps you visualize and manage desk utilization efficiently.

## Features

### Calendar Management
- **Weekly & Monthly Views** — Switch between week and month views with smooth navigation
- **Visual Availability** — Color-coded status indicators (Available, Booked, Assigned)
- **Today Highlighting** — Current day automatically highlighted and scrolled into view
- **Weekend Handling** — Smart weekend detection and display

### Booking System
- **Quick Booking** — Click any cell to create or modify bookings
- **Bulk Operations** — Ctrl+click and range selection for efficient bulk updates
- **Date Range Bookings** — Set availability for multiple desks across date ranges
- **Person Assignment** — Assign specific people to desks with contact information

### Revenue Tracking
- **Revenue Dashboard** — Track monthly revenue with detailed breakdowns
- **Confirmed vs Expected** — Separate tracking for confirmed and projected revenue
- **Occupancy Metrics** — Monitor occupancy rates and revenue per occupied day
- **Multi-Currency Support** — USD and EUR currency options

### Additional Features
- **Waiting List** — Manage requests for desk availability
- **Floor Plan View** — Visual room layout for spatial understanding
- **Real-time Sync** — Live updates across multiple sessions (with Supabase)
- **Data Migration** — Built-in tools for migrating between storage backends
- **Responsive Design** — Works on desktop and mobile devices

## Tech Stack

| Category | Technology |
|----------|------------|
| **Frontend** | React 18, TypeScript, Vite |
| **Styling** | Tailwind CSS, shadcn/ui components |
| **State Management** | TanStack Query (React Query) |
| **Routing** | Wouter |
| **Forms** | React Hook Form + Zod validation |
| **Charts** | Recharts |
| **Storage Options** | LocalStorage, MongoDB Atlas, Supabase |
| **Deployment** | GitHub Pages |

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

1. Clone the repository
   ```bash
   git clone https://github.com/bodrovphone/DeskPlanner.git
   cd DeskPlanner
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Start the development server
   ```bash
   npm run dev
   ```

4. Open [http://localhost:5173](http://localhost:5173) in your browser

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build locally |
| `npm run check` | Run TypeScript type checking |
| `npm run test` | Run tests with Vitest |
| `npm run deploy` | Build and deploy to GitHub Pages |

## Configuration

### Environment Variables

Copy `.env.example` to `.env` and configure:

```env
# Storage type: 'localStorage', 'mongodb', or 'supabase'
VITE_STORAGE_TYPE=localStorage

# MongoDB Atlas Data API (optional)
VITE_MONGODB_DATA_API_URL=your_data_api_endpoint
VITE_MONGODB_DATA_API_KEY=your_api_key

# Supabase (optional)
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### Storage Options

DeskPlanner supports multiple storage backends:

- **LocalStorage** — Zero configuration, perfect for personal use or demos
- **MongoDB Atlas** — Scalable cloud storage via Data API
- **Supabase** — Real-time sync with PostgreSQL backend

## Project Structure

```
deskplanner/
├── client/
│   └── src/
│       ├── components/     # React components
│       │   ├── ui/         # shadcn/ui primitives
│       │   └── ...         # Feature components
│       ├── hooks/          # Custom React hooks
│       ├── lib/            # Utilities & data stores
│       ├── contexts/       # React contexts
│       └── pages/          # Page components
├── shared/
│   └── schema.ts           # Zod schemas & TypeScript types
└── ...
```

## Data Model

```typescript
// Core entities
DeskBooking {
  id, deskId, date, startDate, endDate,
  status, personName, title, price, currency
}

Desk {
  id, room, number, label
}

WaitingListEntry {
  id, name, preferredDates, contactInfo, notes
}
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<p align="center">
  Built with React + TypeScript + Tailwind CSS
</p>
