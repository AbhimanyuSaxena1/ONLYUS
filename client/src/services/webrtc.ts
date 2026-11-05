// OnlyUs WebRTC Peer-to-Peer Manager
export interface WebRtcCallbacks {
  onRemoteStream: (stream: MediaStream) => void;
  onIceCandidate: (candidate: RTCIceCandidate) => void;
  onConnectionStateChange: (state: RTCPeerConnectionState) => void;
  onError: (error: Error) => void;
}

export class WebRtcManager {
  private pc: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private callbacks: WebRtcCallbacks;
  private iceServers: RTCIceServer[];
  private queuedCandidates: RTCIceCandidateInit[] = [];
  private isRemoteDescriptionSet = false;
  private currentFacingMode: 'user' | 'environment' = 'user';

  constructor(callbacks: WebRtcCallbacks, iceServers: RTCIceServer[] = []) {
    this.callbacks = callbacks;
    this.iceServers = iceServers.length > 0 ? iceServers : [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
    ];
  }

  // 1. Get Local Media Stream
  async getLocalMedia(callType: 'video' | 'audio', facingMode: 'user' | 'environment' = 'user'): Promise<MediaStream> {
    this.currentFacingMode = facingMode;

    const constraints: MediaStreamConstraints = {
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      video: callType === 'video' ? {
        facingMode: { ideal: facingMode },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      } : false,
    };

    try {
      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      return this.localStream;
    } catch (err: any) {
      console.error('Failed to get media devices:', err);
      this.callbacks.onError(err);
      throw err;
    }
  }

  // 2. Initialize Peer Connection
  initPeerConnection(): RTCPeerConnection {
    if (this.pc) {
      this.close();
    }

    this.isRemoteDescriptionSet = false;
    this.queuedCandidates = [];
    this.remoteStream = new MediaStream();

    this.pc = new RTCPeerConnection({
      iceServers: this.iceServers,
      iceCandidatePoolSize: 10,
    });

    // Add local tracks to peer connection
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        if (this.pc && this.localStream) {
          this.pc.addTrack(track, this.localStream);
        }
      });
    }

    // Handle incoming remote tracks
    this.pc.ontrack = (event) => {
      console.log('[WebRTC] Received remote track:', event.track.kind);
      if (event.streams && event.streams[0]) {
        this.remoteStream = event.streams[0];
      } else if (this.remoteStream) {
        this.remoteStream.addTrack(event.track);
      }

      if (this.remoteStream) {
        // Create new MediaStream reference so React state and video srcObject update immediately
        const streamClone = new MediaStream(this.remoteStream.getTracks());
        this.callbacks.onRemoteStream(streamClone);
      }
    };

    // Handle ICE candidates
    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.callbacks.onIceCandidate(event.candidate);
      }
    };

    // Connection state changes
    this.pc.onconnectionstatechange = () => {
      if (this.pc) {
        console.log('[WebRTC] Connection state:', this.pc.connectionState);
        this.callbacks.onConnectionStateChange(this.pc.connectionState);

        if (this.pc.connectionState === 'failed') {
          this.restartIce();
        }
      }
    };

    this.pc.oniceconnectionstatechange = () => {
      if (this.pc) {
        console.log('[WebRTC] ICE connection state:', this.pc.iceConnectionState);
      }
    };

    return this.pc;
  }

  // 3. Create and Send Offer
  async createOffer(): Promise<RTCSessionDescriptionInit> {
    if (!this.pc) this.initPeerConnection();
    const offer = await this.pc!.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: true,
    });
    await this.pc!.setLocalDescription(offer);
    return offer;
  }

  // 4. Handle Offer and Create Answer
  async handleOffer(offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
    if (!this.pc) this.initPeerConnection();

    if (this.pc!.signalingState !== 'stable') {
      try {
        await this.pc!.setLocalDescription({ type: 'rollback' });
      } catch (e) {}
    }

    await this.pc!.setRemoteDescription(new RTCSessionDescription(offer));
    this.isRemoteDescriptionSet = true;
    await this.processQueuedCandidates();

    const answer = await this.pc!.createAnswer();
    await this.pc!.setLocalDescription(answer);
    return answer;
  }

  // 5. Handle Answer
  async handleAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
    if (!this.pc) return;

    if (this.pc.signalingState === 'have-local-offer') {
      await this.pc.setRemoteDescription(new RTCSessionDescription(answer));
      this.isRemoteDescriptionSet = true;
      await this.processQueuedCandidates();
    }
  }

  // 6. Handle Incoming ICE Candidate
  async addIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    if (!this.pc) return;

    if (!this.isRemoteDescriptionSet || !this.pc.remoteDescription) {
      this.queuedCandidates.push(candidate);
      return;
    }

    try {
      await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (err) {
      console.warn('[WebRTC] Error adding ICE candidate:', err);
    }
  }

  private async processQueuedCandidates(): Promise<void> {
    if (!this.pc) return;
    while (this.queuedCandidates.length > 0) {
      const candidate = this.queuedCandidates.shift();
      if (candidate) {
        try {
          await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.warn('[WebRTC] Error adding queued ICE candidate:', err);
        }
      }
    }
  }

  // 7. Real Microphone Mute/Unmute
  setMicrophoneMuted(isMuted: boolean): boolean {
    if (!this.localStream) return isMuted;
    const audioTracks = this.localStream.getAudioTracks();
    audioTracks.forEach((track) => {
      track.enabled = !isMuted;
    });
    return isMuted;
  }

  // 8. Real Camera On/Off
  setCameraDisabled(isDisabled: boolean): boolean {
    if (!this.localStream) return isDisabled;
    const videoTracks = this.localStream.getVideoTracks();
    videoTracks.forEach((track) => {
      track.enabled = !isDisabled;
    });
    return isDisabled;
  }

  // 9. Switch Mobile Camera (Front <-> Back) with replaceTrack
  async switchCamera(): Promise<'user' | 'environment'> {
    if (!this.localStream || !this.pc) return this.currentFacingMode;

    const newFacingMode = this.currentFacingMode === 'user' ? 'environment' : 'user';

    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { exact: newFacingMode } },
      });

      const newVideoTrack = newStream.getVideoTracks()[0];
      const sender = this.pc.getSenders().find((s) => s.track && s.track.kind === 'video');

      if (sender) {
        await sender.replaceTrack(newVideoTrack);
      }

      // Stop old video track
      const oldVideoTrack = this.localStream.getVideoTracks()[0];
      if (oldVideoTrack) {
        oldVideoTrack.stop();
        this.localStream.removeTrack(oldVideoTrack);
      }

      this.localStream.addTrack(newVideoTrack);
      this.currentFacingMode = newFacingMode;
      return newFacingMode;
    } catch (err) {
      console.warn('Exact camera switch failed, trying ideal switch:', err);
      try {
        const newStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: newFacingMode } },
        });
        const newVideoTrack = newStream.getVideoTracks()[0];
        const sender = this.pc.getSenders().find((s) => s.track && s.track.kind === 'video');
        if (sender) {
          await sender.replaceTrack(newVideoTrack);
        }
        const oldVideoTrack = this.localStream.getVideoTracks()[0];
        if (oldVideoTrack) {
          oldVideoTrack.stop();
          this.localStream.removeTrack(oldVideoTrack);
        }
        this.localStream.addTrack(newVideoTrack);
        this.currentFacingMode = newFacingMode;
        return newFacingMode;
      } catch (fallbackErr) {
        console.error('Camera switch failed completely', fallbackErr);
        return this.currentFacingMode;
      }
    }
  }

  // 10. ICE Restart for Reconnections
  async restartIce(): Promise<RTCSessionDescriptionInit | null> {
    if (!this.pc) return null;
    try {
      console.log('[WebRTC] Initiating ICE restart...');
      const offer = await this.pc.createOffer({ iceRestart: true });
      await this.pc.setLocalDescription(offer);
      return offer;
    } catch (err) {
      console.error('[WebRTC] ICE restart error:', err);
      return null;
    }
  }

  // 11. Cleanup all streams and peer connection
  close(): void {
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }

    if (this.remoteStream) {
      this.remoteStream.getTracks().forEach((track) => track.stop());
      this.remoteStream = null;
    }

    if (this.pc) {
      this.pc.onicecandidate = null;
      this.pc.ontrack = null;
      this.pc.onconnectionstatechange = null;
      this.pc.close();
      this.pc = null;
    }

    this.queuedCandidates = [];
    this.isRemoteDescriptionSet = false;
  }
}
