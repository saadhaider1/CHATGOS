import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import { AuthService } from '../../services/auth.service';

interface Contact {
  id: string;
  username: string;
  email: string;
  avatar: string;
  status: 'online' | 'offline';
  lastSeen?: Date;
}

interface User {
  _id: string;
  username: string;
  email: string;
  avatar: string;
  status: string;
}

@Component({
  selector: 'app-contacts',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent],
  templateUrl: './contacts.page.html',
  styleUrl: './contacts.page.css'
})
export class ContactsPageComponent implements OnInit {
  contacts: Contact[] = [
    { id: '1', username: 'Sarah Johnson', email: 'sarah@example.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah', status: 'online' },
    { id: '2', username: 'Mike Chen', email: 'mike@example.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mike', status: 'offline', lastSeen: new Date() },
    { id: '3', username: 'Emma Wilson', email: 'emma@example.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Emma', status: 'online' },
    { id: '4', username: 'James Brown', email: 'james@example.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=James', status: 'offline', lastSeen: new Date(Date.now() - 3600000) },
  ];
  
  searchEmail = '';
  searchResults: User[] = [];
  isSearching = false;
  searchError = '';
  showAddFriendModal = false;
  successMessage = '';

  constructor(
    private router: Router,
    private http: HttpClient,
    private authService: AuthService
  ) {}

  ngOnInit() {}

  openAddFriendModal() {
    this.showAddFriendModal = true;
    this.searchEmail = '';
    this.searchResults = [];
    this.searchError = '';
    this.successMessage = '';
  }

  closeAddFriendModal() {
    this.showAddFriendModal = false;
  }

  searchByEmail() {
    if (!this.searchEmail.trim()) {
      this.searchError = 'Please enter an email address';
      return;
    }

    this.isSearching = true;
    this.searchError = '';
    this.searchResults = [];

    const token = this.authService.getToken();
    
    this.http.get(`http://localhost:5004/api/user/search?email=${encodeURIComponent(this.searchEmail)}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).subscribe({
      next: (response: any) => {
        this.isSearching = false;
        if (response.users && response.users.length > 0) {
          this.searchResults = response.users;
        } else {
          this.searchError = 'No user found with this email';
        }
      },
      error: (error) => {
        this.isSearching = false;
        this.searchError = error.error?.message || 'Search failed';
      }
    });
  }

  addFriend(user: User) {
    const token = this.authService.getToken();
    
    this.http.post('http://localhost:5004/api/friends/request', 
      { friendId: user._id },
      { headers: { 'Authorization': `Bearer ${token}` } }
    ).subscribe({
      next: () => {
        this.successMessage = `Friend request sent to ${user.username}!`;
        this.searchResults = this.searchResults.filter(u => u._id !== user._id);
        setTimeout(() => {
          this.closeAddFriendModal();
        }, 2000);
      },
      error: (error) => {
        this.searchError = error.error?.message || 'Failed to send friend request';
      }
    });
  }

  startChat(contact: Contact) {
    this.router.navigate(['/chat']);
  }

  getInitials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }
}
