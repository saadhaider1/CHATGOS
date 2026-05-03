import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ChatService } from '../../services/chat.service';
import { AuthService } from '../../services/auth.service';

interface StatusUpdate {
  userId: string;
  status: string;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css'
})
export class SidebarComponent implements OnInit {
  currentUserId = 'user1';
  isOnline = true;
  unreadCount = 2;
  userAvatar = 'https://api.dicebear.com/7.x/avataaars/svg?seed=Anil';
  currentRoute = '';

  navItems = [
    { icon: '💬', route: '/chat', label: 'Chat', active: true },
    { icon: '👥', route: '/contacts', label: 'Contacts', active: false },
    { icon: '🔔', route: '/notifications', label: 'Notifications', active: false },
    { icon: '⚙️', route: '/settings', label: 'Settings', active: false }
  ];

  constructor(
    private chatService: ChatService,
    private authService: AuthService,
    private router: Router
  ) {
    this.router.events.subscribe(() => {
      this.currentRoute = this.router.url;
      this.updateActiveNav();
    });
  }

  ngOnInit() {
    // Load user from auth service
    const user = this.authService.getCurrentUser();
    if (user) {
      this.userAvatar = user.avatar || this.userAvatar;
      this.currentUserId = user._id || this.currentUserId;
    }

    this.chatService.getUserStatusUpdates().subscribe((data: StatusUpdate) => {
      if (data.userId === this.currentUserId) {
        this.isOnline = data.status === 'online';
      }
    });
  }

  updateActiveNav() {
    this.navItems.forEach(item => {
      item.active = this.currentRoute === item.route;
    });
  }

  navigate(route: string) {
    this.router.navigate([route]);
  }

  toggleStatus() {
    this.isOnline = !this.isOnline;
    this.chatService.updateStatus(this.currentUserId, this.isOnline ? 'online' : 'offline');
  }

  goToProfile() {
    this.router.navigate(['/profile']);
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
