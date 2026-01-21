# Architecture Documentation

## Data Flow Diagram

```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│   User A        │         │   Server        │         │   User B        │
│   (Browser)     │         │   (Node.js)     │         │   (Browser)     │
└────────┬────────┘         └────────┬────────┘         └────────┬────────┘
         │                           │                           │
         │  1. Connect + Join Room   │                           │
         │ ────────────────────────► │                           │
         │                           │                           │
         │  2. Canvas State          │                           │
         │ ◄──────────────────────── │                           │
         │                           │                           │
         │  3. Mouse Move (cursor)   │  4. Broadcast cursor      │
         │ ────────────────────────► │ ────────────────────────► │
         │                           │                           │
         │  5. Stroke Complete       │  6. Broadcast stroke      │
         │ ────────────────────────► │ ────────────────────────► │
         │                           │                           │
         │  7. Undo                  │  8. Broadcast undo        │
         │ ────────────────────────► │ ────────────────────────► │
         │                           │                           │
```

## WebSocket Protocol

### Client → Server Events

| Event             | Payload                          | Description            |
| ----------------- | -------------------------------- | ---------------------- |
| `room:join`       | `{ roomId: string, user: User }` | Join a drawing room    |
| `stroke:complete` | `Stroke`                         | Send completed stroke  |
| `cursor:move`     | `{ x: number, y: number }`       | Update cursor position |
| `undo`            | -                                | Trigger undo           |
| `redo`            | -                                | Trigger redo           |
| `canvas:clear`    | -                                | Clear entire canvas    |
| `user:drawing`    | `boolean`                        | Update drawing state   |

### Server → Client Events

| Event             | Payload                                       | Description                  |
| ----------------- | --------------------------------------------- | ---------------------------- |
| `canvas:state`    | `{ strokes: Stroke[], historyIndex: number }` | Initial canvas state         |
| `users:update`    | `User[]`                                      | Updated user list            |
| `stroke:complete` | `Stroke`                                      | New stroke from another user |
| `cursor:move`     | `CursorPosition`                              | Another user's cursor moved  |
| `canvas:undo`     | `{ historyIndex: number }`                    | Undo triggered               |
| `canvas:redo`     | `{ stroke: Stroke }`                          | Redo triggered               |
| `canvas:clear`    | -                                             | Canvas cleared               |

### Data Types

```typescript
interface Stroke {
  id: string;
  points: Point[];
  color: string;
  width: number;
  tool: "brush" | "eraser";
  userId: string;
  timestamp: number;
}

interface User {
  id: string;
  name: string;
  color: string;
  isDrawing: boolean;
}

interface CursorPosition {
  userId: string;
  position: { x: number; y: number };
  color: string;
  name: string;
}
```

## Undo/Redo Strategy

### Approach: Global Operation History

We use a linear history stack that tracks all drawing operations across all users.

```
History Stack: [Stroke1, Stroke2, Stroke3, Stroke4]
                                          ^
                                    historyIndex
```

### How It Works

1. **Adding a stroke**: Push to history, increment historyIndex
2. **Undo**: Decrement historyIndex, remove stroke from canvas
3. **Redo**: Increment historyIndex, re-add stroke to canvas
4. **New stroke after undo**: Truncate redo history, add new stroke

### Sync Mechanism

- When any user triggers undo/redo, the server broadcasts to all clients
- All clients update their local state to match
- The server is the source of truth for history state

### Trade-offs

**Pros:**

- Simple to implement and understand
- Consistent state across all users
- No conflicts possible

**Cons:**

- User A can undo User B's work
- No per-user undo history
- Could be confusing in high-activity scenarios

## Conflict Resolution

### Strategy: Last-Write-Wins with Ordering

Since strokes are independent visual elements, we don't have true conflicts. Multiple users can draw in overlapping areas simultaneously.

### How Overlapping Draws Are Handled

1. Each stroke is assigned a timestamp on creation
2. Strokes are rendered in timestamp order
3. Later strokes paint over earlier ones
4. The visual result is deterministic across all clients

### Edge Cases

- **Network latency**: Strokes may arrive out of order but timestamps ensure consistent rendering
- **Simultaneous clear**: First clear wins, subsequent clears are no-ops
- **Rapid undo spam**: Server processes in order, rate limiting could be added

## Performance Decisions

### Canvas Rendering

1. **Incremental drawing**: While drawing, only render the new segment instead of redrawing everything
2. **Quadratic curves**: Use `quadraticCurveTo()` for smooth paths instead of straight line segments
3. **Batch redraws**: Full canvas redraws only happen on undo/redo/sync events

### Network Optimization

1. **Stroke batching**: Only send complete strokes, not individual points
2. **Cursor throttling**: Cursor positions update on mouse move but could be throttled
3. **Room isolation**: Users only receive events from their room

### Memory Management

1. **History limit**: Could cap history to N strokes to prevent memory bloat
2. **Empty room cleanup**: Rooms are deleted when last user leaves

## Scaling Considerations

### Current Limitations (Single Server)

- All state in memory
- Single point of failure
- Limited to ~1000 concurrent connections per server

### Scaling to 1000+ Users

1. **Redis adapter**: Use Socket.io Redis adapter for horizontal scaling
2. **Room sharding**: Distribute rooms across server instances
3. **Canvas persistence**: Store canvas state in Redis/database
4. **CDN for static assets**: Serve frontend from CDN
5. **Load balancer**: Distribute WebSocket connections across servers

```
                    ┌─────────────────┐
                    │  Load Balancer  │
                    └────────┬────────┘
           ┌─────────────────┼─────────────────┐
           │                 │                 │
    ┌──────▼──────┐   ┌──────▼──────┐   ┌──────▼──────┐
    │  Server 1   │   │  Server 2   │   │  Server 3   │
    └──────┬──────┘   └──────┬──────┘   └──────┬──────┘
           │                 │                 │
           └─────────────────┼─────────────────┘
                    ┌────────▼────────┐
                    │     Redis       │
                    │  (Pub/Sub +     │
                    │   State Store)  │
                    └─────────────────┘
```
