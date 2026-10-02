import { useEffect, useRef, useState, useCallback } from "react";

// Robust STUN and TURN fallback configuration for cross-network reliability
const ICE_SERVERS: RTCIceServer[] = [
  // Fast public Google STUN servers
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
  // Cloudflare STUN
  { urls: "stun:stun.cloudflare.com:3478" },
  // Twilio STUN
  { urls: "stun:global.stun.twilio.com:3478" },
  // OpenRelay Public TURN Relay (Free WebRTC TURN relay supporting UDP, TCP, and TLS)
  // Essential for traversing mobile carrier symmetric CGNAT (4G/5G) and enterprise firewalls
  {
    urls: [
      "turn:openrelay.metered.ca:80",
      "turn:openrelay.metered.ca:443",
      "turn:openrelay.metered.ca:443?transport=tcp",
      "turns:openrelay.metered.ca:443?transport=tcp",
    ],
    username: "openrelayproject",
    credential: "openrelayproject",
  },
];

// Meeting-quality audio constraints optimized for Opus speech
const AUDIO_CONSTRAINTS: MediaTrackConstraints = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
  channelCount: 1,
  sampleRate: 48000,
};

export type VoiceState = "connected" | "connecting" | "reconnecting" | "disconnected";

export interface RemotePeerVoice {
  stream: MediaStream;
  speaking: boolean;
  name: string;
  connectionState: RTCPeerConnectionState;
}

export function useVoiceChannel(
  sessionId: string,
  socket: any,
  userName: string,
  isMicOn: boolean
) {
  const [peers, setPeers] = useState<Record<string, RemotePeerVoice>>({});
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceState, setVoiceState] = useState<VoiceState>("connecting");

  const pcRef = useRef<Record<string, RTCPeerConnection>>({});
  const localStreamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const animFrameRef = useRef<number>(0);

  // Perfect Negotiation state per peer
  const makingOfferRef = useRef<Record<string, boolean>>({});
  const ignoreOfferRef = useRef<Record<string, boolean>>({});
  const isSettingRemoteAnswerPendingRef = useRef<Record<string, boolean>>({});
  const peerNamesRef = useRef<Record<string, string>>({});
  const sendersRef = useRef<Record<string, RTCRtpSender>>({});
  const iceCandidateQueueRef = useRef<Record<string, RTCIceCandidateInit[]>>({});

  // Direct Audio element management for remote playback
  const audioElementsRef = useRef<Record<string, HTMLAudioElement>>({});
  const remoteAnalysersRef = useRef<Record<string, { analyser: AnalyserNode; animFrame: number }>>({});

  // Global Audio Unlocker for browser autoplay policies
  const unlockAllAudio = useCallback(() => {
    Object.values(audioElementsRef.current).forEach((audio) => {
      if (audio.paused && audio.srcObject) {
        audio.play().catch(() => {});
      }
    });
    if (audioCtxRef.current && audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume().catch(() => {});
    }
  }, []);

  useEffect(() => {
    const handleGesture = () => unlockAllAudio();
    window.addEventListener("pointerdown", handleGesture, { passive: true });
    window.addEventListener("touchstart", handleGesture, { passive: true });
    window.addEventListener("click", handleGesture, { passive: true });
    window.addEventListener("keydown", handleGesture, { passive: true });
    return () => {
      window.removeEventListener("pointerdown", handleGesture);
      window.removeEventListener("touchstart", handleGesture);
      window.removeEventListener("click", handleGesture);
      window.removeEventListener("keydown", handleGesture);
    };
  }, [unlockAllAudio]);

  // Evaluate aggregate voice connection state
  const updateAggregateState = useCallback(() => {
    const pcs = Object.values(pcRef.current);
    if (pcs.length === 0) {
      setVoiceState("connected");
      return;
    }
    const hasFailed = pcs.some((pc) => pc.connectionState === "failed" || pc.iceConnectionState === "failed");
    if (hasFailed) {
      setVoiceState("reconnecting");
      return;
    }
    const hasConnecting = pcs.some(
      (pc) =>
        pc.connectionState === "connecting" ||
        pc.connectionState === "new" ||
        pc.iceConnectionState === "checking"
    );
    if (hasConnecting) {
      setVoiceState("connecting");
      return;
    }
    const allDisconnected = pcs.every(
      (pc) => pc.connectionState === "disconnected" || pc.connectionState === "closed"
    );
    if (allDisconnected) {
      setVoiceState("disconnected");
      return;
    }
    setVoiceState("connected");
  }, []);

  // Cleanup single peer
  const cleanupPeer = useCallback((targetId: string) => {
    // Stop remote audio
    const audio = audioElementsRef.current[targetId];
    if (audio) {
      audio.pause();
      audio.srcObject = null;
      delete audioElementsRef.current[targetId];
    }

    // Stop remote audio analysis
    const remoteAnalyser = remoteAnalysersRef.current[targetId];
    if (remoteAnalyser) {
      cancelAnimationFrame(remoteAnalyser.animFrame);
      delete remoteAnalysersRef.current[targetId];
    }

    // Close and clean peer connection
    if (pcRef.current[targetId]) {
      try {
        pcRef.current[targetId].close();
      } catch (e) {
        console.warn("[voice] Error closing PC:", e);
      }
      delete pcRef.current[targetId];
    }

    delete makingOfferRef.current[targetId];
    delete ignoreOfferRef.current[targetId];
    delete isSettingRemoteAnswerPendingRef.current[targetId];
    delete peerNamesRef.current[targetId];
    delete sendersRef.current[targetId];
    delete iceCandidateQueueRef.current[targetId];

    setPeers((prev) => {
      const next = { ...prev };
      delete next[targetId];
      return next;
    });

    updateAggregateState();
  }, [updateAggregateState]);

  // Clean up everything on unmount
  const cleanupAll = useCallback(() => {
    cancelAnimationFrame(animFrameRef.current);
    Object.keys(pcRef.current).forEach((targetId) => {
      cleanupPeer(targetId);
    });
    pcRef.current = {};

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
      setLocalStream(null);
    }

    if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    analyserRef.current = null;
    iceCandidateQueueRef.current = {};
    setPeers({});
    setIsSpeaking(false);
  }, [cleanupPeer]);

  // Play remote audio safely
  const attachRemoteAudio = useCallback((targetId: string, stream: MediaStream) => {
    let audio = audioElementsRef.current[targetId];
    if (!audio) {
      audio = new Audio();
      audio.autoplay = true;
      (audio as any).playsInline = true;
      audio.volume = 1.0;
      audioElementsRef.current[targetId] = audio;
    }
    if (audio.srcObject !== stream) {
      audio.srcObject = stream;
    }
    audio.play().catch(() => {
      // Browsers may pause until user interaction
    });
  }, []);

  // Setup speaking detection on remote streams
  const setupRemoteAudioAnalysis = useCallback((targetId: string, stream: MediaStream) => {
    try {
      const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;

      if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
        audioCtxRef.current = new AudioContextClass();
      }
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      if (ctx.state === "suspended") {
        ctx.resume().catch(() => {});
      }

      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      const checkRemoteSpeaking = () => {
        if (!analysersActiveRef.current) return;
        const data = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        const isPeerSpeaking = avg > 14;

        setPeers((prev) => {
          if (!prev[targetId] || prev[targetId].speaking === isPeerSpeaking) return prev;
          return {
            ...prev,
            [targetId]: { ...prev[targetId], speaking: isPeerSpeaking },
          };
        });

        const frame = requestAnimationFrame(checkRemoteSpeaking);
        if (remoteAnalysersRef.current[targetId]) {
          remoteAnalysersRef.current[targetId].animFrame = frame;
        }
      };

      const frame = requestAnimationFrame(checkRemoteSpeaking);
      remoteAnalysersRef.current[targetId] = { analyser, animFrame: frame };
    } catch (e) {
      console.warn("[voice] Remote audio analysis setup warning:", e);
    }
  }, []);

  const analysersActiveRef = useRef(true);

  // Setup Peer Connection with Perfect Negotiation
  const createPC = useCallback(
    (targetId: string, targetName: string): RTCPeerConnection => {
      if (pcRef.current[targetId]) return pcRef.current[targetId];

      peerNamesRef.current[targetId] = targetName;
      makingOfferRef.current[targetId] = false;
      ignoreOfferRef.current[targetId] = false;
      isSettingRemoteAnswerPendingRef.current[targetId] = false;
      iceCandidateQueueRef.current[targetId] = [];

      const pc = new RTCPeerConnection({
        iceServers: ICE_SERVERS,
        iceCandidatePoolSize: 2,
      });

      // Perfect negotiation: Polite peer is deterministically decided by socket IDs
      const isPolite = socket.id > targetId;

      // Add audio transceiver with sendrecv direction so SDP always negotiates bidirectional audio
      if (localStreamRef.current && localStreamRef.current.getAudioTracks().length > 0) {
        const track = localStreamRef.current.getAudioTracks()[0];
        try {
          const sender = pc.addTrack(track, localStreamRef.current);
          sendersRef.current[targetId] = sender;
        } catch (e) {
          console.warn("[voice] addTrack error:", e);
        }
      } else {
        try {
          const transceiver = pc.addTransceiver("audio", { direction: "sendrecv" });
          sendersRef.current[targetId] = transceiver.sender;
        } catch (e) {
          console.warn("[voice] addTransceiver warning:", e);
        }
      }

      // ICE Candidate forwarding
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit("voice:signal", {
            sessionId,
            targetId,
            signal: { candidate: event.candidate.toJSON() },
            callerId: socket.id,
            callerName: userName,
          });
        }
      };

      // Handle Remote Audio Tracks
      pc.ontrack = (event) => {
        const remoteTrack = event.track;
        const remoteStream = event.streams[0] || new MediaStream([remoteTrack]);

        attachRemoteAudio(targetId, remoteStream);
        setupRemoteAudioAnalysis(targetId, remoteStream);

        setPeers((prev) => ({
          ...prev,
          [targetId]: {
            stream: remoteStream,
            speaking: false,
            name: peerNamesRef.current[targetId] || targetName,
            connectionState: pc.connectionState,
          },
        }));

        remoteTrack.onunmute = () => {
          attachRemoteAudio(targetId, remoteStream);
        };

        remoteTrack.onended = () => {
          cleanupPeer(targetId);
        };
      };

      // Connection state monitoring
      pc.onconnectionstatechange = () => {
        updateAggregateState();
        setPeers((prev) => {
          if (!prev[targetId]) return prev;
          return {
            ...prev,
            [targetId]: { ...prev[targetId], connectionState: pc.connectionState },
          };
        });

        if (pc.connectionState === "failed") {
          console.log(`[voice] Connection failed to ${targetId}, restarting ICE...`);
          try {
            pc.restartIce();
          } catch (e) {
            console.warn("[voice] restartIce error:", e);
          }
        }
      };

      pc.oniceconnectionstatechange = () => {
        updateAggregateState();
        if (pc.iceConnectionState === "failed") {
          try {
            pc.restartIce();
          } catch (e) {}
        }
      };

      // Perfect Negotiation negotiationneeded handler
      pc.onnegotiationneeded = async () => {
        try {
          makingOfferRef.current[targetId] = true;
          await pc.setLocalDescription();
          socket.emit("voice:signal", {
            sessionId,
            targetId,
            signal: { sdp: pc.localDescription },
            callerId: socket.id,
            callerName: userName,
          });
        } catch (err) {
          console.error(`[voice] Negotiation error with ${targetId}:`, err);
        } finally {
          makingOfferRef.current[targetId] = false;
        }
      };

      pcRef.current[targetId] = pc;
      updateAggregateState();
      return pc;
    },
    [
      sessionId,
      socket,
      userName,
      attachRemoteAudio,
      setupRemoteAudioAnalysis,
      cleanupPeer,
      updateAggregateState,
    ]
  );

  // Main Signaling & Peer Discovery Effect
  useEffect(() => {
    if (!socket || !sessionId) return;
    analysersActiveRef.current = true;

    // Join voice signaling room immediately
    socket.emit("voice:join", { sessionId, userName });

    // Handle existing peers sent by the server upon joining
    const onVoicePeers = (existingPeers: Array<{ peerId: string; name: string }>) => {
      console.log(`[voice] Received existing peers:`, existingPeers);
      if (Array.isArray(existingPeers)) {
        existingPeers.forEach(({ peerId, name }) => {
          if (peerId !== socket.id) {
            createPC(peerId, name || "Participant");
          }
        });
      }
    };

    // Handle a new peer joining the room
    const onVoiceJoin = ({ targetId, targetName }: { targetId: string; targetName: string }) => {
      if (!targetId || targetId === socket.id) return;
      console.log(`[voice] Peer joined: ${targetName} (${targetId})`);
      createPC(targetId, targetName || "Participant");
    };

    // Handle WebRTC signals (Offers, Answers, ICE Candidates)
    const onVoiceSignal = async ({
      signal,
      callerId,
      callerName,
    }: {
      signal: any;
      callerId: string;
      callerName: string;
    }) => {
      if (!callerId || callerId === socket.id || !signal) return;

      let pc = pcRef.current[callerId];
      if (!pc) {
        pc = createPC(callerId, callerName || "Participant");
      }

      const isPolite = socket.id > callerId;

      try {
        if (signal.sdp) {
          const desc = new RTCSessionDescription(signal.sdp);
          const readyForOffer =
            !makingOfferRef.current[callerId] &&
            (pc.signalingState === "stable" || isSettingRemoteAnswerPendingRef.current[callerId]);
          const offerCollision = desc.type === "offer" && !readyForOffer;

          ignoreOfferRef.current[callerId] = !isPolite && offerCollision;
          if (ignoreOfferRef.current[callerId]) {
            console.log(`[voice] Glare detected: impolite peer ignoring colliding offer from ${callerId}`);
            return;
          }

          if (offerCollision) {
            // Polite peer yields by rolling back local description
            await pc.setLocalDescription({ type: "rollback" } as RTCSessionDescriptionInit);
          }

          isSettingRemoteAnswerPendingRef.current[callerId] = desc.type === "answer";
          await pc.setRemoteDescription(desc);
          isSettingRemoteAnswerPendingRef.current[callerId] = false;

          // Flush queued candidates
          const queued = iceCandidateQueueRef.current[callerId] || [];
          iceCandidateQueueRef.current[callerId] = [];
          for (const cand of queued) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(cand));
            } catch (candErr) {
              console.warn("[voice] Error adding queued ICE candidate:", candErr);
            }
          }

          if (desc.type === "offer") {
            // Respond with answer
            await pc.setLocalDescription();
            socket.emit("voice:signal", {
              sessionId,
              targetId: callerId,
              signal: { sdp: pc.localDescription },
              callerId: socket.id,
              callerName: userName,
            });
          }
        } else if (signal.candidate) {
          if (!pc.remoteDescription) {
            if (!iceCandidateQueueRef.current[callerId]) {
              iceCandidateQueueRef.current[callerId] = [];
            }
            iceCandidateQueueRef.current[callerId].push(signal.candidate);
          } else {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
            } catch (e) {
              console.warn("[voice] Error adding ICE candidate:", e);
            }
          }
        }
      } catch (err) {
        if (pc.signalingState !== "closed") {
          console.error(`[voice] Error in signal handling with ${callerId}:`, err);
        }
      }
    };

    // Handle peer leaving
    const onVoiceLeave = (targetId: string) => {
      console.log(`[voice] Peer left: ${targetId}`);
      cleanupPeer(targetId);
    };

    // Auto-recover on network changes (WiFi -> Mobile data, wake from sleep, etc.)
    const onOnline = () => {
      console.log("[voice] Network online detected. Restarting ICE on all connections...");
      socket.emit("voice:join", { sessionId, userName });
      Object.values(pcRef.current).forEach((pc) => {
        try {
          pc.restartIce();
        } catch (e) {}
      });
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        unlockAllAudio();
      }
    };

    const onSocketConnect = () => {
      console.log("[voice] Socket reconnected. Re-joining voice room...");
      socket.emit("voice:join", { sessionId, userName });
    };

    socket.on("voice:peers", onVoicePeers);
    socket.on("voice:join", onVoiceJoin);
    socket.on("voice:signal", onVoiceSignal);
    socket.on("voice:leave", onVoiceLeave);
    socket.on("connect", onSocketConnect);

    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      analysersActiveRef.current = false;
      socket.off("voice:peers", onVoicePeers);
      socket.off("voice:join", onVoiceJoin);
      socket.off("voice:signal", onVoiceSignal);
      socket.off("voice:leave", onVoiceLeave);
      socket.off("connect", onSocketConnect);

      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisibilityChange);

      socket.emit("voice:leave", { sessionId });
      cleanupAll();
    };
  }, [socket, sessionId, userName, createPC, cleanupPeer, cleanupAll, unlockAllAudio]);

  // Local Microphone State Management
  useEffect(() => {
    let active = true;

    const setupLocalAudioAnalysis = (stream: MediaStream) => {
      try {
        const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
        if (!AudioContextClass) return;

        if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
          audioCtxRef.current = new AudioContextClass();
        }
        const audioCtx = audioCtxRef.current;
        if (!audioCtx) return;
        if (audioCtx.state === "suspended") {
          audioCtx.resume().catch(() => {});
        }

        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        analyserRef.current = analyser;

        const checkSpeaking = () => {
          if (!active || !analyserRef.current) return;
          const data = new Uint8Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getByteFrequencyData(data);
          const avg = data.reduce((a, b) => a + b, 0) / data.length;
          setIsSpeaking(avg > 15);
          animFrameRef.current = requestAnimationFrame(checkSpeaking);
        };
        checkSpeaking();
      } catch (e) {
        console.warn("[voice] Local audio analysis warning:", e);
      }
    };

    const handleMicState = async () => {
      if (isMicOn) {
        // User explicitly unmuted
        if (localStreamRef.current && localStreamRef.current.getAudioTracks().length > 0) {
          // Re-enable existing track
          localStreamRef.current.getAudioTracks().forEach((t) => {
            t.enabled = true;
          });
          setupLocalAudioAnalysis(localStreamRef.current);
        } else {
          // First time unmuting: request microphone permission cleanly
          if (!navigator.mediaDevices?.getUserMedia) {
            console.error("[voice] getUserMedia not supported in this browser environment.");
            return;
          }

          try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: AUDIO_CONSTRAINTS });
            if (!active) {
              stream.getTracks().forEach((t) => t.stop());
              return;
            }

            localStreamRef.current = stream;
            setLocalStream(stream);

            // Enable track
            const track = stream.getAudioTracks()[0];
            if (track) {
              track.enabled = true;
            }

            // Attach to all active peer connections
            Object.entries(pcRef.current).forEach(([targetId, pc]) => {
              const sender = sendersRef.current[targetId];
              if (sender) {
                sender.replaceTrack(track).catch((err) => {
                  console.warn(`[voice] replaceTrack warning for ${targetId}:`, err);
                });
              } else {
                try {
                  const s = pc.addTrack(track, stream);
                  sendersRef.current[targetId] = s;
                } catch (e) {
                  console.warn(`[voice] addTrack warning for ${targetId}:`, e);
                }
              }
            });

            setupLocalAudioAnalysis(stream);
          } catch (err: any) {
            console.warn("[voice] Failed to access microphone:", err?.name || err);
          }
        }
      } else {
        // User explicitly muted: disable track without destroying WebRTC connection
        if (localStreamRef.current) {
          localStreamRef.current.getAudioTracks().forEach((t) => {
            t.enabled = false;
          });
        }
        setIsSpeaking(false);
      }
    };

    handleMicState();

    return () => {
      active = false;
    };
  }, [isMicOn]);

  return {
    peers,
    localStream,
    isSpeaking,
    voiceState,
  };
}
