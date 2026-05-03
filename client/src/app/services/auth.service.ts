import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

interface AuthResponse {
  token: string;
  user: {
    _id: string;
    username: string;
    email: string;
    avatar: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = `${environment.apiUrl}/api/auth`;
  private currentUserSubject = new BehaviorSubject<any>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient) {
    // Check if user is already logged in
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    if (token && user) {
      this.currentUserSubject.next(JSON.parse(user));
    }
  }

  signup(username: string, email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/signup`, {
      username,
      email,
      password
    });
  }

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, {
      email,
      password
    }).pipe(
      tap(response => {
        // Store token and user data
        localStorage.setItem('token', response.token);
        localStorage.setItem('user', JSON.stringify(response.user));
        this.currentUserSubject.next(response.user);
      })
    );
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.currentUserSubject.next(null);
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem('token');
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  getCurrentUser(): any {
    return this.currentUserSubject.value;
  }

  // ========== OAUTH METHODS ==========

  // Store OAuth user after callback
  setOAuthUser(token: string, user: any) {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    this.currentUserSubject.next(user);
  }

  // Get OAuth login URLs
  getGoogleAuthUrl(): string {
    return `${environment.apiUrl}/api/auth/google`;
  }

  getGitHubAuthUrl(): string {
    return `${environment.apiUrl}/api/auth/github`;
  }

  // Check if current user is OAuth user
  isOAuthUser(): boolean {
    const user = this.getCurrentUser();
    return user && (user.provider === 'google' || user.provider === 'github');
  }

  // Get OAuth provider name
  getOAuthProvider(): string | null {
    const user = this.getCurrentUser();
    return user?.provider || null;
  }

  // Link OAuth account to existing user
  linkOAuthAccount(provider: string, providerId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/link-oauth`, { provider, providerId });
  }

  // Unlink OAuth account
  unlinkOAuthAccount(provider: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/unlink-oauth`, { provider });
  }

  // Initiate OAuth login by redirecting to provider
  loginWithGoogle() {
    window.location.href = this.getGoogleAuthUrl();
  }

  loginWithGitHub() {
    window.location.href = this.getGitHubAuthUrl();
  }
}
