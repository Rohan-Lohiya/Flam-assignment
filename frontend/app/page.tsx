"use client";

import { useState, useEffect, useCallback } from "react";
import { useCanvas } from "./hooks/useCanvas";
import Toolbar from "./components/Toolbar";
import UsersPanel from "./components/UsersPanel";
import CursorsOverlay from "./components/CursorsOverlay";
import DrawingCanvas from "./components/DrawingCanvas";
import { User, CursorPosition, Point } from "./types";

// Generate random username
function generateUsername(): string {
  const adjectives = ["Happy", "Clever", "Swift", "Bright", "Cool", "Wild", "Calm", "Bold"];
  const nouns = ["Panda", "Tiger", "Eagle", "Dolphin", "Fox", "Wolf", "Bear", "Hawk"];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(Math.random() * 100);
  return `${adj}${noun}${num}`;
}

// Generate random color for user
function generateUserColor(): string {
  const colors = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899"];
  return colors[Math.floor(Math.random() * colors.length)];
}

// Generate simple user ID
function generateUserId(): string {
  return "user_" + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

export default function Home() {
  // Current user state
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Mock other users for UI demonstration (will be replaced with websocket data)
  const [users, setUsers] = useState<User[]>([]);
  const [cursors, setCursors] = useState<CursorPosition[]>([]);

  // Initialize current user on mount
  useEffect(() => {
    const user: User = {
      id: generateUserId(),
      name: generateUsername(),
      color: generateUserColor(),
      cursorPosition: null,
      isDrawing: false,
    };
    setCurrentUser(user);
    setUsers([user]);
  }, []);

  // Handle cursor movement - will send to websocket later
  const handleCursorMove = useCallback(
    (position: Point) => {
      if (!currentUser) return;

      // Update local cursor position
      setUsers((prev) => prev.map((u) => (u.id === currentUser.id ? { ...u, cursorPosition: position } : u)));

      // TODO: Send cursor position to server via websocket
    },
    [currentUser],
  );

  // Handle stroke complete - will send to websocket later
  const handleStrokeComplete = useCallback((stroke: any) => {
    // TODO: Send completed stroke to server via websocket
    console.log("Stroke completed:", stroke.id);
  }, []);

  const {
    canvasRef,
    isDrawing,
    startDrawing,
    draw,
    stopDrawing,
    clearCanvas,
    undo,
    redo,
    canUndo,
    canRedo,
    setTool,
    setColor,
    setStrokeWidth,
    tool,
    color,
    strokeWidth,
    initializeContext,
  } = useCanvas({
    userId: currentUser?.id || "anonymous",
    onStrokeComplete: handleStrokeComplete,
    onCursorMove: handleCursorMove,
  });

  // Update user drawing state
  useEffect(() => {
    if (!currentUser) return;
    setUsers((prev) => prev.map((u) => (u.id === currentUser.id ? { ...u, isDrawing } : u)));
  }, [isDrawing, currentUser]);

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
        e.preventDefault();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "y") {
        redo();
        e.preventDefault();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undo, redo]);

  if (!currentUser) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <p>Loading canvas...</p>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <h1 className="app-title">Collaborative Canvas</h1>
        <div className="connection-status">
          <span className="status-dot offline" />
          <span>Offline Mode</span>
        </div>
      </header>

      {/* Main Content */}
      <div className="main-content">
        {/* Toolbar */}
        <Toolbar
          tool={tool}
          color={color}
          strokeWidth={strokeWidth}
          canUndo={canUndo}
          canRedo={canRedo}
          onToolChange={setTool}
          onColorChange={setColor}
          onStrokeWidthChange={setStrokeWidth}
          onUndo={undo}
          onRedo={redo}
          onClear={clearCanvas}
        />

        {/* Canvas Area */}
        <div className="canvas-wrapper">
          <DrawingCanvas
            canvasRef={canvasRef}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onCanvasReady={initializeContext}
          />
          <CursorsOverlay cursors={cursors} currentUserId={currentUser.id} />
        </div>

        {/* Users Panel */}
        <UsersPanel users={users} currentUserId={currentUser.id} />
      </div>
    </div>
  );
}
