# PlayOps - Sports Play Designer

A responsive browser-based sports play-drawing whiteboard application for coaches. Design, animate, and share plays for any sport with an intuitive canvas-based interface inspired by the Haikyuu anime aesthetic.

## Prerequisites

### Required Software

| Software | Version | Purpose |
|----------|---------|---------|
| Node.js | 18.x or higher | JavaScript runtime for backend and build tools |
| npm | 9.x or higher | Package manager (included with Node.js) |
| Git | 2.x or higher | Version control |

### Installing Prerequisites

<details>
<summary><strong>Windows</strong></summary>

**Option A: Direct Installers**
1. Download and install Node.js from [nodejs.org](https://nodejs.org/) (LTS version recommended). npm is included automatically.
2. Download and install Git from [git-scm.com](https://git-scm.com/download/win).

**Option B: Using Chocolatey (package manager)**
```powershell
# Install Chocolatey first (run PowerShell as Administrator):
Set-ExecutionPolicy Bypass -Scope Process -Force; `
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; `
iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# Then install Node.js and Git:
choco install nodejs-lts git -y
```

**Option C: Using winget (built into Windows 11 / Windows 10 App Installer)**
```powershell
winget install OpenJS.NodeJS.LTS
winget install Git.Git
```

**Verify installation** (use PowerShell, Command Prompt, or Git Bash):
```powershell
node --version
npm --version
git --version
```
</details>

<details>
<summary><strong>macOS</strong></summary>

**Option A: Direct Installer**
1. Download and install Node.js from [nodejs.org](https://nodejs.org/) (LTS version recommended). npm is included automatically.
2. Git is included with Xcode Command Line Tools. Install with: `xcode-select --install`

**Option B: Using Homebrew (recommended)**
```bash
# Install Homebrew first (if not already installed):
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Then install Node.js and Git:
brew install node git
```

**Verify installation** (use Terminal):
```bash
node --version
npm --version
git --version
```
</details>

<details>
<summary><strong>Linux (Ubuntu/Debian)</strong></summary>

```bash
# Update package list:
sudo apt update

# Install Node.js (via NodeSource for latest LTS):
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install Git:
sudo apt install -y git
```

**For Fedora/RHEL:**
```bash
sudo dnf install nodejs git
```

**For Arch Linux:**
```bash
sudo pacman -S nodejs npm git
```

**Verify installation** (use Terminal):
```bash
node --version
npm --version
git --version
```
</details>

## Installation

These steps are identical on Windows, macOS, and Linux. Use your platform's terminal (PowerShell/Command Prompt/Git Bash on Windows, Terminal on macOS/Linux).

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

> **Note:** All npm commands (`npm install`, `npm run dev`, `npm run build`, `npm start`) work identically across Windows, macOS, and Linux -- no platform-specific scripts are needed.

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

- **[Daniel Ribeirinha-Braga](github.com/dbragz)** - Project Creator & Designer
- **Claude (Anthropic)** - AI Development Assistant

## License

This project is private and proprietary.
