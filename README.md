# Real-Time Collaborative Drawing Canvas

A multi-user drawing application where multiple people can draw simultaneously on the same canvas with real-time synchronization.

## Features

- **Drawing Tools**: Brush and eraser with customizable colors and stroke widths
- **Real-time Sync**: See other users' drawings as they happen
- **User Cursors**: View where other users are drawing in real-time
- **Undo/Redo**: Global undo/redo that syncs across all users
- **User Management**: See who's online with assigned colors
- **Touch Support**: Works on mobile devices with touch drawing

## Tech Stack

- **Frontend**: Next.js 16 + TypeScript + Tailwind CSS
- **Backend**: Node.js + Express + Socket.io
- **Canvas**: Native HTML5 Canvas API

## Setup Instructions

### Prerequisites

- Node.js 18+ installed
- npm or yarn

### Installation

1. Clone the repository:

```bash
git clone <repo-url>
```

2. Install backend dependencies:

```bash
cd backend
npm install
```

3. Install frontend dependencies:

```bash
cd frontend
npm install
```

### Running the Application

1. Start the backend server (Terminal 1):

```bash
cd backend
npm run dev
```

Server runs on http://localhost:5000

2. Start the frontend (Terminal 2):

```bash
cd frontend
npm run dev
```

Frontend runs on http://localhost:3000

### Testing with Multiple Users

1. Open http://localhost:3000 in multiple browser tabs or different browsers
2. Each tab will be assigned a unique username and color
3. Draw in one tab and see the strokes appear in real-time in other tabs
4. Try undo/redo - it syncs across all users

## Project Structure

```
├── backend/
│   ├── server.js          # Express + Socket.io server
│   └── package.json
├── frontend/
│   ├── app/
│   │   ├── components/    # React components
│   │   ├── hooks/         # Custom hooks (useCanvas, useSocket)
│   │   ├── types/         # TypeScript types
│   │   ├── page.tsx       # Main page
│   │   └── globals.css    # Styles
│   └── package.json
├── README.md
└── ARCHITECTURE.md
```

## Known Limitations

- No persistent storage - canvas state is lost on server restart
- No authentication - users are anonymous with random names
- Single room only - all users share the same canvas
- Undo/redo is global - undoing removes the last stroke from any user

## Time Spent

- Frontend UI & Canvas logic: ~3 hours
- Backend Socket.io integration: ~2 hours
- Real-time sync & testing: ~1 hour
- Documentation: ~30 minutes

Total: ~6.5 hours
