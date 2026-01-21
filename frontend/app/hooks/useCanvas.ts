"use client";

import { useRef, useCallback, useState, useEffect } from "react";
import { Point, Stroke, Tool, DrawAction } from "../types";

// Generate a simple unique id
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

interface UseCanvasProps {
  userId: string;
  onStrokeComplete?: (stroke: Stroke) => void;
  onCursorMove?: (position: Point) => void;
}

interface UseCanvasReturn {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  isDrawing: boolean;
  startDrawing: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  draw: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  stopDrawing: () => void;
  clearCanvas: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  setTool: (tool: Tool) => void;
  setColor: (color: string) => void;
  setStrokeWidth: (width: number) => void;
  tool: Tool;
  color: string;
  strokeWidth: number;
  addExternalStroke: (stroke: Stroke) => void;
  redrawCanvas: () => void;
  initializeContext: () => void;
  loadStrokes: (strokes: Stroke[]) => void;
  removeLastStroke: () => void;
  getCurrentStroke: () => Stroke | null;
  startDrawingTouch: (e: React.TouchEvent<HTMLCanvasElement>) => void;
  drawTouch: (e: React.TouchEvent<HTMLCanvasElement>) => void;
}

export function useCanvas({ userId, onStrokeComplete, onCursorMove }: UseCanvasProps): UseCanvasReturn {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);

  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState<Tool>("brush");
  const [color, setColor] = useState("#000000");
  const [strokeWidth, setStrokeWidth] = useState(5);

  // Store all completed strokes
  const strokesRef = useRef<Stroke[]>([]);
  // Current stroke being drawn
  const currentStrokeRef = useRef<Stroke | null>(null);

  // For undo/redo - using action history approach
  const historyRef = useRef<DrawAction[]>([]);
  const historyIndexRef = useRef(-1);

  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Initialize canvas context - called when canvas is ready/resized
  const initializeContext = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    context.lineCap = "round";
    context.lineJoin = "round";
    contextRef.current = context;
  }, []);

  // Update undo/redo button states
  const updateHistoryState = useCallback(() => {
    setCanUndo(historyIndexRef.current >= 0);
    setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
  }, []);

  // Draw a single stroke on canvas
  const drawStroke = useCallback((ctx: CanvasRenderingContext2D, stroke: Stroke) => {
    if (stroke.points.length < 2) return;

    ctx.beginPath();
    ctx.strokeStyle = stroke.tool === "eraser" ? "#ffffff" : stroke.color;
    ctx.lineWidth = stroke.width;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Use quadratic curves for smooth lines
    ctx.moveTo(stroke.points[0].x, stroke.points[0].y);

    for (let i = 1; i < stroke.points.length - 1; i++) {
      const midX = (stroke.points[i].x + stroke.points[i + 1].x) / 2;
      const midY = (stroke.points[i].y + stroke.points[i + 1].y) / 2;
      ctx.quadraticCurveTo(stroke.points[i].x, stroke.points[i].y, midX, midY);
    }

    // Draw to the last point
    const lastPoint = stroke.points[stroke.points.length - 1];
    ctx.lineTo(lastPoint.x, lastPoint.y);
    ctx.stroke();
  }, []);

  // Redraw entire canvas from strokes
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = contextRef.current;
    if (!canvas || !ctx) return;

    // Clear canvas
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw all completed strokes
    strokesRef.current.forEach((stroke) => {
      drawStroke(ctx, stroke);
    });

    // Draw current stroke if any
    if (currentStrokeRef.current) {
      drawStroke(ctx, currentStrokeRef.current);
    }
  }, [drawStroke]);

  // Get mouse position relative to canvas
  const getMousePos = useCallback((e: React.MouseEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }, []);

  // Get touch position relative to canvas
  const getTouchPos = useCallback((e: React.TouchEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    return {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top,
    };
  }, []);

  const startDrawing = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const point = getMousePos(e);

      // Create new stroke
      currentStrokeRef.current = {
        id: generateId(),
        points: [point],
        color: color,
        width: strokeWidth,
        tool: tool,
        userId: userId,
        timestamp: Date.now(),
      };

      setIsDrawing(true);
      onCursorMove?.(point);
    },
    [color, strokeWidth, tool, userId, getMousePos, onCursorMove],
  );

  const draw = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const point = getMousePos(e);
      onCursorMove?.(point);

      if (!isDrawing || !currentStrokeRef.current) return;

      // Add point to current stroke
      currentStrokeRef.current.points.push(point);

      // Draw incrementally for performance
      const ctx = contextRef.current;
      if (!ctx) return;

      const points = currentStrokeRef.current.points;
      if (points.length < 2) return;

      ctx.beginPath();
      ctx.strokeStyle = tool === "eraser" ? "#ffffff" : color;
      ctx.lineWidth = strokeWidth;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      // Draw from second-to-last to last point for smooth incremental drawing
      const len = points.length;
      if (len >= 3) {
        const prev = points[len - 3];
        const curr = points[len - 2];
        const next = points[len - 1];

        const midX1 = (prev.x + curr.x) / 2;
        const midY1 = (prev.y + curr.y) / 2;
        const midX2 = (curr.x + next.x) / 2;
        const midY2 = (curr.y + next.y) / 2;

        ctx.moveTo(midX1, midY1);
        ctx.quadraticCurveTo(curr.x, curr.y, midX2, midY2);
      } else {
        ctx.moveTo(points[len - 2].x, points[len - 2].y);
        ctx.lineTo(points[len - 1].x, points[len - 1].y);
      }

      ctx.stroke();
    },
    [isDrawing, tool, color, strokeWidth, getMousePos, onCursorMove],
  );

  const stopDrawing = useCallback(() => {
    if (!isDrawing || !currentStrokeRef.current) {
      setIsDrawing(false);
      return;
    }

    // Only save strokes with at least 2 points
    if (currentStrokeRef.current.points.length >= 2) {
      const completedStroke = { ...currentStrokeRef.current };
      strokesRef.current.push(completedStroke);

      // Add to history for undo/redo
      // Remove any redo history when new action is performed
      historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
      historyRef.current.push({
        type: "add",
        stroke: completedStroke,
        userId: userId,
        timestamp: Date.now(),
      });
      historyIndexRef.current = historyRef.current.length - 1;
      updateHistoryState();

      // Notify about completed stroke (for websocket sync)
      onStrokeComplete?.(completedStroke);
    }

    currentStrokeRef.current = null;
    setIsDrawing(false);
  }, [isDrawing, userId, onStrokeComplete, updateHistoryState]);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = contextRef.current;
    if (!canvas || !ctx) return;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    strokesRef.current = [];
    historyRef.current = [];
    historyIndexRef.current = -1;
    updateHistoryState();
  }, [updateHistoryState]);

  const undo = useCallback(() => {
    if (historyIndexRef.current < 0) return;

    const action = historyRef.current[historyIndexRef.current];

    if (action.type === "add") {
      // Remove the stroke from strokes array
      strokesRef.current = strokesRef.current.filter((s) => s.id !== action.stroke.id);
    } else {
      // Re-add the stroke
      strokesRef.current.push(action.stroke);
    }

    historyIndexRef.current--;
    updateHistoryState();
    redrawCanvas();
  }, [redrawCanvas, updateHistoryState]);

  const redo = useCallback(() => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;

    historyIndexRef.current++;
    const action = historyRef.current[historyIndexRef.current];

    if (action.type === "add") {
      strokesRef.current.push(action.stroke);
    } else {
      strokesRef.current = strokesRef.current.filter((s) => s.id !== action.stroke.id);
    }

    updateHistoryState();
    redrawCanvas();
  }, [redrawCanvas, updateHistoryState]);

  // Add stroke from another user (for real-time sync)
  const addExternalStroke = useCallback(
    (stroke: Stroke) => {
      strokesRef.current.push(stroke);
      redrawCanvas();
    },
    [redrawCanvas],
  );

  // Load multiple strokes at once (for initial canvas state)
  const loadStrokes = useCallback(
    (strokes: Stroke[]) => {
      strokesRef.current = strokes;
      historyRef.current = strokes.map((s) => ({
        type: "add" as const,
        stroke: s,
        userId: s.userId,
        timestamp: s.timestamp,
      }));
      historyIndexRef.current = historyRef.current.length - 1;
      updateHistoryState();
      redrawCanvas();
    },
    [redrawCanvas, updateHistoryState],
  );

  // Remove last stroke (for undo sync)
  const removeLastStroke = useCallback(() => {
    if (strokesRef.current.length > 0) {
      strokesRef.current.pop();
      historyIndexRef.current = Math.max(-1, historyIndexRef.current - 1);
      updateHistoryState();
      redrawCanvas();
    }
  }, [redrawCanvas, updateHistoryState]);

  // Get current stroke data for broadcasting while drawing
  const getCurrentStroke = useCallback(() => {
    return currentStrokeRef.current;
  }, []);

  // Touch event handlers for mobile support
  const startDrawingTouch = useCallback(
    (e: React.TouchEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      const point = getTouchPos(e);

      currentStrokeRef.current = {
        id: generateId(),
        points: [point],
        color: color,
        width: strokeWidth,
        tool: tool,
        userId: userId,
        timestamp: Date.now(),
      };

      setIsDrawing(true);
      onCursorMove?.(point);
    },
    [color, strokeWidth, tool, userId, getTouchPos, onCursorMove],
  );

  const drawTouch = useCallback(
    (e: React.TouchEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      const point = getTouchPos(e);
      onCursorMove?.(point);

      if (!isDrawing || !currentStrokeRef.current) return;

      currentStrokeRef.current.points.push(point);

      const ctx = contextRef.current;
      if (!ctx) return;

      const points = currentStrokeRef.current.points;
      if (points.length < 2) return;

      ctx.beginPath();
      ctx.strokeStyle = tool === "eraser" ? "#ffffff" : color;
      ctx.lineWidth = strokeWidth;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      const len = points.length;
      if (len >= 3) {
        const prev = points[len - 3];
        const curr = points[len - 2];
        const next = points[len - 1];

        const midX1 = (prev.x + curr.x) / 2;
        const midY1 = (prev.y + curr.y) / 2;
        const midX2 = (curr.x + next.x) / 2;
        const midY2 = (curr.y + next.y) / 2;

        ctx.moveTo(midX1, midY1);
        ctx.quadraticCurveTo(curr.x, curr.y, midX2, midY2);
      } else {
        ctx.moveTo(points[len - 2].x, points[len - 2].y);
        ctx.lineTo(points[len - 1].x, points[len - 1].y);
      }

      ctx.stroke();
    },
    [isDrawing, tool, color, strokeWidth, getTouchPos, onCursorMove],
  );

  return {
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
  };
}
