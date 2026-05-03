import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import { AuthService } from '../../services/auth.service';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent],
  templateUrl: './settings.page.html',
  styleUrl: './settings.page.css'
})
export class SettingsPageComponent implements OnInit {
  user: any = null;
  
  // Settings
  notifications = {
    messages: true,
    friendRequests: true,
    mentions: true,
    sounds: true
  };
  
  privacy = {
    showOnlineStatus: true,
    allowFriendRequests: true,
    profileVisible: true
  };
  
  appearance = {
    darkMode: false,
    compactView: false
  };

  constructor(
    private authService: AuthService,
    private router: Router,
    private themeService: ThemeService
  ) {}

  ngOnInit() {
    this.user = this.authService.getCurrentUser();
    if (!this.user) {
      this.router.navigate(['/login']);
      return;
    }
    
    // Load saved settings from localStorage
    const savedSettings = localStorage.getItem('userSettings');
    if (savedSettings) {
      const settings = JSON.parse(savedSettings);
      this.notifications = settings.notifications || this.notifications;
      this.privacy = settings.privacy || this.privacy;
      this.appearance = settings.appearance || this.appearance;
    }
  }

  onDarkModeChange() {
    this.themeService.setDarkMode(this.appearance.darkMode);
  }

  onCompactViewChange() {
    this.themeService.setCompactView(this.appearance.compactView);
  }

  saveSettings() {
    const settings = {
      notifications: this.notifications,
      privacy: this.privacy,
      appearance: this.appearance
    };
    localStorage.setItem('userSettings', JSON.stringify(settings));
    
    // Apply theme changes immediately
    this.themeService.setDarkMode(this.appearance.darkMode);
    this.themeService.setCompactView(this.appearance.compactView);
    
    alert('Settings saved successfully!');
  }

  goToProfile() {
    this.router.navigate(['/profile']);
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
