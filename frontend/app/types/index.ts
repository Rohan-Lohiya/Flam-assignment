// Types for the collaborative drawing canvas

export type Tool = "brush" | "eraser";

export interface Point {
  x: number;
  y: number;
}

export interface Stroke {
  id: string;
  points: Point[];
  color: string;
  width: number;
  tool: Tool;
  userId: string;
  timestamp: number;
}

export interface User {
  id: string;
  name: string;
  color: string;
  cursorPosition: Point | null;
  isDrawing: boolean;
}

export interface CursorPosition {
  userId: string;
  position: Point;
  color: string;
  name: string;
}

export interface DrawingState {
  strokes: Stroke[];
  currentStroke: Stroke | null;
}

// Action types for undo/redo
export interface DrawAction {
  type: "add" | "remove";
  stroke: Stroke;
  userId: string;
  timestamp: number;
}
