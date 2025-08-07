# Coworking Desk Manager

## Overview

This is a React-based coworking desk management application that provides an intuitive calendar interface for managing desk bookings. The application allows users to track desk availability, assign people to desks, and manage room bookings efficiently across different coworking spaces. It features a full-stack architecture with a React frontend, Express backend, and PostgreSQL database integration using Drizzle ORM.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript for type safety and modern component patterns
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query (React Query) for server state management and caching
- **UI Framework**: Tailwind CSS with shadcn/ui component library for consistent, accessible design
- **Component Structure**: Modular component architecture with reusable UI components in `/components/ui/`
- **Build Tool**: Vite for fast development and optimized production builds

### Backend Architecture
- **Framework**: Express.js with TypeScript for type-safe API development
- **API Design**: RESTful API structure with `/api` prefix for all endpoints
- **Development Setup**: Hot reload support with tsx for TypeScript execution
- **Error Handling**: Centralized error handling middleware for consistent API responses
- **Logging**: Built-in request/response logging for API endpoints

### Data Storage Solutions
- **Database**: PostgreSQL as the primary database
- **ORM**: Drizzle ORM for type-safe database operations and schema management
- **Connection**: Neon Database serverless connection for cloud PostgreSQL hosting
- **Migrations**: Drizzle Kit for database schema migrations and management
- **Local Storage**: Browser localStorage for client-side data persistence with enhanced booking data (name, title, price)
- **Schema Design**: Centralized schema definitions in `/shared/schema.ts` for type consistency

### Authentication and Authorization
- **Session Management**: Currently using in-memory storage with plans for PostgreSQL session store
- **User Schema**: Basic user model with username/ID structure ready for expansion
- **Storage Interface**: Abstracted storage layer allowing easy switching between memory and database storage

### Key Features and Business Logic
- **Desk Management**: Support for multiple rooms with numbered desk assignments (2 rooms, 4 desks each)
- **Booking System**: Three status types (available, booked, assigned) with comprehensive booking details
- **Enhanced Booking Dialog**: Full booking modal with person name, title/purpose, and daily pricing
- **Calendar Interface**: Dual-view system with both weekly and monthly views for better date management
- **Monthly View**: Scrollable table container for viewing up to 30+ days with sticky header
- **Interactive Controls**: Multiple interaction methods - regular click for booking, Ctrl+click/right-click for quick status cycling
- **Bulk Operations**: Range-based availability updates across multiple desks and dates
- **Statistics**: Real-time desk utilization tracking and reporting
- **Export Functionality**: Data export capabilities for reporting and backup
- **Material Design**: Clean Material UI-inspired interface with Google Fonts and Material Icons

## External Dependencies

### Core Framework Dependencies
- **React Ecosystem**: React 18, React DOM, TanStack Query for frontend state management
- **TypeScript**: Full TypeScript support across frontend and backend
- **Express.js**: Backend framework with TypeScript integration

### Database and ORM
- **@neondatabase/serverless**: Serverless PostgreSQL driver for cloud database connections
- **drizzle-orm**: Type-safe ORM for database operations
- **drizzle-kit**: Database schema management and migration tool
- **drizzle-zod**: Integration between Drizzle ORM and Zod for schema validation

### UI and Styling
- **Tailwind CSS**: Utility-first CSS framework for responsive design
- **Radix UI**: Headless component library for accessible UI primitives
- **shadcn/ui**: Pre-built component library built on Radix UI and Tailwind
- **Lucide React**: Icon library for consistent iconography

### Development Tools
- **Vite**: Build tool and development server
- **tsx**: TypeScript execution engine for backend development
- **PostCSS**: CSS processing with Autoprefixer
- **ESBuild**: Fast JavaScript bundler for production builds

### Validation and Forms
- **Zod**: Schema validation library for type-safe data validation
- **React Hook Form**: Form state management with @hookform/resolvers for validation integration

### Date and Time
- **dayjs**: Lightweight date manipulation library for calendar functionality
- **date-fns**: Additional date utility functions for complex date operations

### Routing and Navigation
- **wouter**: Minimalist routing library for React single-page applications