import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import { ChatWindowComponent } from '../../components/chat-window/chat-window.component';
import { ChatListItemComponent } from '../../components/chat-list-item/chat-list-item.component';

@Component({
  selector: 'app-chat-page',
  standalone: true,
  imports: [
    CommonModule,
    SidebarComponent,
    ChatWindowComponent,
    ChatListItemComponent
  ],
  templateUrl: './chat.page.html',
  styleUrl: './chat.page.css'
})
export class ChatPageComponent {
  title = 'ChatGos';
}
