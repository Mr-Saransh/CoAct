import { useEffect, useRef, useState, useCallback } from "react";

const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
  { urls: "stun:stun3.l.google.com:19302" },
  { urls: "stun:stun4.l.google.com:19302" },
];

const AUDIO_CONSTRAINTS: MediaTrackConstraints = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
  sampleRate: 48000,
  channelCount: 1,
};

export function useVoiceChannel(
  sessionId: string,
  socket: any,
  userName: string,
  isMicOn: boolean
) {
  const [peers, setPeers] = useState<Record<string, { stream: MediaStream; speaking: boolean; name: string }>>({});
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const pcRef = useRef<Record<string, RTCPeerConnection>>({});
  const localStreamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const animFrameRef = useRef<number>(0);
  const makingOfferRef = useRef<Record<string, boolean>>({});
  const peerNamesRef = useRef<Record<string, string>>({});
  const sendersRef = useRef<Record<string, RTCRtpSender[]>>({});
  const signalingLockRef = useRef<Record<string, boolean>>({});

  const cleanupPeer = useCallback((targetId: string) => {
    if (pcRef.current[targetId]) {
      pcRef.current[targetId].close();
      delete pcRef.current[targetId];
    }
    delete makingOfferRef.current[targetId];
    delete peerNamesRef.current[targetId];
    delete sendersRef.current[targetId];
    setPeers((prev) => {
      const next = { ...prev };
      delete next[targetId];
      return next;
    });
  }, []);

  const cleanupAll = useCallback(() => {
    cancelAnimationFrame(animFrameRef.current);
    Object.keys(pcRef.current).forEach(cleanupPeer);
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
    setPeers({});
    setIsSpeaking(false);
  }, [cleanupPeer]);

  // Establish WebRTC connections as long as we are in the session
  useEffect(() => {
    if (!socket || !sessionId) return;

    let mounted = true;

    const createPC = (targetId: string, targetName: string): RTCPeerConnection => {
      if (pcRef.current[targetId]) return pcRef.current[targetId];
      peerNamesRef.current[targetId] = targetName;

      const pc = new RTCPeerConnection({
        iceServers: ICE_SERVERS,
        iceCandidatePoolSize: 5,
      });

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit("voice:signal", {
            sessionId,
            targetId,
            signal: { candidate: event.candidate },
            callerId: socket.id,
            callerName: userName,
          });
        }
      };

      pc.ontrack = (event) => {
        if (!mounted) return;
        const stream = event.streams[0];
        if (stream) {
          setPeers((prev) => ({
            ...prev,
            [targetId]: {
              stream,
              speaking: false,
              name: peerNamesRef.current[targetId] || targetName,
            },
          }));
        }
      };

      pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === "failed") pc.restartIce();
      };

      pc.onnegotiationneeded = async () => {
        if (signalingLockRef.current[targetId]) return;
        try {
          signalingLockRef.current[targetId] = true;
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
          console.error("Negotiation error:", err);
        } finally {
          makingOfferRef.current[targetId] = false;
          signalingLockRef.current[targetId] = false;
        }
      };

      // Add existing local tracks if any
      if (localStreamRef.current) {
        sendersRef.current[targetId] = localStreamRef.current.getTracks().map(track => 
          pc.addTrack(track, localStreamRef.current!)
        );
      }

      pcRef.current[targetId] = pc;
      return pc;
    };

    // Join voice signaling room immediately
    socket.emit("voice:join", { sessionId, userName });

    const onVoiceJoin = async ({ targetId, targetName }: { targetId: string; targetName: string }) => {
      if (targetId === socket.id) return;
      createPC(targetId, targetName);
      // Negotiation will be triggered by onnegotiationneeded after createPC
    };

    const onVoiceSignal = async ({ signal, callerId, callerName }: { signal: any; callerId: string; callerName: string }) => {
      if (callerId === socket.id) return;
      let pc = pcRef.current[callerId];
      if (!pc) pc = createPC(callerId, callerName);

      try {
        if (signal.sdp) {
          const desc = new RTCSessionDescription(signal.sdp);
          const offerCollision = desc.type === "offer" && (makingOfferRef.current[callerId] || pc.signalingState !== "stable");

          if (offerCollision) {
            const isPolite = socket.id > callerId;
            if (!isPolite) return;
            
            signalingLockRef.current[callerId] = true;
            await Promise.all([
              pc.setLocalDescription({ type: "rollback" } as RTCSessionDescriptionInit),
              pc.setRemoteDescription(desc),
            ]);
          } else {
            signalingLockRef.current[callerId] = true;
            await pc.setRemoteDescription(desc);
          }

          if (desc.type === "offer") {
            await pc.setLocalDescription();
            socket.emit("voice:signal", {
              sessionId,
              targetId: callerId,
              signal: { sdp: pc.localDescription },
              callerId: socket.id,
              callerName: userName,
            });
          }
          signalingLockRef.current[callerId] = false;
        } else if (signal.candidate) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
          } catch (e) {}
        }
      } catch (err) {
        signalingLockRef.current[callerId] = false;
        if (pc.signalingState !== "closed") {
          console.error("Error in voice signal handler:", err);
        }
      }
    };

    const onVoiceLeave = (targetId: string) => cleanupPeer(targetId);

    socket.on("voice:join", onVoiceJoin);
    socket.on("voice:signal", onVoiceSignal);
    socket.on("voice:leave", onVoiceLeave);

    return () => {
      mounted = false;
      socket.off("voice:join", onVoiceJoin);
      socket.off("voice:signal", onVoiceSignal);
      socket.off("voice:leave", onVoiceLeave);
      cleanupAll();
    };
  }, [socket, sessionId, userName, cleanupAll, cleanupPeer]);

  // Local Microphone Management
  useEffect(() => {
    let mounted = true;

    const startMic = async () => {
      if (!navigator.mediaDevices?.getUserMedia) return;
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: AUDIO_CONSTRAINTS });
        if (!mounted) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }

        localStreamRef.current = stream;
        setLocalStream(stream);

        // Add tracks to all existing peer connections
        Object.entries(pcRef.current).forEach(([targetId, pc]) => {
          if (!sendersRef.current[targetId]) {
            sendersRef.current[targetId] = stream.getTracks().map(track => pc.addTrack(track, stream));
          }
        });

        // Setup local speaker detection
        const audioCtx = new AudioContext();
        audioCtxRef.current = audioCtx;
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 512;
        source.connect(analyser);
        analyserRef.current = analyser;

        const checkSpeaking = () => {
          if (!mounted || !analyserRef.current) return;
          const data = new Uint8Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getByteFrequencyData(data);
          const volume = data.reduce((a, b) => a + b, 0) / data.length;
          setIsSpeaking(volume > 15);
          animFrameRef.current = requestAnimationFrame(checkSpeaking);
        };
        checkSpeaking();
      } catch (err) {
        console.error("Failed to get microphone:", err);
      }
    };

    const stopMic = () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => t.stop());
        localStreamRef.current = null;
        setLocalStream(null);
      }
      // Remove tracks from all PCs
      Object.entries(pcRef.current).forEach(([targetId, pc]) => {
        if (sendersRef.current[targetId]) {
          sendersRef.current[targetId].forEach(sender => {
            try { pc.removeTrack(sender); } catch(e) {}
          });
          delete sendersRef.current[targetId];
        }
      });
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
      }
      analyserRef.current = null;
      setIsSpeaking(false);
    };

    if (isMicOn) {
      startMic();
    } else {
      stopMic();
    }

    return () => {
      mounted = false;
    };
  }, [isMicOn]);

  return { peers, localStream, isSpeaking };
}
