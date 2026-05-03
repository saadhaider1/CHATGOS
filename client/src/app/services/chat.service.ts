import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { io, Socket } from 'socket.io-client';
import { Observable, Subject } from 'rxjs';
import { Message, User } from '../models/chat.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private socket: Socket;
  private apiUrl = `${environment.apiUrl}/api`;
  private messageSubject = new Subject<Message>();
  private statusSubject = new Subject<{userId: string, status: string}>();
  private typingSubject = new Subject<{senderId: string, isTyping: boolean}>();

  constructor(private http: HttpClient) {
    this.socket = io(environment.socketUrl);
    
    this.socket.on('receive_message', (message: Message) => {
      this.messageSubject.next(message);
    });

    this.socket.on('user_status', (data: {userId: string, status: string}) => {
      this.statusSubject.next(data);
    });

    this.socket.on('user_typing', (data: {senderId: string, isTyping: boolean}) => {
      this.typingSubject.next(data);
    });
  }

  join(userId: string) {
    this.socket.emit('join', userId);
  }

  sendMessage(message: Message) {
    this.socket.emit('send_message', message);
  }

  sendTyping(senderId: string, recipientId: string, isTyping: boolean) {
    this.socket.emit('typing', { senderId, recipientId, isTyping });
  }

  getMessages(): Observable<Message> {
    return this.messageSubject.asObservable();
  }

  getStatusUpdates(): Observable<{userId: string, status: string}> {
    return this.statusSubject.asObservable();
  }

  getUserStatusUpdates(): Observable<{userId: string, status: string}> {
    return this.statusSubject.asObservable();
  }

  getTypingUpdates(): Observable<{senderId: string, isTyping: boolean}> {
    return this.typingSubject.asObservable();
  }

  updateStatus(userId: string, status: string) {
    this.socket.emit('update_status', { userId, status });
  }

  // Expose socket for call service
  getSocket(): Socket {
    return this.socket;
  }

  // Upload file/image
  uploadFile(file: File, type: 'image' | 'file'): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);
    return this.http.post(`${this.apiUrl}/upload`, formData);
  }
}
