"use client";

import { useEffect, useState, useCallback } from "react";
import { useSocket } from "@/components/providers/SocketProvider";
import { SessionState } from "@/lib/types";

export function useSession(sessionId: string, name: string, role: "host" | "participant") {
  const { socket, isConnected } = useSocket();
  const [session, setSession] = useState<SessionState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isKicked, setIsKicked] = useState(false);

  // Durable identity
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    let id = localStorage.getItem("coact_user_id");
    if (!id) {
      id = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      localStorage.setItem("coact_user_id", id);
    }
    setUserId(id);
  }, []);

  // Join / rejoin on connect or when params change
  useEffect(() => {
    if (!socket || !isConnected || !name || !sessionId || !userId) return;

    console.log(`[session] joining ${sessionId} as ${role} (${name}) userId=${userId}`);
    socket.emit("session:join", { sessionId, name, role, userId });

    socket.on("session:state", (state: SessionState) => {
      console.log(`[session] state update → mode=${state.mode} status=${state.status} participants=${state.participants.length}`);
      setSession(state);
    });

    socket.on("session:error", ({ message }: { message: string }) => {
      setError(message);
      if (message.toLowerCase().includes("banned")) {
        setIsKicked(true);
      }
    });

    socket.on("session:kicked", ({ message }: { message?: string }) => {
      console.log("[session] kicked by host");
      setError(message || "You have been removed from this session.");
      setIsKicked(true);
      setSession(null);
    });

    // On reconnect, rejoin automatically
    const onConnect = () => {
      console.log("[session] reconnected — rejoining");
      socket.emit("session:join", { sessionId, name, role, userId });
    };
    socket.on("connect", onConnect);

    return () => {
      socket.off("session:state");
      socket.off("session:error");
      socket.off("session:kicked");
      socket.off("connect", onConnect);
    };
  }, [socket, isConnected, sessionId, name, role, userId]);

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

  return { session, error, isKicked, userId, startActivity, updateActivity, endActivity, promoteUser, isConnected };
}
