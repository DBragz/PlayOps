# PlayOps - Sports Play Designer

A responsive browser-based sports play-drawing whiteboard application for coaches. Design, animate, and share plays for any sport with an intuitive canvas-based interface inspired by the Haikyuu anime aesthetic.

## Prerequisites

### Required Software

| Software | Version | Purpose |
|----------|---------|---------|
| Node.js | 18.x or higher | JavaScript runtime for backend and build tools |
| npm | 9.x or higher | Package manager (included with Node.js) |

### Optional Software

| Software | Version | Purpose |
|----------|---------|---------|
| Git | 2.x or higher | Version control |

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd playops
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:5000`

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

## Features

- **Canvas-Based Drawing Surface**: Pan, zoom, and layered rendering using Konva.js
- **Sport Surface Templates**: Basketball, football, soccer, volleyball, hockey, baseball, and custom surfaces
- **Player Objects**: Draggable player markers with team colors (orange/blue) and jersey numbers
- **Route Drawing Tools**: Straight lines, curved paths, dashed lines, and arrowheads
- **Drawing Tools**: Freehand drawing, text annotations, and eraser
- **Undo/Redo System**: Full history management for all canvas operations
- **Playbook Library**: Search and filter plays with localStorage persistence
- **Animation Timeline**: Play/pause/reset controls with adjustable speed and player movement interpolation
- **Dark Mode**: Toggle between light and dark themes with Haikyuu-inspired orange/black color scheme
- **Keyboard Shortcuts**: V (select), H (pan), P (player), R (route), D (freehand), T (text), E (eraser)

## Architecture

### Technology Stack

```
playops/
├── client/                 # Frontend React Application
│   ├── src/
│   │   ├── components/     # React UI Components
│   │   ├── hooks/          # Custom React Hooks
│   │   ├── lib/            # Utility Functions & State Management
│   │   └── pages/          # Page Components
│   └── index.html
├── server/                 # Backend Express Server
│   ├── routes.ts           # API Endpoints
│   ├── storage.ts          # Data Storage Interface
│   └── index.ts            # Server Entry Point
└── shared/                 # Shared Types & Schemas
    └── schema.ts           # Zod Validation Schemas
```

### Frontend (client/)

| Technology | Purpose |
|------------|---------|
| React 18 | UI framework with TypeScript |
| wouter | Lightweight client-side routing |
| react-konva | Canvas rendering (Konva.js wrapper) |
| Tailwind CSS | Utility-first styling |
| Shadcn UI | Pre-built accessible components |
| @tanstack/react-query | Data fetching and caching |
| localStorage | Client-side play persistence |

### Backend (server/)

| Technology | Purpose |
|------------|---------|
| Express.js | HTTP server framework |
| TypeScript | Type-safe JavaScript |
| Zod | Runtime schema validation |
| In-Memory Storage | Data persistence (MemStorage class) |

### Shared (shared/)

| File | Purpose |
|------|---------|
| schema.ts | Zod schemas for Play, Player, Route, Annotation types |

### Key Files

| Component | File | Description |
|-----------|------|-------------|
| Home | `client/src/pages/Home.tsx` | Main application page |
| DrawingCanvas | `client/src/components/DrawingCanvas.tsx` | Konva canvas with all drawing logic |
| SportSurface | `client/src/components/SportSurface.tsx` | Sport court/field template rendering |
| ToolPalette | `client/src/components/ToolPalette.tsx` | Drawing tools sidebar |
| PlaybookSidebar | `client/src/components/PlaybookSidebar.tsx` | Play library with search/filter |
| AnimationControls | `client/src/components/AnimationControls.tsx` | Timeline playback controls |
| ThemeToggle | `client/src/components/ThemeToggle.tsx` | Dark/light mode switcher |
| playStore | `client/src/lib/playStore.ts` | LocalStorage persistence |
| undoRedo | `client/src/lib/undoRedo.ts` | Undo/redo history management |
| routes | `server/routes.ts` | API endpoints |
| storage | `server/storage.ts` | Backend storage with seed data |
| schema | `shared/schema.ts` | Data models and validation schemas |

### Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser Client                            │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────┐  │
│  │ React Query │ ←→ │ localStorage│ ←→ │ Konva Canvas State  │  │
│  └─────────────┘    └─────────────┘    └─────────────────────┘  │
│         ↓                                                        │
└─────────────────────────────────────────────────────────────────┘
          ↓ HTTP (optional sync)
┌─────────────────────────────────────────────────────────────────┐
│                     Express Server                               │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────┐  │
│  │   Routes    │ →  │ Zod Schemas │ →  │   MemStorage        │  │
│  └─────────────┘    └─────────────┘    └─────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/plays` | List all plays |
| GET | `/api/plays/:id` | Get a single play |
| POST | `/api/plays` | Create a new play |
| PATCH | `/api/plays/:id` | Update a play |
| DELETE | `/api/plays/:id` | Delete a play |

## Design Theme

The application features a Haikyuu anime-inspired aesthetic:

- **Primary Color**: Bold Orange (#FF6B00)
- **Secondary Color**: Deep Navy (#1E3A5F)
- **Dark Mode**: Rich black/dark blue backgrounds
- **Typography**: Montserrat font family
- **Style**: Clean, energetic design with dynamic accents

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |

## Development Notes

- Frontend uses localStorage for persistence (MVP)
- Backend API available for future multi-device sync
- Touch-optimized for mobile/tablet devices
- Dark mode toggle in top-right corner

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

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Authors

- **Claude** - AI Development Assistant
- **You** - Project Creator & Designer

## License

This project is private and proprietary.
