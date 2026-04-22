"use client";

import { useEffect, useState, useCallback } from "react";
import { useSocket } from "@/components/providers/SocketProvider";
import { SessionState } from "@/lib/types";

export function useSession(sessionId: string, name: string, role: "host" | "participant") {
  const { socket, isConnected } = useSocket();
  const [session, setSession] = useState<SessionState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isKicked, setIsKicked] = useState(false);

  // Join / rejoin on connect or when params change
  useEffect(() => {
    if (!socket || !isConnected || !name || !sessionId) return;

    console.log(`[session] joining ${sessionId} as ${role} (${name})`);
    socket.emit("session:join", { sessionId, name, role });

    socket.on("session:state", (state: SessionState) => {
      console.log(`[session] state update → mode=${state.mode} status=${state.status} participants=${state.participants.length}`);
      setSession(state);
    });

    socket.on("session:error", ({ message }: { message: string }) => {
      console.error("[session] error:", message);
      setError(message);
    });

    socket.on("session:kicked", () => {
      console.log("[session] kicked by host");
      setIsKicked(true);
      setSession(null);
    });

    // On reconnect, rejoin automatically
    socket.on("connect", () => {
      console.log("[session] reconnected — rejoining");
      socket.emit("session:join", { sessionId, name, role });
    });

    return () => {
      socket.off("session:state");
      socket.off("session:error");
      socket.off("session:kicked");
      socket.off("connect");
    };
  }, [socket, isConnected, sessionId, name, role]);

  const startActivity = useCallback((mode: SessionState["mode"], activityData: Record<string, unknown> = {}, status: SessionState["status"] = "live") => {
    if (!socket) return;
    console.log(`[session] startActivity → ${mode} (${status})`);
    socket.emit("session:activity", { sessionId, mode, activityData, status });
  }, [socket, sessionId]);

  const updateActivity = useCallback((activityData?: Record<string, unknown>, status?: SessionState["status"]) => {
    if (!socket) return;
    console.log(`[session] updateActivity → status=${status}`);
    socket.emit("session:updateActivity", { sessionId, activityData, status });
  }, [socket, sessionId]);

  const endActivity = useCallback(() => {
    if (!socket) return;
    console.log("[session] endActivity → lobby");
    socket.emit("session:end", { sessionId });
  }, [socket, sessionId]);

  const promoteUser = useCallback((targetUserId: string) => {
    if (!socket) return;
    console.log(`[session] promoteUser → ${targetUserId}`);
    socket.emit("session:promote", { sessionId, targetUserId });
  }, [socket, sessionId]);

  return { session, error, isKicked, startActivity, updateActivity, endActivity, promoteUser, isConnected };
}
