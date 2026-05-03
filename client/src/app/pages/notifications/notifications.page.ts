import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';

interface Notification {
  id: string;
  type: 'message' | 'friend_request' | 'system';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  avatar?: string;
}

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule, SidebarComponent],
  templateUrl: './notifications.page.html',
  styleUrl: './notifications.page.css'
})
export class NotificationsPageComponent implements OnInit {
  notifications: Notification[] = [
    {
      id: '1',
      type: 'message',
      title: 'New Message',
      message: 'Sarah Johnson sent you a message',
      timestamp: new Date(Date.now() - 300000),
      read: false,
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah'
    },
    {
      id: '2',
      type: 'friend_request',
      title: 'Friend Request',
      message: 'Mike Chen wants to add you as a friend',
      timestamp: new Date(Date.now() - 3600000),
      read: false,
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mike'
    },
    {
      id: '3',
      type: 'system',
      title: 'Welcome!',
      message: 'Thanks for joining ChatGos. Start chatting now!',
      timestamp: new Date(Date.now() - 86400000),
      read: true
    }
  ];

  constructor(private router: Router) {}

  ngOnInit() {}

  get unreadCount(): number {
    return this.notifications.filter(n => !n.read).length;
  }

  markAsRead(notification: Notification) {
    notification.read = true;
  }

  markAllAsRead() {
    this.notifications.forEach(n => n.read = true);
  }

  deleteNotification(notification: Notification, event: Event) {
    event.stopPropagation();
    this.notifications = this.notifications.filter(n => n.id !== notification.id);
  }

  getTimeAgo(timestamp: Date): string {
    const now = new Date();
    const diff = now.getTime() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  }

  getIcon(type: string): string {
    switch (type) {
      case 'message': return '💬';
      case 'friend_request': return '👋';
      case 'system': return '🔔';
      default: return '📢';
    }
  }
}
