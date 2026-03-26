import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../auth.service';
import { SharedModule } from '../../shared/shared.module';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-login-v2',
  templateUrl: './login-v2.component.html',
  styleUrls: ['./login-v2.component.scss'],
  imports: [SharedModule]
})
export class LoginV2Component implements OnInit {
  loginForm: FormGroup;
  hidePassword = true;
  isLoading = false;
  errorMessage = '';

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {
    this.loginForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });
  }
  ngOnInit(): void {
    const currentUser = this.authService.currentUserValue;
    if(currentUser) {
      this.router.navigate(['/dashboard']);
    }
  }

  onSubmit(): void {
    if (this.loginForm.valid) {
      this.isLoading = true;
      const { email, password } = this.loginForm.value;
      const loginRequest = {email, password}; 
      this.authService.login(loginRequest).subscribe({
        next: () => {
          this.isLoading = false;
          this.router.navigate(['/dashboard']);
        },
        error: (error) => {
          this.isLoading = false;
          this.handleLoginError(error);
        }
      });
    }
  }

  private handleLoginError(error: any): void {
    let errorMessage = 'Login failed. Please try again.';
    
    if (error.status === 401) {
      if(error.error?.message) {
        errorMessage = error.error.message.includes('Password is incorrect')
          ? 'Invalid password. Please check your credentials.'
          : (error.error.message.includes('User is disabled') ? 'User is disabled. Please contact support.' : 'Invalid email. Please check your credentials.');
      } else {
        errorMessage = 'Invalid email or password. Please check your credentials.';
      }
    } else if (error.status === 404) {
      errorMessage = 'User not found. Please check your email address.';
    } else if (error.status === 403) {
      errorMessage = 'Account is disabled. Please contact support.';
    } else if (error.status === 429) {
      errorMessage = 'Too many login attempts. Please try again later.';
    } else if (error.status === 0) {
      errorMessage = 'Unable to connect to server. Please check your internet connection.';
    } else if (error.error?.message) {
      errorMessage = error.error.message;
    }

    this.errorMessage = errorMessage;
    
    // Show snackbar notification
    this.snackBar.open(errorMessage, 'Close', {
      duration: 5000,
      panelClass: ['error-snackbar']
    });

    // Clear form errors and reset password field
    this.loginForm.get('password')?.setValue('');
    this.loginForm.get('password')?.markAsUntouched();
  }

  clearError(): void {
    this.errorMessage = '';
  }
}