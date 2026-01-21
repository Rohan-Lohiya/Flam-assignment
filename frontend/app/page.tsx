"use client";

import { useState, useEffect, useCallback } from "react";
import { useCanvas } from "./hooks/useCanvas";
import { useSocket } from "./hooks/useSocket";
import Toolbar from "./components/Toolbar";
import UsersPanel from "./components/UsersPanel";
import CursorsOverlay from "./components/CursorsOverlay";
import DrawingCanvas from "./components/DrawingCanvas";
import { User, Point, Stroke } from "./types";

function generateUsername(): string {
  const adjectives = ["Happy", "Clever", "Swift", "Bright", "Cool", "Wild", "Calm", "Bold"];
  const nouns = ["Panda", "Tiger", "Eagle", "Dolphin", "Fox", "Wolf", "Bear", "Hawk"];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(Math.random() * 100);
  return `${adj}${noun}${num}`;
}

function generateUserColor(): string {
  const colors = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899"];
  return colors[Math.floor(Math.random() * colors.length)];
}

function generateUserId(): string {
  return "user_" + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

// Default room for now - can be extended to support multiple rooms
const ROOM_ID = "main-room";

export default function Home() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    const user: User = {
      id: generateUserId(),
      name: generateUsername(),
      color: generateUserColor(),
      cursorPosition: null,
      isDrawing: false,
    };
    setCurrentUser(user);
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
    addExternalStroke,
    redrawCanvas,
    initializeContext,
    loadStrokes,
    removeLastStroke,
    getCurrentStroke,
    startDrawingTouch,
    drawTouch,
  } = useCanvas({
    userId: currentUser?.id || "anonymous",
    onStrokeComplete: undefined,
    onCursorMove: undefined,
  });

  // Socket event handlers
  const handleStrokeReceived = useCallback(
    (stroke: Stroke) => {
      addExternalStroke(stroke);
    },
    [addExternalStroke],
  );

  const handleStrokeDrawing = useCallback(
    (data: { odId: string; points: Point[]; color: string; width: number; tool: string }) => {
      // For now we just redraw on complete - real-time preview can be added later
    },
    [],
  );

  const handleCanvasState = useCallback(
    (data: { strokes: Stroke[]; historyIndex: number }) => {
      loadStrokes(data.strokes);
    },
    [loadStrokes],
  );

  const handleUndo = useCallback(() => {
    removeLastStroke();
  }, [removeLastStroke]);

  const handleRedo = useCallback(
    (stroke: Stroke) => {
      addExternalStroke(stroke);
    },
    [addExternalStroke],
  );

  const handleClear = useCallback(() => {
    clearCanvas();
  }, [clearCanvas]);

  const {
    isConnected,
    users,
    cursors,
    emitStrokeComplete,
    emitCursorMove,
    emitUndo,
    emitRedo,
    emitClear,
    emitDrawingState,
  } = useSocket({
    user: currentUser,
    roomId: ROOM_ID,
    onStrokeReceived: handleStrokeReceived,
    onStrokeDrawing: handleStrokeDrawing,
    onCanvasState: handleCanvasState,
    onUndo: handleUndo,
    onRedo: handleRedo,
    onClear: handleClear,
  });

  // Emit drawing state changes
  useEffect(() => {
    emitDrawingState(isDrawing);
  }, [isDrawing, emitDrawingState]);

  // Wrap handlers to emit socket events
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      startDrawing(e);
    },
    [startDrawing],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const position = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      emitCursorMove(position);

      draw(e);
    },
    [draw, emitCursorMove, canvasRef],
  );

  const handleMouseUp = useCallback(() => {
    const stroke = getCurrentStroke();
    stopDrawing();
    if (stroke && stroke.points.length >= 2) {
      emitStrokeComplete(stroke);
    }
  }, [stopDrawing, getCurrentStroke, emitStrokeComplete]);

  // Touch handlers for mobile
  const handleTouchStart = useCallback(
    (e: React.TouchEvent<HTMLCanvasElement>) => {
      startDrawingTouch(e);
    },
    [startDrawingTouch],
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const touch = e.touches[0];
      const position = { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
      emitCursorMove(position);

      drawTouch(e);
    },
    [drawTouch, emitCursorMove, canvasRef],
  );

  const handleTouchEnd = useCallback(() => {
    const stroke = getCurrentStroke();
    stopDrawing();
    if (stroke && stroke.points.length >= 2) {
      emitStrokeComplete(stroke);
    }
  }, [stopDrawing, getCurrentStroke, emitStrokeComplete]);

  const handleUndo_ = useCallback(() => {
    undo();
    emitUndo();
  }, [undo, emitUndo]);

  const handleRedo_ = useCallback(() => {
    redo();
    emitRedo();
  }, [redo, emitRedo]);

  const handleClear_ = useCallback(() => {
    clearCanvas();
    emitClear();
  }, [clearCanvas, emitClear]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        if (e.shiftKey) {
          handleRedo_();
        } else {
          handleUndo_();
        }
        e.preventDefault();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "y") {
        handleRedo_();
        e.preventDefault();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleUndo_, handleRedo_]);

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
      <header className="app-header">
        <h1 className="app-title">Collaborative Canvas</h1>
        <div className="connection-status">
          <span className={`status-dot ${isConnected ? "online" : "offline"}`} />
          <span>{isConnected ? "Connected" : "Connecting..."}</span>
        </div>
      </header>

      <div className="main-content">
        <Toolbar
          tool={tool}
          color={color}
          strokeWidth={strokeWidth}
          canUndo={canUndo}
          canRedo={canRedo}
          onToolChange={setTool}
          onColorChange={setColor}
          onStrokeWidthChange={setStrokeWidth}
          onUndo={handleUndo_}
          onRedo={handleRedo_}
          onClear={handleClear_}
        />

        <div className="canvas-wrapper">
          <DrawingCanvas
            canvasRef={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onCanvasReady={initializeContext}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          />
          <CursorsOverlay cursors={cursors} currentUserId={currentUser.id} />
        </div>

        <UsersPanel users={users.length > 0 ? users : [currentUser]} currentUserId={currentUser.id} />
      </div>
    </div>
  );
}
