import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LoadingService } from '../../../services/loading.service';

@Component({
  selector: 'app-loading',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="loading-overlay" *ngIf="loadingService.isLoading$ | async">
      <div class="loading-content">
        <div class="logo-container">
          <div class="pulse-ring"></div>
          <div class="logo-circle">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
          </div>
        </div>
        <div class="loading-text">
          <span class="brand">CHAT<span class="highlight">GOS</span></span>
          <div class="status-container">
            <span class="status-dot"></span>
            <span class="status-text">Connecting to servers...</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .loading-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(10, 10, 15, 0.85);
      backdrop-filter: blur(12px);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 9999;
      transition: all 0.3s ease;
    }

    .loading-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2rem;
    }

    .logo-container {
      position: relative;
      width: 100px;
      height: 100px;
      display: flex;
      justify-content: center;
      align-items: center;
    }

    .logo-circle {
      width: 70px;
      height: 70px;
      background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
      border-radius: 20px;
      display: flex;
      justify-content: center;
      align-items: center;
      color: white;
      box-shadow: 0 10px 25px rgba(99, 102, 241, 0.4);
      z-index: 2;
    }

    .logo-circle svg {
      width: 35px;
      height: 35px;
    }

    .pulse-ring {
      position: absolute;
      width: 100%;
      height: 100%;
      border-radius: 30px;
      background: rgba(99, 102, 241, 0.2);
      animation: pulse 2s infinite ease-out;
      z-index: 1;
    }

    @keyframes pulse {
      0% { transform: scale(0.8); opacity: 0.8; }
      100% { transform: scale(1.5); opacity: 0; }
    }

    .loading-text {
      text-align: center;
    }

    .brand {
      font-size: 2rem;
      font-weight: 800;
      letter-spacing: -0.02em;
      color: white;
      display: block;
      margin-bottom: 0.5rem;
    }

    .highlight {
      background: linear-gradient(to right, #6366f1, #a855f7);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .status-container {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      color: #94a3b8;
      font-size: 0.9rem;
      font-weight: 500;
    }

    .status-dot {
      width: 6px;
      height: 6px;
      background: #6366f1;
      border-radius: 50%;
      box-shadow: 0 0 10px #6366f1;
      animation: blink 1.5s infinite;
    }

    @keyframes blink {
      0%, 100% { opacity: 0.4; }
      50% { opacity: 1; }
    }
  `]
})
export class LoadingComponent {
  constructor(public loadingService: LoadingService) {}
}
