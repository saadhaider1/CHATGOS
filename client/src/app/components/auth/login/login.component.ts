import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { LoadingService } from '../../../services/loading.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  email = '';
  password = '';
  errorMessage = '';
  isLoading = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private loadingService: LoadingService
  ) {}

  onSubmit() {
    if (!this.email || !this.password) {
      this.errorMessage = 'Please enter both email and password';
      return;
    }

    this.isLoading = true;
    this.loadingService.show();
    this.errorMessage = '';

    this.authService.login(this.email, this.password).subscribe({
      next: (response) => {
        this.isLoading = false;
        // Don't hide loading yet, let the navigation finish
        setTimeout(() => {
          this.loadingService.hide();
          this.router.navigate(['/chat']);
        }, 800);
      },
      error: (error) => {
        this.isLoading = false;
        this.loadingService.hide();
        this.errorMessage = error.error?.message || 'Login failed. Please try again.';
      }
    });
  }

  loginWithGoogle() {
    this.loadingService.show();
    this.authService.loginWithGoogle();
  }

  loginWithGitHub() {
    this.authService.loginWithGitHub();
  }
}
