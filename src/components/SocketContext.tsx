// Paused: WebSocket logic temporarily disabled for user consistency debugging.
/*
"use client";

// Usage example:
// import { useSocket } from './SocketContext';
// const socket = useSocket();
// useEffect(() => {
//   if (!socket) return;
//   socket.on('salesUpdate', (data) => { ... });
//   return () => { socket.off('salesUpdate'); };
// }, [socket]);

import React, { createContext, useContext, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

const SocketContext = createContext<Socket | null>(null);

export const useSocket = () => useContext(SocketContext);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Adjust the URL if your backend runs on a different host/port
    const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3000', {
      transports: ['websocket'],
      autoConnect: true,
    });
    socketRef.current = socket;
    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider value={socketRef.current}>
      {children}
    </SocketContext.Provider>
  );
};
*/ 