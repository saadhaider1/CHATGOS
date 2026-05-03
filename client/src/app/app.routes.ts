import { Routes } from '@angular/router';
import { LoginComponent } from './components/auth/login/login.component';
import { SignupComponent } from './components/auth/signup/signup.component';
import { OAuthCallbackComponent } from './components/auth/oauth-callback/oauth-callback.component';
import { ChatPageComponent } from './pages/chat/chat.page';
import { ProfilePageComponent } from './pages/profile/profile.page';
import { ContactsPageComponent } from './pages/contacts/contacts.page';
import { NotificationsPageComponent } from './pages/notifications/notifications.page';
import { SettingsPageComponent } from './pages/settings/settings.page';
import { AuthGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'signup', component: SignupComponent },
  { path: 'auth/callback', component: OAuthCallbackComponent },
  { path: 'chat', component: ChatPageComponent, canActivate: [AuthGuard] },
  { path: 'profile', component: ProfilePageComponent, canActivate: [AuthGuard] },
  { path: 'contacts', component: ContactsPageComponent, canActivate: [AuthGuard] },
  { path: 'notifications', component: NotificationsPageComponent, canActivate: [AuthGuard] },
  { path: 'settings', component: SettingsPageComponent, canActivate: [AuthGuard] },
  { path: '**', redirectTo: '/login' }
];
