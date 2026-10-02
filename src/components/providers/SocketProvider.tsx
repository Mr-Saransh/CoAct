"use client";

import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

interface SocketContextProps {
  socket: Socket | null;
  isConnected: boolean;
  isReconnecting: boolean;
}

const SocketContext = createContext<SocketContextProps>({
  socket: null,
  isConnected: false,
  isReconnecting: false,
});

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [showConnectedBadge, setShowConnectedBadge] = useState(false);
  const hadDisconnectRef = useRef(false);
  const badgeTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (socketRef.current) return;

    // Controlled exponential backoff with jitter
    const s = io({
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      randomizationFactor: 0.5,
      timeout: 10000,
      transports: ["websocket", "polling"],
    });
    socketRef.current = s;

    s.on("connect", () => {
      setIsConnected(true);
      setIsReconnecting(false);

      if (hadDisconnectRef.current) {
        setShowConnectedBadge(true);
        if (badgeTimerRef.current) clearTimeout(badgeTimerRef.current);
        badgeTimerRef.current = setTimeout(() => {
          setShowConnectedBadge(false);
        }, 2500);
      }
    });

    s.on("disconnect", (reason) => {
      setIsConnected(false);
      hadDisconnectRef.current = true;
      if (reason !== "io client disconnect") {
        setIsReconnecting(true);
      }
    });

    s.io.on("reconnect_attempt", () => {
      setIsReconnecting(true);
    });

    s.io.on("reconnect", () => {
      setIsReconnecting(false);
      setIsConnected(true);
    });

    s.on("connect_error", () => {
      setIsReconnecting(true);
    });

    return () => {
      if (badgeTimerRef.current) clearTimeout(badgeTimerRef.current);
      s.off("connect");
      s.off("disconnect");
      s.off("connect_error");
      s.io.off("reconnect_attempt");
      s.io.off("reconnect");
      s.disconnect();
      socketRef.current = null;
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, isConnected, isReconnecting }}>
      {/* Subtle, non-blocking connection status indicators */}
      {isReconnecting && (
        <div 
          role="status" 
          aria-live="polite"
          className="fixed top-3 left-1/2 -translate-x-1/2 z-[9999] pointer-events-none flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/90 text-amber-950 font-semibold text-xs shadow-lg backdrop-blur-md border border-amber-400/40 transition-all duration-300"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-900 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-900"></span>
          </span>
          Reconnecting...
        </div>
      )}

      {!isReconnecting && showConnectedBadge && (
        <div 
          role="status" 
          aria-live="polite"
          className="fixed top-3 left-1/2 -translate-x-1/2 z-[9999] pointer-events-none flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/90 text-white font-semibold text-xs shadow-lg backdrop-blur-md border border-emerald-400/40 transition-all duration-300"
        >
          <span className="inline-flex rounded-full h-2 w-2 bg-white"></span>
          Connected
        </div>
      )}

      {children}
    </SocketContext.Provider>
  );
};
