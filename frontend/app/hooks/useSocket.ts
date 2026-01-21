"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { User, CursorPosition, Stroke, Point } from "../types";

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:5000";

interface UseSocketProps {
  user: User | null;
  roomId: string;
  onStrokeReceived: (stroke: Stroke) => void;
  onStrokeDrawing: (data: { odId: string; points: Point[]; color: string; width: number; tool: string }) => void;
  onCanvasState: (data: { strokes: Stroke[]; historyIndex: number }) => void;
  onUndo: () => void;
  onRedo: (stroke: Stroke) => void;
  onClear: () => void;
}

export function useSocket({
  user,
  roomId,
  onStrokeReceived,
  onStrokeDrawing,
  onCanvasState,
  onUndo,
  onRedo,
  onClear,
}: UseSocketProps) {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [cursors, setCursors] = useState<CursorPosition[]>([]);

  useEffect(() => {
    if (!user) return;

    const socket = io(SERVER_URL, {
      transports: ["websocket", "polling"],
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setIsConnected(true);
      socket.emit("room:join", { roomId, user });
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
    });

    socket.on("users:update", (userList: User[]) => {
      setUsers(userList);
    });

    socket.on("cursor:move", (cursorData: CursorPosition) => {
      setCursors((prev) => {
        const filtered = prev.filter((c) => c.userId !== cursorData.userId);
        return [...filtered, cursorData];
      });
    });

    socket.on("stroke:drawing", onStrokeDrawing);
    socket.on("stroke:complete", onStrokeReceived);

    socket.on("canvas:state", onCanvasState);

    socket.on("canvas:undo", () => {
      onUndo();
    });

    socket.on("canvas:redo", ({ stroke }: { stroke: Stroke }) => {
      onRedo(stroke);
    });

    socket.on("canvas:clear", () => {
      onClear();
    });

    return () => {
      socket.disconnect();
    };
  }, [user, roomId, onStrokeReceived, onStrokeDrawing, onCanvasState, onUndo, onRedo, onClear]);

  const emitStrokeDrawing = useCallback((strokeData: Partial<Stroke>) => {
    socketRef.current?.emit("stroke:drawing", strokeData);
  }, []);

  const emitStrokeComplete = useCallback((stroke: Stroke) => {
    socketRef.current?.emit("stroke:complete", stroke);
  }, []);

  const emitCursorMove = useCallback((position: Point) => {
    socketRef.current?.emit("cursor:move", position);
  }, []);

  const emitUndo = useCallback(() => {
    socketRef.current?.emit("undo");
  }, []);

  const emitRedo = useCallback(() => {
    socketRef.current?.emit("redo");
  }, []);

  const emitClear = useCallback(() => {
    socketRef.current?.emit("canvas:clear");
  }, []);

  const emitDrawingState = useCallback((isDrawing: boolean) => {
    socketRef.current?.emit("user:drawing", isDrawing);
  }, []);

  return {
    isConnected,
    users,
    cursors,
    emitStrokeDrawing,
    emitStrokeComplete,
    emitCursorMove,
    emitUndo,
    emitRedo,
    emitClear,
    emitDrawingState,
  };
}
