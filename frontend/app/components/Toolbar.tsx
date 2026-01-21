"use client";

import { Tool } from "../types";
import { BsBrush } from "react-icons/bs";
import { RiEraserLine } from "react-icons/ri";
import { MdUndo, MdRedo } from "react-icons/md";

// Preset colors for the color picker
const COLORS = [
  "#000000", // Black
  "#ffffff", // White
  "#ef4444", // Red
  "#f97316", // Orange
  "#eab308", // Yellow
  "#22c55e", // Green
  "#3b82f6", // Blue
  "#8b5cf6", // Purple
  "#ec4899", // Pink
  "#6b7280", // Gray
];

const STROKE_WIDTHS = [2, 5, 10, 15, 20];

interface ToolbarProps {
  tool: Tool;
  color: string;
  strokeWidth: number;
  canUndo: boolean;
  canRedo: boolean;
  onToolChange: (tool: Tool) => void;
  onColorChange: (color: string) => void;
  onStrokeWidthChange: (width: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
}

export default function Toolbar({
  tool,
  color,
  strokeWidth,
  canUndo,
  canRedo,
  onToolChange,
  onColorChange,
  onStrokeWidthChange,
  onUndo,
  onRedo,
  onClear,
}: ToolbarProps) {
  return (
    <div className="toolbar">
      {/* Drawing Tools */}
      <div className="toolbar-section">
        <span className="toolbar-label">Tools</span>
        <div className="toolbar-buttons">
          <button
            className={`tool-btn ${tool === "brush" ? "active" : ""}`}
            onClick={() => onToolChange("brush")}
            title="Brush"
          >
            <BsBrush size={18} />
          </button>

          <button
            className={`tool-btn ${tool === "eraser" ? "active" : ""}`}
            onClick={() => onToolChange("eraser")}
            title="Eraser"
          >
            <RiEraserLine size={18} />
          </button>
        </div>
      </div>

      <div className="toolbar-section">
        <div className="color-picker">
          {COLORS.map((c) => (
            <button
              key={c}
              className={`color-btn ${color === c ? "active" : ""}`}
              style={{ backgroundColor: c }}
              onClick={() => onColorChange(c)}
              title={c}
            />
          ))}
          {/* Custom color input */}
          <input
            type="color"
            value={color}
            onChange={(e) => onColorChange(e.target.value)}
            className="custom-color-input"
            title="Custom color"
          />
        </div>
      </div>

      {/* Stroke Width */}
      <div className="toolbar-section">
        <span className="toolbar-label">Size: {strokeWidth}px</span>
        <div className="stroke-width-picker">
          {STROKE_WIDTHS.map((w) => (
            <button
              key={w}
              className={`stroke-btn ${strokeWidth === w ? "active" : ""}`}
              onClick={() => onStrokeWidthChange(w)}
              title={`${w}px`}
            >
              <span
                className="stroke-preview"
                style={{
                  width: Math.min(w * 1.5, 24),
                  height: Math.min(w * 1.5, 24),
                }}
              />
            </button>
          ))}
        </div>
      </div>

      {/* Undo/Redo */}
      <div className="toolbar-section">
        <span className="toolbar-label">History</span>
        <div className="toolbar-buttons">
          <button className="tool-btn" onClick={onUndo} disabled={!canUndo} title="Undo (Ctrl+Z)">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 7v6h6" />
              <path d="M21 17a9 9 0 00-9-9 9 9 0 00-6 2.3L3 13" />
            </svg>
          </button>
          <button className="tool-btn" onClick={onRedo} disabled={!canRedo} title="Redo (Ctrl+Y)">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 7v6h-6" />
              <path d="M3 17a9 9 0 019-9 9 9 0 016 2.3l3 2.7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Clear Canvas */}
      <div className="toolbar-section">
        <button className="clear-btn" onClick={onClear} title="Clear Canvas">
          Clear All
        </button>
      </div>
    </div>
  );
}
