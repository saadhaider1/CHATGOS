import { Injectable } from '@angular/core';
import { Subject, Observable } from 'rxjs';
import { ChatService } from './chat.service';
import { AuthService } from './auth.service';

// SimplePeer will be loaded dynamically
declare var SimplePeer: any;

export interface CallData {
  callerId: string;
  callerName: string;
  callerAvatar?: string;
  recipientId: string;
  type: 'audio' | 'video';
  signal?: any;
}

@Injectable({
  providedIn: 'root'
})
export class CallService {
  private peer: any;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  
  private incomingCallSubject = new Subject<CallData>();
  private callAcceptedSubject = new Subject<void>();
  private callRejectedSubject = new Subject<string>();
  private callEndedSubject = new Subject<void>();
  private remoteStreamSubject = new Subject<MediaStream>();
  private localStreamSubject = new Subject<MediaStream>();
  private signalSubject = new Subject<any>();
  private callStartedSubject = new Subject<void>();

  public incomingCall$ = this.incomingCallSubject.asObservable();
  public callAccepted$ = this.callAcceptedSubject.asObservable();
  public callRejected$ = this.callRejectedSubject.asObservable();
  public callEnded$ = this.callEndedSubject.asObservable();
  public remoteStream$ = this.remoteStreamSubject.asObservable();
  public localStream$ = this.localStreamSubject.asObservable();
  public signal$ = this.signalSubject.asObservable();
  public callStarted$ = this.callStartedSubject.asObservable();

  private currentCall: CallData | null = null;
  private isInitiator = false;

  constructor(
    private chatService: ChatService,
    private authService: AuthService
  ) {
    this.setupSocketListeners();
  }

  private setupSocketListeners() {
    // Listen for incoming calls
    this.chatService.getSocket().on('incoming_call', (data: CallData) => {
      console.log('Incoming call:', data);
      this.currentCall = data;
      this.incomingCallSubject.next(data);
    });

    // Listen for call accepted
    this.chatService.getSocket().on('call_accepted', (data: { signal: any }) => {
      console.log('Call accepted, receiving signal');
      if (this.peer) {
        this.peer.signal(data.signal);
      }
      this.callAcceptedSubject.next();
      this.callStartedSubject.next();
    });

    // Listen for call rejected
    this.chatService.getSocket().on('call_rejected', (data: { reason: string }) => {
      console.log('Call rejected:', data.reason);
      this.cleanup();
      this.callRejectedSubject.next(data.reason);
    });

    // Listen for call ended
    this.chatService.getSocket().on('call_ended', () => {
      console.log('Call ended by remote user');
      this.cleanup();
      this.callEndedSubject.next();
    });

    // Listen for ICE candidates/signaling
    this.chatService.getSocket().on('call_signal', (data: { signal: any }) => {
      if (this.peer) {
        this.peer.signal(data.signal);
      }
    });
  }

  // Start an outgoing call
  async startCall(recipientId: string, recipientName: string, type: 'audio' | 'video'): Promise<void> {
    try {
      this.isInitiator = true;
      const currentUser = this.authService.getCurrentUser();
      
      // Get media stream
      this.localStream = await this.getMediaStream(type);
      this.localStreamSubject.next(this.localStream);

      // Create peer connection
      this.peer = new SimplePeer({
        initiator: true,
        trickle: false,
        stream: this.localStream,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
          ]
        }
      });

      this.setupPeerEvents(recipientId);

      // Store call info
      this.currentCall = {
        callerId: currentUser?._id || '',
        callerName: currentUser?.username || '',
        callerAvatar: currentUser?.avatar,
        recipientId,
        type
      };

    } catch (error) {
      console.error('Error starting call:', error);
      throw error;
    }
  }

  // Accept an incoming call
  async acceptCall(callData: CallData): Promise<void> {
    try {
      this.isInitiator = false;
      this.currentCall = callData;

      // Get media stream
      this.localStream = await this.getMediaStream(callData.type);
      this.localStreamSubject.next(this.localStream);

      // Create peer connection (not initiator)
      this.peer = new SimplePeer({
        initiator: false,
        trickle: false,
        stream: this.localStream,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
          ]
        }
      });

      this.setupPeerEvents(callData.callerId);

      // Signal back to caller
      this.peer.on('signal', (signal: any) => {
        this.chatService.getSocket().emit('accept_call', {
          to: callData.callerId,
          signal
        });
      });

      // Signal the incoming data
      if (callData.signal) {
        this.peer.signal(callData.signal);
      }

      this.callAcceptedSubject.next();
      this.callStartedSubject.next();

    } catch (error) {
      console.error('Error accepting call:', error);
      throw error;
    }
  }

  // Reject an incoming call
  rejectCall(reason: string = 'User declined') {
    if (this.currentCall) {
      this.chatService.getSocket().emit('reject_call', {
        to: this.currentCall.callerId,
        reason
      });
    }
    this.cleanup();
  }

  // End an active call
  endCall() {
    if (this.currentCall) {
      const targetId = this.isInitiator ? this.currentCall.recipientId : this.currentCall.callerId;
      this.chatService.getSocket().emit('end_call', {
        to: targetId
      });
    }
    this.cleanup();
    this.callEndedSubject.next();
  }

  // Toggle mute
  toggleMute(mute: boolean) {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = !mute;
      });
    }
  }

  // Toggle video
  toggleVideo(enable: boolean) {
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach(track => {
        track.enabled = enable;
      });
    }
  }

  // Switch camera
  async switchCamera() {
    if (!this.localStream) return;
    
    const videoTrack = this.localStream.getVideoTracks()[0];
    if (!videoTrack) return;

    // Stop current track
    videoTrack.stop();

    // Get new stream with switched camera
    const newStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' },
      audio: true
    });

    const newVideoTrack = newStream.getVideoTracks()[0];
    
    // Replace track in peer connection
    if (this.peer && this.peer.replaceTrack) {
      this.peer.replaceTrack(videoTrack, newVideoTrack, this.localStream);
    }
  }

  private setupPeerEvents(targetId: string) {
    // When signal is ready (offer/answer)
    this.peer.on('signal', (signal: any) => {
      console.log('Signal generated:', signal.type);
      
      if (this.isInitiator) {
        // Send initial offer
        this.chatService.getSocket().emit('call_user', {
          to: targetId,
          signal,
          callerId: this.authService.getCurrentUser()?._id,
          callerName: this.authService.getCurrentUser()?.username,
          callerAvatar: this.authService.getCurrentUser()?.avatar,
          type: this.currentCall?.type
        });
      } else {
        // Send ICE candidates or other signals
        this.chatService.getSocket().emit('call_signal', {
          to: targetId,
          signal
        });
      }
      
      this.signalSubject.next(signal);
    });

    // When remote stream is received
    this.peer.on('stream', (stream: MediaStream) => {
      console.log('Received remote stream');
      this.remoteStream = stream;
      this.remoteStreamSubject.next(stream);
    });

    // Connection established
    this.peer.on('connect', () => {
      console.log('Peer connection established');
    });

    // Handle errors
    this.peer.on('error', (err: any) => {
      console.error('Peer error:', err);
      this.cleanup();
    });

    // Handle close
    this.peer.on('close', () => {
      console.log('Peer connection closed');
      this.cleanup();
    });
  }

  private async getMediaStream(type: 'audio' | 'video'): Promise<MediaStream> {
    const constraints: MediaStreamConstraints = {
      audio: true,
      video: type === 'video' ? {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: 'user'
      } : false
    };

    try {
      return await navigator.mediaDevices.getUserMedia(constraints);
    } catch (error) {
      console.error('Error accessing media devices:', error);
      
      // Fallback: try audio only if video fails
      if (type === 'video') {
        console.log('Falling back to audio only');
        return await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      }
      
      throw error;
    }
  }

  private cleanup() {
    // Stop all tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }

    // Close peer connection
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }

    this.remoteStream = null;
    this.currentCall = null;
    this.isInitiator = false;
  }

  getCurrentCall(): CallData | null {
    return this.currentCall;
  }

  isCallActive(): boolean {
    return !!this.peer;
  }
}
