import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private darkModeSubject = new BehaviorSubject<boolean>(false);
  private compactViewSubject = new BehaviorSubject<boolean>(false);
  
  public isDarkMode$ = this.darkModeSubject.asObservable();
  public isCompactView$ = this.compactViewSubject.asObservable();

  constructor() {
    this.loadSettings();
  }

  private loadSettings() {
    const settings = localStorage.getItem('userSettings');
    if (settings) {
      const parsed = JSON.parse(settings);
      if (parsed.appearance) {
        this.darkModeSubject.next(parsed.appearance.darkMode || false);
        this.compactViewSubject.next(parsed.appearance.compactView || false);
        this.applyTheme();
      }
    }
  }

  setDarkMode(isDark: boolean) {
    this.darkModeSubject.next(isDark);
    this.applyTheme();
    this.saveSettings();
  }

  setCompactView(isCompact: boolean) {
    this.compactViewSubject.next(isCompact);
    this.applyCompactView();
    this.saveSettings();
  }

  private applyTheme() {
    const isDark = this.darkModeSubject.value;
    if (isDark) {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark-theme');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark-theme');
    }
  }

  private applyCompactView() {
    const isCompact = this.compactViewSubject.value;
    if (isCompact) {
      document.body.classList.add('compact-view');
    } else {
      document.body.classList.remove('compact-view');
    }
  }

  private saveSettings() {
    const current = localStorage.getItem('userSettings');
    const settings = current ? JSON.parse(current) : {};
    
    if (!settings.appearance) {
      settings.appearance = {};
    }
    
    settings.appearance.darkMode = this.darkModeSubject.value;
    settings.appearance.compactView = this.compactViewSubject.value;
    
    localStorage.setItem('userSettings', JSON.stringify(settings));
  }

  getCurrentTheme(): boolean {
    return this.darkModeSubject.value;
  }

  getCurrentCompactView(): boolean {
    return this.compactViewSubject.value;
  }
}
