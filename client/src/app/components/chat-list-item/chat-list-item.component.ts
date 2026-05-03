import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatService } from '../../services/chat.service';

interface StatusUpdate {
  userId: string;
  status: string;
}

@Component({
  selector: 'app-chat-list-item',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './chat-list-item.component.html',
  styleUrl: './chat-list-item.component.css'
})
export class ChatListItemComponent implements OnInit {
  recipientId = 'user2';
  isOnline = false;

  constructor(private chatService: ChatService) {}

  ngOnInit() {
    this.chatService.getUserStatusUpdates().subscribe((data: StatusUpdate) => {
      if (data.userId === this.recipientId) {
        this.isOnline = data.status === 'online';
      }
    });
  }
}
