# PlayOps - Sports Play Designer

## Overview
PlayOps is a sports play-drawing whiteboard application for coaches. Design, animate, and share plays for any sport with an intuitive canvas-based interface inspired by the Haikyuu anime aesthetic.

## Current State
MVP complete with the following features:
- Canvas-based drawing surface with pan, zoom, and layered rendering
- Sport surface templates (basketball, football, soccer, volleyball, hockey, baseball, custom)
- Draggable player objects with team colors and jersey numbers
- Route drawing tools with straight lines, curved paths, arrowheads
- Freehand drawing, text annotations, eraser, undo/redo
- Playbook library with search/filter functionality
- Animation timeline with playback controls
- Dark mode toggle with Haikyuu-inspired orange/black theme
- LocalStorage persistence for plays

## Project Architecture

### Frontend (client/)
- **Framework**: React 18 with TypeScript
- **Routing**: wouter
- **State Management**: React hooks + localStorage
- **Canvas**: react-konva (Konva.js wrapper)
- **Styling**: Tailwind CSS with Shadcn UI components
- **Data Fetching**: @tanstack/react-query

### Backend (server/)
- **Framework**: Express.js with TypeScript
- **Storage**: In-memory storage (MemStorage class)
- **API**: RESTful endpoints for plays CRUD

### Shared (shared/)
- **Schema**: Zod schemas for data validation
- **Types**: TypeScript types for Play, Player, Route, etc.

## Key Files
- `client/src/pages/Home.tsx` - Main application page
- `client/src/components/DrawingCanvas.tsx` - Konva canvas component
- `client/src/components/SportSurface.tsx` - Court/field templates
- `client/src/components/ToolPalette.tsx` - Drawing tools sidebar
- `client/src/components/PlaybookSidebar.tsx` - Play library
- `client/src/lib/playStore.ts` - LocalStorage persistence
- `client/src/lib/undoRedo.ts` - Undo/redo history management
- `server/routes.ts` - API endpoints
- `server/storage.ts` - Backend storage with seed data
- `shared/schema.ts` - Data models and validation schemas

## Design Theme
Haikyuu-inspired sports anime aesthetic:
- Primary color: Bold orange (#FF6B00)
- Secondary color: Deep navy (#1E3A5F)
- Dark mode: Rich black/dark blue backgrounds
- Typography: Montserrat font family
- Clean, energetic design with dynamic accents

## Recent Changes
- 2026-02-01: Initial MVP implementation
  - Canvas drawing with Konva.js
  - Sport templates for 6 sports + custom
  - Player markers with team colors
  - Route and freehand drawing tools
  - Undo/redo system
  - Playbook management with localStorage
  - Animation playback controls
  - Dark mode with theme toggle
  - Haikyuu-inspired color scheme

## User Preferences
- Theme: Haikyuu anime-inspired (orange/black)
- Dark mode toggle in top-right corner
- Sport-agnostic design supporting multiple sports

## Development Notes
- Frontend uses localStorage for persistence (MVP)
- Backend API available for future multi-device sync
- Touch-optimized for mobile/tablet devices
- Keyboard shortcuts: V(select), H(pan), P(player), R(route), D(freehand), T(text), E(eraser)
