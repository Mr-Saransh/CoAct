import { useEffect, useRef, useState } from "react";

export function useVoiceChannel(sessionId: string, socket: any, userName: string, isEnabled: boolean) {
  const [peers, setPeers] = useState<Record<string, { stream: MediaStream; speaking: boolean }>>({});
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const pcRef = useRef<Record<string, RTCPeerConnection>>({});
  const localStreamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  useEffect(() => {
    if (!isEnabled || !socket || !sessionId) {
      // Clean up if disabled
      Object.values(pcRef.current).forEach(pc => pc.close());
      pcRef.current = {};
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => t.stop());
        localStreamRef.current = null;
        setLocalStream(null);
      }
      setPeers({});
      return;
    }

    const initVoice = async () => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.warn("MediaDevices API not available. Secure context (HTTPS) is required for voice.");
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        localStreamRef.current = stream;
        setLocalStream(stream);

        // Speaker detection for local
        const audioCtx = new AudioContext();
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 512;
        source.connect(analyser);
        analyserRef.current = analyser;

        const checkSpeaking = () => {
          if (!analyserRef.current) return;
          const data = new Uint8Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getByteFrequencyData(data);
          const volume = data.reduce((a, b) => a + b) / data.length;
          const speaking = volume > 20;
          setIsSpeaking(speaking);
          requestAnimationFrame(checkSpeaking);
        };
        checkSpeaking();

        // Join voice channel logic
        // We notify others that we are ready
        socket.emit("voice:join", { sessionId, userName });
      } catch (err) {
        console.error("Failed to get media", err);
      }
    };

    initVoice();

    const createPC = (targetId: string, targetName: string, isOfferer: boolean) => {
      if (pcRef.current[targetId]) return pcRef.current[targetId];

      const pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
      });

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit("voice:signal", {
            sessionId,
            targetId,
            signal: { candidate: event.candidate },
            callerId: socket.id,
            callerName: userName
          });
        }
      };

      pc.ontrack = (event) => {
        setPeers(prev => ({
          ...prev,
          [targetId]: { stream: event.streams[0], speaking: false }
        }));
      };

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => {
          pc.addTrack(track, localStreamRef.current!);
        });
      }

      pcRef.current[targetId] = pc;
      return pc;
    };

    socket.on("voice:join", ({ targetId, targetName }: any) => {
      // Someone joined, we (as the existing peer) create an offer
      const pc = createPC(targetId, targetName, true);
      pc.createOffer().then(offer => {
        pc.setLocalDescription(offer);
        socket.emit("voice:signal", {
          sessionId,
          targetId,
          signal: { sdp: offer },
          callerId: socket.id,
          callerName: userName
        });
      });
    });

    socket.on("voice:signal", async ({ signal, callerId, callerName }: any) => {
      let pc = pcRef.current[callerId];
      if (!pc) pc = createPC(callerId, callerName, false);

      if (signal.sdp) {
        await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        if (signal.sdp.type === "offer") {
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit("voice:signal", {
            sessionId,
            targetId: callerId,
            signal: { sdp: answer },
            callerId: socket.id,
            callerName: userName
          });
        }
      } else if (signal.candidate) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
        } catch (e) {
          console.error("Error adding ice candidate", e);
        }
      }
    });

    socket.on("voice:leave", (targetId: string) => {
      if (pcRef.current[targetId]) {
        pcRef.current[targetId].close();
        delete pcRef.current[targetId];
      }
      setPeers(prev => {
        const next = { ...prev };
        delete next[targetId];
        return next;
      });
    });

    return () => {
      socket.off("voice:join");
      socket.off("voice:signal");
      socket.off("voice:leave");
      Object.values(pcRef.current).forEach(pc => pc.close());
      pcRef.current = {};
    };
  }, [isEnabled, socket, sessionId, userName]);

  return { peers, localStream, isSpeaking };
}
