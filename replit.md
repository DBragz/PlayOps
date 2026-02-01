# PlayOps - Sports Play Designer

## Overview

PlayOps is a responsive browser-based sports play-drawing whiteboard application for coaches. It enables users to design, animate, and share plays for various sports (basketball, football, soccer, volleyball, hockey, baseball, or custom) using an intuitive canvas-based interface. The application features a Haikyuu anime-inspired orange/black theme with full dark mode support.

Key capabilities include:
- Canvas-based drawing surface with pan, zoom, and layered rendering
- Draggable player objects with team colors and jersey numbers
- Route drawing tools (straight lines, curved paths, arrowheads)
- Freehand drawing, text annotations, eraser, and undo/redo
- Playbook library with search/filter functionality
- Animation timeline with playback controls
- Sport-specific field templates

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: React 18 with TypeScript, built using Vite
- Single-page application with client-side routing via Wouter
- State management using React Query for server state and local React hooks for UI state
- Canvas rendering powered by Konva.js (react-konva) for high-performance 2D graphics

**UI Component Library**: shadcn/ui with Radix UI primitives
- Tailwind CSS for styling with CSS custom properties for theming
- New York style variant configured in components.json
- Path aliases: `@/` for client/src, `@shared/` for shared types

**Key Frontend Patterns**:
- ThemeProvider context for dark/light mode management
- Custom undo/redo history system for play editing
- Local storage persistence for plays (playStore.ts)
- Modular canvas components (PlayerMarker, RouteLine, SportSurface)

### Backend Architecture

**Framework**: Express.js with TypeScript running on Node.js
- HTTP server created via `createServer` for potential WebSocket support
- Development mode uses Vite middleware for HMR
- Production mode serves static files from dist/public

**API Design**: RESTful endpoints under `/api/` prefix
- CRUD operations for plays: GET/POST/PUT/DELETE `/api/plays`
- JSON request/response format with Zod validation

**Storage Layer**: Interface-based storage abstraction (IStorage)
- Currently implements in-memory storage (MemStorage)
- Designed for easy database integration via Drizzle ORM

### Data Layer

**ORM**: Drizzle ORM configured for PostgreSQL
- Schema defined in `shared/schema.ts` using drizzle-zod for validation
- Migrations output to `/migrations` directory
- DATABASE_URL environment variable required for database connection

**Data Model**: Play-centric structure with nested JSON data
- Plays contain: players, routes, freehand drawings, text annotations
- Animation keyframes and view transforms stored in PlayData
- Tags and sport type for organization and filtering

### Build System

**Development**: `npm run dev` runs tsx with Vite middleware
**Production Build**: Custom build script using esbuild + Vite
- Frontend bundled to dist/public via Vite
- Backend bundled to dist/index.cjs via esbuild
- Selective dependency bundling for faster cold starts

## External Dependencies

### Database
- **PostgreSQL**: Primary database (requires DATABASE_URL environment variable)
- **Drizzle ORM**: Type-safe database queries and schema management
- **connect-pg-simple**: PostgreSQL session storage support

### Frontend Libraries
- **Konva/react-konva**: Canvas 2D rendering engine for the drawing surface
- **@tanstack/react-query**: Server state management and caching
- **Radix UI**: Accessible UI component primitives (dialog, dropdown, tooltip, etc.)
- **Tailwind CSS**: Utility-first CSS framework
- **date-fns**: Date formatting utilities
- **uuid**: Unique identifier generation

### Backend Libraries
- **Express**: Web server framework
- **Zod**: Runtime schema validation
- **drizzle-zod**: Zod schema generation from Drizzle tables

### Development Tools
- **Vite**: Frontend build tool with HMR
- **esbuild**: Fast JavaScript bundler for server
- **tsx**: TypeScript execution for development
- **TypeScript**: Static type checking across the codebase