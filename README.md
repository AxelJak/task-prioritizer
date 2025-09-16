# AI Task Prioritizer

A local-first web application built with Lit framework that uses Anthropic's Claude API to categorize and prioritize tasks.

## Features

- **Local-first**: Works offline with IndexedDB storage
- **AI-powered**: Uses Claude API for intelligent task analysis when online
- **Smart categorization**: Tasks are sorted into urgent-important matrix
- **Progressive enhancement**: Immediate local scoring, enhanced with AI analysis
- **PWA ready**: Installable as a mobile/desktop app
- **Export functionality**: CSV export for task data

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Anthropic API key (optional, for AI features)

### Installation

1. Clone/download this repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open http://localhost:5173 in your browser

### Setup

1. Click the ⚙️ settings button in the app
2. Enter your Anthropic API key (get one from [console.anthropic.com](https://console.anthropic.com))
3. Save settings

### Usage

1. **Add Tasks**: Paste or type tasks (one per line) in the input area
2. **Local Analysis**: Tasks are immediately scored using keyword-based analysis
3. **AI Enhancement**: If API key is configured, tasks are sent for AI analysis
4. **View Results**: Tasks are categorized into 4 priority quadrants:
   - Urgent & Important (red)
   - Important, Not Urgent (blue) 
   - Urgent, Not Important (orange)
   - Neither (gray)

### Example Tasks

Try pasting these sample tasks:

```
Fix login bug affecting 20% of users
Update company logo on homepage
Implement dark mode feature
Refactor legacy authentication system
Write unit tests for payment module
Research new database migration tools
Deploy critical security patch to production
```

## Architecture

### Tech Stack
- **Frontend**: Lit (Web Components)
- **Storage**: IndexedDB with idb wrapper
- **AI**: Anthropic Claude API
- **Build**: Vite
- **PWA**: Service Worker + Web App Manifest

### Project Structure
```
src/
├── components/          # Lit components
│   ├── app-shell.ts    # Main app container
│   ├── task-input.ts   # Task entry component
│   ├── task-list.ts    # Task display with categories
│   └── priority-card.ts # Individual task card
├── services/           # Core business logic
│   ├── task-manager.ts # IndexedDB operations
│   ├── ai-analyzer.ts  # Anthropic API integration
│   └── cache-manager.ts # AI response caching
├── utils/
│   ├── types.ts        # TypeScript interfaces
│   └── local-scoring.ts # Fallback keyword analysis
└── main.ts             # App entry point
```

## Building for Production

```bash
npm run build
```

The built files will be in the `dist/` directory, ready for static hosting.

## PWA Installation

The app can be installed as a PWA on mobile devices and desktop browsers that support it. Look for the "Install" prompt or use the browser's "Add to Home Screen" option.

## Privacy & Data

- All task data is stored locally in your browser's IndexedDB
- API key is stored in localStorage
- Only task text is sent to Anthropic's API for analysis
- No personal data is collected or transmitted

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

### Key Features Implementation

1. **Local-first Architecture**: App works offline, progressively enhances online
2. **Smart Batching**: AI requests are batched every 2 seconds for efficiency
3. **Response Caching**: AI responses cached in IndexedDB to minimize API calls
4. **Reactive UI**: Lit components update automatically when data changes
5. **Accessible Design**: Keyboard navigation and screen reader support

## License

MIT