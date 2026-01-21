"use client";

import { CursorPosition } from "../types";
import { FaMousePointer } from "react-icons/fa";

interface CursorsOverlayProps {
  cursors: CursorPosition[];
  currentUserId: string;
}

export default function CursorsOverlay({ cursors, currentUserId }: CursorsOverlayProps) {
  // Filter out the current user's cursor
  const otherCursors = cursors.filter((c) => c.userId !== currentUserId);

  return (
    <div className="cursors-overlay">
      {otherCursors.map((cursor) => (
        <div
          key={cursor.userId}
          className="cursor-pointer"
          style={
            {
              left: cursor.position.x,
              top: cursor.position.y,
              "--cursor-color": cursor.color,
            } as React.CSSProperties
          }
        >
          {/* Cursor icon */}
          <FaMousePointer size={18} color={cursor.color} className="cursor-icon" />
          {/* User name label */}
          <span className="cursor-label" style={{ backgroundColor: cursor.color }}>
            {cursor.name}
          </span>
        </div>
      ))}
    </div>
  );
}
