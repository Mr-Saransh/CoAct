"use client";

import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

interface SocketContextProps {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextProps>({ socket: null, isConnected: false });

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (socketRef.current) return;

    // Prevent duplicate socket creation in dev strict-mode remounts.
    const s = io({
      reconnection: true, 
      reconnectionAttempts: Infinity, 
      reconnectionDelay: 1000,
      transports: ["websocket", "polling"],
    });
    socketRef.current = s;

    s.on("connect", () => { 
      setIsConnected(true); 
      console.log("[socket] connected", s.id); 
    });

    s.on("disconnect", (reason) => { 
      setIsConnected(false); 
      console.log("[socket] disconnected", reason); 
    });

    s.on("connect_error", (e) => {
      console.error("[socket] connection error:", e.message, e);
    });
    return () => {
      s.off("connect");
      s.off("disconnect");
      s.off("connect_error");
      s.disconnect();
      socketRef.current = null;
    };
  }, []);

  return <SocketContext.Provider value={{ socket: socketRef.current, isConnected }}>{children}</SocketContext.Provider>;
};
