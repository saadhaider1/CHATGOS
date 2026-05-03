import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatService } from '../../services/chat.service';
import { CallService } from '../../services/call.service';
import { CallModalComponent } from '../call-modal/call-modal.component';
import { Message } from '../../models/chat.model';

@Component({
  selector: 'app-chat-window',
  standalone: true,
  imports: [CommonModule, FormsModule, CallModalComponent],
  templateUrl: './chat-window.component.html',
  styleUrl: './chat-window.component.css'
})
export class ChatWindowComponent implements OnInit, OnDestroy {
  @ViewChild(CallModalComponent) callModal!: CallModalComponent;
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  @ViewChild('imageInput') imageInput!: ElementRef<HTMLInputElement>;
  
  messages: Message[] = [];
  currentUserId = 'user1';
  recipientId = 'user2';
  recipientName = 'Devi K';
  recipientAvatar = 'https://api.dicebear.com/7.x/avataaars/svg?seed=Devi';
  messageContent = '';
  isTyping = false;
  
  // File upload preview
  selectedFile: File | null = null;
  selectedImage: string | null = null;
  isUploading = false;
  
  // Emoji picker
  showEmojiPicker = false;
  commonEmojis = ['😀', '😂', '😍', '🤔', '😢', '😡', '👍', '👎', '❤️', '🎉', '🔥', '👋', '🙏', '💪', '🤝', '🚀', '💯', '⭐', '🎵', '📎'];

  constructor(
    private chatService: ChatService,
    private callService: CallService
  ) {}

  ngOnInit() {
    this.chatService.join(this.currentUserId);
    this.chatService.getMessages().subscribe((message) => {
      this.messages.push(message);
    });
    
    this.chatService.getTypingUpdates().subscribe((data) => {
      if (data.senderId === this.recipientId) {
        this.isTyping = data.isTyping;
      }
    });
  }

  ngOnDestroy() {
    this.chatService.sendTyping(this.currentUserId, this.recipientId, false);
  }

  sendMessage() {
    if (this.messageContent.trim()) {
      const message: Message = {
        sender: this.currentUserId,
        recipient: this.recipientId,
        content: this.messageContent,
        type: 'text',
        createdAt: new Date()
      };
      this.chatService.sendMessage(message);
      this.messageContent = '';
      this.chatService.sendTyping(this.currentUserId, this.recipientId, false);
    }
  }

  onTyping() {
    this.chatService.sendTyping(this.currentUserId, this.recipientId, true);
  }

  getSenderId(msg: Message): string {
    if (typeof msg.sender === 'string') {
      return msg.sender;
    }
    return msg.sender._id || '';
  }

  isFromMe(msg: Message): boolean {
    return this.getSenderId(msg) === this.currentUserId;
  }

  // Start audio call
  startAudioCall() {
    this.callModal.startOutgoingCall(this.recipientId, this.recipientName, 'audio');
  }

  // Start video call
  startVideoCall() {
    this.callModal.startOutgoingCall(this.recipientId, this.recipientName, 'video');
  }

  // ========== FILE UPLOAD ==========
  triggerFileInput() {
    this.fileInput.nativeElement.click();
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.selectedFile = input.files[0];
      this.uploadFile(this.selectedFile, 'file');
    }
  }

  // ========== IMAGE UPLOAD ==========
  triggerImageInput() {
    this.imageInput.nativeElement.click();
  }

  onImageSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      
      // Preview
      const reader = new FileReader();
      reader.onload = (e) => {
        this.selectedImage = e.target?.result as string;
      };
      reader.readAsDataURL(file);
      
      this.uploadFile(file, 'image');
    }
  }

  // ========== UPLOAD FILE/IMAGE ==========
  uploadFile(file: File, type: 'file' | 'image') {
    this.isUploading = true;
    
    this.chatService.uploadFile(file, type).subscribe({
      next: (response) => {
        this.isUploading = false;
        
        // Send message with file
        const message: Message = {
          sender: this.currentUserId,
          recipient: this.recipientId,
          content: type === 'image' ? '📷 Image' : `📎 ${file.name}`,
          type: type,
          fileUrl: response.fileUrl,
          fileName: response.fileName,
          fileSize: response.fileSize,
          createdAt: new Date()
        };
        
        this.chatService.sendMessage(message);
        
        // Clear selection
        this.selectedFile = null;
        this.selectedImage = null;
      },
      error: (error) => {
        this.isUploading = false;
        console.error('Upload error:', error);
        alert('Failed to upload file. Please try again.');
      }
    });
  }

  // ========== EMOJI PICKER ==========
  toggleEmojiPicker() {
    this.showEmojiPicker = !this.showEmojiPicker;
  }

  addEmoji(emoji: string) {
    this.messageContent += emoji;
    this.showEmojiPicker = false;
  }

  closeEmojiPicker() {
    this.showEmojiPicker = false;
  }

  // Format file size
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Open image in new tab
  openImage(url: string | undefined) {
    if (url) {
      window.open(url, '_blank');
    }
  }
}
