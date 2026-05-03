import { Component, OnInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CallService, CallData } from '../../services/call.service';
import { Subscription } from 'rxjs';

type CallState = 'idle' | 'incoming' | 'outgoing' | 'connected';

@Component({
  selector: 'app-call-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './call-modal.component.html',
  styleUrl: './call-modal.component.css'
})
export class CallModalComponent implements OnInit, OnDestroy {
  @ViewChild('localVideo') localVideoRef!: ElementRef<HTMLVideoElement>;
  @ViewChild('remoteVideo') remoteVideoRef!: ElementRef<HTMLVideoElement>;

  callState: CallState = 'idle';
  currentCall: CallData | null = null;
  callDuration = 0;
  callTimer: any;
  
  isMuted = false;
  isVideoOff = false;

  private subscriptions: Subscription[] = [];

  constructor(private callService: CallService) {}

  ngOnInit() {
    // Subscribe to incoming calls
    this.subscriptions.push(
      this.callService.incomingCall$.subscribe((callData) => {
        this.currentCall = callData;
        this.callState = 'incoming';
      })
    );

    // Subscribe to call accepted
    this.subscriptions.push(
      this.callService.callAccepted$.subscribe(() => {
        this.callState = 'connected';
        this.startCallTimer();
      })
    );

    // Subscribe to call rejected
    this.subscriptions.push(
      this.callService.callRejected$.subscribe((reason) => {
        alert(`Call rejected: ${reason}`);
        this.resetState();
      })
    );

    // Subscribe to call ended
    this.subscriptions.push(
      this.callService.callEnded$.subscribe(() => {
        this.resetState();
      })
    );

    // Subscribe to local stream
    this.subscriptions.push(
      this.callService.localStream$.subscribe((stream) => {
        if (this.localVideoRef?.nativeElement) {
          this.localVideoRef.nativeElement.srcObject = stream;
        }
      })
    );

    // Subscribe to remote stream
    this.subscriptions.push(
      this.callService.remoteStream$.subscribe((stream) => {
        if (this.remoteVideoRef?.nativeElement) {
          this.remoteVideoRef.nativeElement.srcObject = stream;
        }
      })
    );

    // Subscribe to call started (outgoing connected)
    this.subscriptions.push(
      this.callService.callStarted$.subscribe(() => {
        this.callState = 'connected';
        this.startCallTimer();
      })
    );
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.clearCallTimer();
  }

  // Accept incoming call
  acceptCall() {
    if (this.currentCall) {
      this.callService.acceptCall(this.currentCall);
      this.callState = 'connected';
    }
  }

  // Reject incoming call
  rejectCall() {
    this.callService.rejectCall('User declined');
    this.resetState();
  }

  // End active call
  endCall() {
    this.callService.endCall();
    this.resetState();
  }

  // Toggle mute
  toggleMute() {
    this.isMuted = !this.isMuted;
    this.callService.toggleMute(this.isMuted);
  }

  // Toggle video
  toggleVideo() {
    this.isVideoOff = !this.isVideoOff;
    this.callService.toggleVideo(!this.isVideoOff);
    
    // Update local video visibility
    if (this.localVideoRef?.nativeElement) {
      this.localVideoRef.nativeElement.style.display = this.isVideoOff ? 'none' : 'block';
    }
  }

  // Switch camera (mobile)
  switchCamera() {
    this.callService.switchCamera();
  }

  private startCallTimer() {
    this.callDuration = 0;
    this.callTimer = setInterval(() => {
      this.callDuration++;
    }, 1000);
  }

  private clearCallTimer() {
    if (this.callTimer) {
      clearInterval(this.callTimer);
      this.callTimer = null;
    }
  }

  private resetState() {
    this.callState = 'idle';
    this.currentCall = null;
    this.clearCallTimer();
    this.callDuration = 0;
    this.isMuted = false;
    this.isVideoOff = false;
    
    // Clear video elements
    if (this.localVideoRef?.nativeElement) {
      this.localVideoRef.nativeElement.srcObject = null;
    }
    if (this.remoteVideoRef?.nativeElement) {
      this.remoteVideoRef.nativeElement.srcObject = null;
    }
  }

  formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  // Start an outgoing call (called from chat window)
  startOutgoingCall(recipientId: string, recipientName: string, type: 'audio' | 'video') {
    this.currentCall = {
      callerId: '', // Will be set by service
      callerName: recipientName,
      recipientId,
      type
    };
    this.callState = 'outgoing';
    
    this.callService.startCall(recipientId, recipientName, type).catch(err => {
      console.error('Failed to start call:', err);
      alert('Failed to start call. Please check camera/microphone permissions.');
      this.resetState();
    });
  }

  get isIncoming(): boolean {
    return this.callState === 'incoming';
  }

  get isOutgoing(): boolean {
    return this.callState === 'outgoing';
  }

  get isConnected(): boolean {
    return this.callState === 'connected';
  }

  get isVisible(): boolean {
    return this.callState !== 'idle';
  }

  get isVideoCall(): boolean {
    return this.currentCall?.type === 'video';
  }
}
