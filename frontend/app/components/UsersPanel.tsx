"use client";

import { User } from "../types";

interface UsersPanelProps {
  users: User[];
  currentUserId: string;
}

export default function UsersPanel({ users, currentUserId }: UsersPanelProps) {
  return (
    <div className="users-panel">
      <h3 className="users-title">Online Users ({users.length})</h3>
      <ul className="users-list">
        {users.map((user) => (
          <li key={user.id} className="user-item">
            <span className="user-indicator" style={{ backgroundColor: user.color }} />
            <span className="user-name">
              {user.name}
              {user.id === currentUserId && " (You)"}
            </span>
            {user.isDrawing && <span className="drawing-indicator">✏️</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
