import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-oauth-callback',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div class="text-center">
        <div class="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <h2 class="text-2xl font-semibold text-gray-800 mb-2">Completing Login...</h2>
        <p class="text-gray-600">Please wait while we authenticate you.</p>
        <p *ngIf="error" class="text-red-600 mt-4">{{ error }}</p>
      </div>
    </div>
  `
})
export class OAuthCallbackComponent implements OnInit {
  error: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit() {
    // Get token and user data from URL query params
    this.route.queryParams.subscribe(params => {
      const token = params['token'];
      const userData = params['user'];
      const error = params['error'];

      if (error) {
        this.error = 'Authentication failed. Please try again.';
        setTimeout(() => {
          this.router.navigate(['/login'], { queryParams: { error: 'oauth_failed' } });
        }, 2000);
        return;
      }

      if (token && userData) {
        try {
          // Parse user data
          const user = JSON.parse(decodeURIComponent(userData));
          
          // Store token and user in auth service
          this.authService.setOAuthUser(token, user);
          
          // Redirect to chat
          this.router.navigate(['/chat']);
        } catch (e) {
          console.error('Error parsing OAuth data:', e);
          this.error = 'Invalid authentication data.';
          setTimeout(() => {
            this.router.navigate(['/login']);
          }, 2000);
        }
      } else {
        this.error = 'Missing authentication data.';
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 2000);
      }
    });
  }
}
