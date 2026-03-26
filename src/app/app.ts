import { Component, signal } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { SharedModule } from './shared/shared.module';
import { AuthService } from './auth/auth.service';
import { User } from './shared/models/auth.model';
import { filter } from 'rxjs/operators';

import { NavbarComponent } from './shared/components/navbar/navbar.component';
import { HeaderComponent } from './shared/components/header/header.component';
import { FooterComponent } from './shared/components/footer/footer.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, SharedModule, NavbarComponent, FooterComponent], //HeaderComponent
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  currentRoute = '';
  currentUser: User | null = null;
  protected readonly title = signal('survey-app');
  constructor(
    private authService: AuthService, 
    private router: Router){
    this.authService.currentUser.subscribe(user => {
      this.currentUser = user;
    });
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      this.currentRoute = event.url;
    });
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  shouldShowHeader(): boolean {
    const hideHeaderRoutes = ['/','/login', '/register'];
    return !hideHeaderRoutes.includes(this.currentRoute);
  }
}
