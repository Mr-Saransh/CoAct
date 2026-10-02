import { useEffect, useRef, useState, useCallback } from "react";

// Fast, verified STUN configuration for rapid ICE candidate gathering (<300ms)
const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
  { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
  { urls: ["stun:stun.cloudflare.com:3478"] },
  { urls: ["stun:stun2.l.google.com:19302", "stun:stun3.l.google.com:19302"] },
];

export type VoiceState = "connected" | "connecting" | "reconnecting" | "disconnected";

export interface RemotePeerVoice {
  stream: MediaStream;
  speaking: boolean;
  name: string;
  connectionState: RTCPeerConnectionState;
}

// Feature-detect low-latency audio constraints
function getAudioConstraints(): MediaTrackConstraints {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getSupportedConstraints) {
    return {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    };
  }

  const supported = navigator.mediaDevices.getSupportedConstraints();
  const constraints: MediaTrackConstraints = {};

  if (supported.echoCancellation) constraints.echoCancellation = true;
  if (supported.noiseSuppression) constraints.noiseSuppression = true;
  if (supported.autoGainControl) constraints.autoGainControl = true;
  if (supported.channelCount) constraints.channelCount = 1;
  if ((supported as any).latency) (constraints as any).latency = 0; // Target low latency hint

  return constraints;
}

// Create a silent initial dummy track so SDP negotiates a true bidirectional a=sendrecv RTP session
// before microphone permission is granted. When unmuting, replaceTrack swaps in the live mic instantly.
function createSilentTrack(): { track: MediaStreamTrack; cleanup: () => void } | null {
  try {
    const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return null;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const dst = ctx.createMediaStreamDestination();
    osc.connect(dst);
    osc.start();
    const track = dst.stream.getAudioTracks()[0];
    track.enabled = false; // SILENT
    return {
      track,
      cleanup: () => {
        try {
          track.stop();
          osc.stop();
          ctx.close();
        } catch {}
      },
    };
  } catch {
    return null;
  }
}

// Stable, active DOM container for remote audio playback
function getOrCreateAudioContainer(): HTMLElement {
  let container = document.getElementById("coact-remote-audio-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "coact-remote-audio-container";
    container.setAttribute("aria-hidden", "true");
    container.style.position = "fixed";
    container.style.bottom = "0";
    container.style.right = "0";
    container.style.width = "2px";
    container.style.height = "2px";
    container.style.opacity = "0.01"; // Never 0 so power savers don't suspend playback
    container.style.overflow = "hidden";
    container.style.pointerEvents = "none";
    container.style.zIndex = "-1";
    document.body.appendChild(container);
  }
  return container;
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
  const silentTrackCleanupRef = useRef<(() => void) | null>(null);
  const initialSilentTrackRef = useRef<MediaStreamTrack | null>(null);
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

  // Direct Audio element management inside DOM
  const audioElementsRef = useRef<Record<string, HTMLAudioElement>>({});
  const remoteAnalysersRef = useRef<Record<string, { analyser: AnalyserNode; animFrame: number }>>({});
  const analysersActiveRef = useRef(true);

  // Initialize silent track for instant sendrecv SDP negotiation
  useEffect(() => {
    const silent = createSilentTrack();
    if (silent) {
      initialSilentTrackRef.current = silent.track;
      silentTrackCleanupRef.current = silent.cleanup;
    }
    return () => {
      silentTrackCleanupRef.current?.();
      initialSilentTrackRef.current = null;
    };
  }, []);

  // Global Audio Unlocker for browser autoplay policies
  const unlockAllAudio = useCallback(() => {
    Object.values(audioElementsRef.current).forEach((audio) => {
      if (audio.srcObject) {
        audio.muted = false;
        audio.volume = 1.0;
        if (audio.paused) {
          audio.play().catch(() => {});
        }
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

  // Aggregate connection state evaluator
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

  // Safe remote audio playback attached to active document layout tree
  const attachRemoteAudio = useCallback((targetId: string, stream: MediaStream) => {
    const container = getOrCreateAudioContainer();
    let audio = audioElementsRef.current[targetId];

    if (!audio || !container.contains(audio)) {
      audio = document.createElement("audio");
      audio.id = `remote-audio-${targetId}`;
      audio.autoplay = true;
      (audio as any).playsInline = true;
      audio.setAttribute("playsinline", "true");
      (audio as any).webkitPlaysInline = true;
      audio.muted = false;
      audio.volume = 1.0;
      container.appendChild(audio);
      audioElementsRef.current[targetId] = audio;
    }

    if (audio.srcObject !== stream) {
      audio.srcObject = stream;
    }

    audio.muted = false;
    audio.volume = 1.0;
    audio.play().catch((err) => {
      console.log(`[voice] Autoplay blocked for ${targetId} (${err.name}); will unlock on user interaction`);
    });
  }, []);

  // Remote audio analysis for speaking indicators
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

  // Cleanup single peer
  const cleanupPeer = useCallback(
    (targetId: string) => {
      // Remove remote audio element from DOM
      const audio = audioElementsRef.current[targetId];
      if (audio) {
        audio.pause();
        audio.srcObject = null;
        audio.remove();
        delete audioElementsRef.current[targetId];
      }

      // Stop remote audio analyser
      const remoteAnalyser = remoteAnalysersRef.current[targetId];
      if (remoteAnalyser) {
        cancelAnimationFrame(remoteAnalyser.animFrame);
        delete remoteAnalysersRef.current[targetId];
      }

      // Close RTCPeerConnection
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
    },
    [updateAggregateState]
  );

  // Cleanup all connections on unmount
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

  // Setup single Peer Connection with W3C Perfect Negotiation
  const createPC = useCallback(
    (targetId: string, targetName: string): RTCPeerConnection => {
      if (pcRef.current[targetId]) return pcRef.current[targetId];

      peerNamesRef.current[targetId] = targetName;
      makingOfferRef.current[targetId] = false;
      ignoreOfferRef.current[targetId] = false;
      isSettingRemoteAnswerPendingRef.current[targetId] = false;
      iceCandidateQueueRef.current[targetId] = [];

      const pc = new RTCPeerConnection({
        iceServers: DEFAULT_ICE_SERVERS,
        iceCandidatePoolSize: 2,
      });

      // Perfect Negotiation: Polite peer is deterministically decided by socket IDs
      const isPolite = socket.id > targetId;

      // Attach audio track: use active mic track if unmuted, or silent dummy track
      // to ensure SDP always carries m=audio with a=sendrecv
      const trackToAttach =
        (localStreamRef.current && localStreamRef.current.getAudioTracks()[0]) ||
        initialSilentTrackRef.current;

      if (trackToAttach) {
        try {
          const sender = pc.addTrack(trackToAttach, new MediaStream([trackToAttach]));
          sendersRef.current[targetId] = sender;
        } catch (e) {
          console.warn("[voice] addTrack error, adding transceiver fallback:", e);
          const transceiver = pc.addTransceiver("audio", { direction: "sendrecv" });
          sendersRef.current[targetId] = transceiver.sender;
        }
      } else {
        const transceiver = pc.addTransceiver("audio", { direction: "sendrecv" });
        sendersRef.current[targetId] = transceiver.sender;
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

        remoteTrack.enabled = true;
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
          } catch {}
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

    // Join voice signaling room
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
              console.warn("[voice] Error adding queued candidate:", candErr);
            }
          }

          if (desc.type === "offer") {
            // Answer
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

    // Auto-recover on network changes (WiFi -> Mobile data, sleep/wake)
    const onOnline = () => {
      console.log("[voice] Network online detected. Restarting ICE on all connections...");
      socket.emit("voice:join", { sessionId, userName });
      Object.values(pcRef.current).forEach((pc) => {
        try {
          pc.restartIce();
        } catch {}
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
            const stream = await navigator.mediaDevices.getUserMedia({
              audio: getAudioConstraints(),
            });
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

            // Attach to all active peer connections via replaceTrack
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

  // Audio Diagnostics Exporter (Requirement 7)
  useEffect(() => {
    if (typeof window !== "undefined") {
      (window as any).__COACT_VOICE_DIAGNOSTICS__ = {
        getDiagnostics: async () => {
          const report: Record<string, any> = {};
          for (const [targetId, pc] of Object.entries(pcRef.current)) {
            const stats = await pc.getStats();
            let bytesReceived = 0;
            let bytesSent = 0;
            let packetsLost = 0;
            let jitter = 0;
            let selectedCandidatePair: any = null;

            stats.forEach((stat) => {
              if (stat.type === "inbound-rtp" && stat.kind === "audio") {
                bytesReceived = stat.bytesReceived || 0;
                packetsLost = stat.packetsLost || 0;
                jitter = stat.jitter || 0;
              }
              if (stat.type === "outbound-rtp" && stat.kind === "audio") {
                bytesSent = stat.bytesSent || 0;
              }
              if (stat.type === "candidate-pair" && (stat.selected || stat.nominated)) {
                selectedCandidatePair = {
                  state: stat.state,
                  currentRoundTripTime: stat.currentRoundTripTime,
                };
              }
            });

            report[targetId] = {
              name: peerNamesRef.current[targetId],
              connectionState: pc.connectionState,
              iceConnectionState: pc.iceConnectionState,
              signalingState: pc.signalingState,
              iceGatheringState: pc.iceGatheringState,
              bytesReceived,
              bytesSent,
              packetsLost,
              jitter,
              selectedCandidatePair,
            };
          }
          return report;
        },
      };
    }
  }, []);

  return {
    peers,
    localStream,
    isSpeaking,
    voiceState,
  };
}
