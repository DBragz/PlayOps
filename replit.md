# PlayOps - Sports Play Designer

## Overview

PlayOps is a responsive browser-based sports play-drawing whiteboard application for coaches. It enables users to design, animate, and share plays for various sports including basketball, football, soccer, volleyball, hockey, and baseball. The application features a canvas-based drawing interface with support for player positioning, route drawing, freehand annotations, and animated playback of plays.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack React Query for server state, React useState/useCallback for local state
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom Haikyuu-inspired orange/black theme supporting light and dark modes
- **Canvas Rendering**: Konva.js (react-konva) for the drawing canvas with layered rendering, pan, and zoom support
- **Build Tool**: Vite for development and production builds

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **API Design**: RESTful endpoints under `/api/` prefix for CRUD operations on plays
- **Development**: Hot module replacement via Vite middleware in development mode
- **Production**: Static file serving from built assets

### Data Storage
- **Database**: PostgreSQL with Drizzle ORM
- **Schema Location**: `shared/schema.ts` contains all database table definitions and Zod validation schemas
- **Migrations**: Drizzle Kit for database migrations stored in `/migrations`
- **Fallback**: In-memory storage implementation available for development without database

### Key Design Patterns
- **Shared Types**: TypeScript types and Zod schemas in `shared/` directory are used by both client and server
- **Undo/Redo System**: Custom history state management for canvas operations
- **Component Architecture**: Separation of canvas components (PlayerMarker, RouteLine, SportSurface) from UI components
- **Play Data Model**: Serializable JSON structure containing players, routes, freehand drawings, text annotations, and animation keyframes

### Project Structure
```
├── client/           # Frontend React application
│   ├── src/
│   │   ├── components/   # React components including canvas and UI
│   │   ├── pages/        # Route page components
│   │   ├── hooks/        # Custom React hooks
│   │   └── lib/          # Utilities, stores, and query client
├── server/           # Backend Express application
│   ├── index.ts      # Server entry point
│   ├── routes.ts     # API route definitions
│   └── storage.ts    # Data access layer
├── shared/           # Shared types and schemas
│   └── schema.ts     # Drizzle schema and Zod validators
└── migrations/       # Database migration files
```

## External Dependencies

### Database
- **PostgreSQL**: Primary database accessed via `DATABASE_URL` environment variable
- **Drizzle ORM**: Type-safe database access with automatic schema migrations

### UI Framework
- **Radix UI**: Headless UI components for accessibility
- **shadcn/ui**: Pre-styled component collection configured in `components.json`
- **Tailwind CSS**: Utility-first CSS framework

### Canvas & Graphics
- **Konva.js**: 2D canvas library for drawing surfaces, players, routes, and annotations
- **react-konva**: React bindings for Konva

### Session Management
- **connect-pg-simple**: PostgreSQL session store for Express sessions
- **express-session**: Server-side session handling

### Development Tools
- **Vite**: Frontend build tool with HMR
- **tsx**: TypeScript execution for development server
- **esbuild**: Production bundling for server code