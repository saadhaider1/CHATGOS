import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ThemeService } from './services/theme.service';
import { CallModalComponent } from './components/call-modal/call-modal.component';
import { LoadingComponent } from './components/shared/loading/loading.component';
import { LoadingService } from './services/loading.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CallModalComponent, LoadingComponent],
  template: `
    <app-loading></app-loading>
    <router-outlet></router-outlet>
    <app-call-modal></app-call-modal>
  `,
  styles: []
})
export class AppComponent implements OnInit {
  title = 'ChatGos';

  constructor(
    private themeService: ThemeService,
    private loadingService: LoadingService
  ) {}

  ngOnInit() {
    // Show loading on start to handle token verification if needed
    // The verify logic is usually in AuthService, but we can trigger a brief loading here
    this.loadingService.show();
    setTimeout(() => {
      this.loadingService.hide();
    }, 1500); // Brief splash effect
  }
}
