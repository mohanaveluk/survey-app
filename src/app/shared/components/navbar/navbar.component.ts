import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../auth/auth.service';
import { SharedModule } from '../../shared.module';
import { User } from '../../models/auth.model';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss'],
  imports: [SharedModule]
})
export class NavbarComponent implements OnInit {
  currentUser: User | null = null;
  isMenuOpen = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private cd: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.authService.currentUser.subscribe(user => {
      this.currentUser = user;
      this.cd.detectChanges();
    });
  }

  toggleMenu(): void {
    this.isMenuOpen = !this.isMenuOpen;
  }

  closeMenu(): void {
    this.isMenuOpen = false;
  }

  navigateTo(route: string): void {
    this.router.navigate([route]);
    this.closeMenu();
  }

  logout(): void {
    this.authService.logout().subscribe({
        next: () => {
          this.router.navigate(['/login']);
          this.closeMenu();
          this.cd.detectChanges();
        },
        error: (error) => {
          console.error('Logout failed:', error);
        }
    });
    
    this.router.navigate(['/login']);
    this.closeMenu();
  }

  getUserInitials(): string {
    if (this.currentUser?.username) {
      return this.currentUser.username
        .split(' ')
        .map(name => name.charAt(0))
        .join('')
        .toUpperCase()
        .substring(0, 2);
    }
    return 'U';
  }
}