import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profile.page.html',
  styleUrl: './profile.page.css'
})
export class ProfilePageComponent implements OnInit {
  user: any = null;
  username = '';
  email = '';
  avatar = '';
  selectedFile: File | null = null;
  isLoading = false;
  successMessage = '';
  errorMessage = '';

  constructor(
    private authService: AuthService,
    private http: HttpClient,
    private router: Router
  ) {}

  ngOnInit() {
    this.user = this.authService.getCurrentUser();
    if (!this.user) {
      this.router.navigate(['/login']);
      return;
    }
    this.username = this.user.username || '';
    this.email = this.user.email || '';
    this.avatar = this.user.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=default';
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        this.errorMessage = 'Please select an image file';
        return;
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        this.errorMessage = 'File size should be less than 5MB';
        return;
      }
      this.selectedFile = file;
      this.errorMessage = '';
      
      // Preview the image
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.avatar = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  updateProfile() {
    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const token = this.authService.getToken();
    const formData = new FormData();
    formData.append('username', this.username);
    if (this.selectedFile) {
      formData.append('avatar', this.selectedFile);
    }

    this.http.put(`${environment.apiUrl}/api/user/profile`, formData, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }).subscribe({
      next: (response: any) => {
        this.isLoading = false;
        this.successMessage = 'Profile updated successfully!';
        
        // Update local storage with new user data
        if (response.user) {
          const updatedUser = { ...this.user, ...response.user };
          localStorage.setItem('user', JSON.stringify(updatedUser));
          this.user = updatedUser;
        }
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = error.error?.message || 'Failed to update profile';
      }
    });
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  goBack() {
    this.router.navigate(['/chat']);
  }
}
