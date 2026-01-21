const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((origin) => origin.trim())
  : ["http://localhost:3000"];

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
  },
});

const PORT = process.env.PORT || 5000;

app.use(
  cors({
    origin: allowedOrigins,
  }),
);
app.use(express.json());

// Store drawing state and users per room
const rooms = new Map();

function getRoom(roomId) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      users: new Map(),
      strokes: [],
      history: [],
      historyIndex: -1,
    });
  }
  return rooms.get(roomId);
}

function broadcastUserList(roomId) {
  const room = getRoom(roomId);
  const userList = Array.from(room.users.values());
  io.to(roomId).emit("users:update", userList);
}

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  let currentRoom = null;
  let currentUser = null;

  // User joins a room
  socket.on("room:join", ({ roomId, user }) => {
    currentRoom = roomId;
    currentUser = { ...user, odId: socket.id };

    socket.join(roomId);

    const room = getRoom(roomId);
    room.users.set(socket.id, currentUser);

    // Send existing canvas state to new user
    socket.emit("canvas:state", {
      strokes: room.strokes,
      historyIndex: room.historyIndex,
    });

    broadcastUserList(roomId);
    console.log(`${user.name} joined room: ${roomId}`);
  });

  // Handle drawing stroke in progress (for real-time preview)
  socket.on("stroke:drawing", (strokeData) => {
    if (!currentRoom) return;
    socket.to(currentRoom).emit("stroke:drawing", {
      ...strokeData,
      odId: socket.id,
    });
  });

  // Handle completed stroke
  socket.on("stroke:complete", (stroke) => {
    if (!currentRoom) return;

    const room = getRoom(currentRoom);

    // Trim any redo history when new stroke is added
    room.strokes = room.strokes.slice(0, room.historyIndex + 1);
    room.history = room.history.slice(0, room.historyIndex + 1);

    room.strokes.push(stroke);
    room.history.push({ type: "add", stroke });
    room.historyIndex = room.history.length - 1;

    socket.to(currentRoom).emit("stroke:complete", stroke);
  });

  // Handle cursor movement
  socket.on("cursor:move", (position) => {
    if (!currentRoom || !currentUser) return;
    socket.to(currentRoom).emit("cursor:move", {
      odId: socket.id,
      position,
      color: currentUser.color,
      name: currentUser.name,
    });
  });

  // Handle undo
  socket.on("undo", () => {
    if (!currentRoom) return;

    const room = getRoom(currentRoom);
    if (room.historyIndex < 0) return;

    const action = room.history[room.historyIndex];
    if (action.type === "add") {
      room.strokes = room.strokes.filter((s) => s.id !== action.stroke.id);
    }

    room.historyIndex--;
    io.to(currentRoom).emit("canvas:undo", { historyIndex: room.historyIndex });
  });

  // Handle redo
  socket.on("redo", () => {
    if (!currentRoom) return;

    const room = getRoom(currentRoom);
    if (room.historyIndex >= room.history.length - 1) return;

    room.historyIndex++;
    const action = room.history[room.historyIndex];
    if (action.type === "add") {
      room.strokes.push(action.stroke);
    }

    io.to(currentRoom).emit("canvas:redo", {
      historyIndex: room.historyIndex,
      stroke: action.stroke,
    });
  });

  // Handle canvas clear
  socket.on("canvas:clear", () => {
    if (!currentRoom) return;

    const room = getRoom(currentRoom);
    room.strokes = [];
    room.history = [];
    room.historyIndex = -1;

    io.to(currentRoom).emit("canvas:clear");
  });

  // Handle user drawing state change
  socket.on("user:drawing", (isDrawing) => {
    if (!currentRoom || !currentUser) return;

    const room = getRoom(currentRoom);
    const user = room.users.get(socket.id);
    if (user) {
      user.isDrawing = isDrawing;
      broadcastUserList(currentRoom);
    }
  });

  // Handle disconnect
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);

    if (currentRoom) {
      const room = getRoom(currentRoom);
      room.users.delete(socket.id);
      broadcastUserList(currentRoom);

      // Clean up empty rooms
      if (room.users.size === 0) {
        rooms.delete(currentRoom);
      }
    }
  });
});

app.get("/", (req, res) => {
  res.json({ message: "Collaborative Canvas Backend" });
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", rooms: rooms.size });
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
