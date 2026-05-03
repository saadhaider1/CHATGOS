import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ThemeService } from './services/theme.service';
import { CallModalComponent } from './components/call-modal/call-modal.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CallModalComponent],
  template: `
    <router-outlet></router-outlet>
    <app-call-modal></app-call-modal>
  `,
  styles: []
})
export class AppComponent implements OnInit {
  title = 'ChatGos';

  constructor(private themeService: ThemeService) {}

  ngOnInit() {
    // Theme is automatically loaded by ThemeService constructor
  }
}
