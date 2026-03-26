import { ChangeDetectorRef, Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../auth.service';
import { SharedModule } from '../../shared/shared.module';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss'],
    imports: [SharedModule]

})
export class RegisterComponent {
  registerForm: FormGroup;
  hidePassword = true;
  isLoading = false;
  errorMessage = '';

  // ── Post-registration success state ──────────────────────────────────────
  registrationSuccess = false;
  registeredEmail = '';

  // ── Resend state ──────────────────────────────────────────────────────────
  isResending = false;
  resendSuccess = false;
  resendError = '';
  resendCooldown = 0;
  private cooldownTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private snackBar: MatSnackBar,
    private cdRef: ChangeDetectorRef
  ) {
    this.registerForm = this.formBuilder.group({
      firstname: ['', Validators.required],
      lastname: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  onSubmit(): void {
    if (this.registerForm.valid) {
      this.isLoading = true;
      const { firstname, lastname, email, password } = this.registerForm.value;
      const userRequest = { first_name: firstname, last_name: lastname, email, password };

      this.authService.register(userRequest).subscribe({
        next: () => {
          this.isLoading = false;
          //this.router.navigate(['/login']);
          this.registeredEmail = email;
          this.registrationSuccess = true;
          this.cdRef.detectChanges();
          this.snackBar.open('Registration successful! Please check your email to verify your account.', 'Close', { duration: 5000 });
        },
        error: (error) => {
          this.isLoading = false;
          this.handleRegistrationError(error);
        }
      });
    }
  }

  private handleRegistrationError(error: any): void {
    if(error?.message){
      this.errorMessage = error.message;
      this.isLoading = false;
      this.cdRef.detectChanges();
      return;
    }
    let errorMessage = 'Registration failed. Please try again.';
    
    if (error.status === 409) {
      errorMessage = 'Email or username already exists. Please use different credentials.';
    } else if (error.status === 400) {
      errorMessage = 'Invalid registration data. Please check your information.';
    } else if (error.status === 0) {
      errorMessage = 'Unable to connect to server. Please check your internet connection.';
    } else if (error.error?.message) {
      errorMessage = error.error.message;
    }
    this.isLoading = false;
    this.errorMessage = errorMessage;
    
    this.snackBar.open(errorMessage, 'Close', {
      duration: 5000,
      panelClass: ['error-snackbar']
    });
    this.cdRef.detectChanges();
  }

  /** Remove the emailTaken error as soon as the user edits the email field. */
  clearEmailTakenError(): void {
    const ctrl = this.registerForm.get('email');
    if (ctrl?.hasError('emailTaken')) {
      const errors = { ...ctrl.errors };
      delete errors['emailTaken'];
      ctrl.setErrors(Object.keys(errors).length ? errors : null);
    }
  }

  clearError(): void {
    this.errorMessage = '';
  }

// ── Resend verification ───────────────────────────────────────────────────

  resendVerification(): void {
    if (this.isResending || this.resendCooldown > 0) return;

    this.isResending = true;
    this.resendSuccess = false;
    this.resendError = '';

    // Wire this up to your actual resend API method in AuthService
    this.authService.resendVerificationEmail(this.registeredEmail).subscribe({
      next: () => {
        this.isResending = false;
        this.resendSuccess = true;
        this.startCooldown(60); // 60-second cooldown between resends
        this.cdRef.detectChanges();
      },
      error: (error: { error?: { message?: string } }) => {
        this.isResending = false;
        this.resendError =
          error?.error?.message || 'Failed to resend email. Please try again.';
        this.cdRef.detectChanges();
      }
    });
  }

  private startCooldown(seconds: number): void {
    this.resendCooldown = seconds;
    this.clearCooldown();
    this.cooldownTimer = setInterval(() => {
      this.resendCooldown--;
      if (this.resendCooldown <= 0) {
        this.resendCooldown = 0;
        this.clearCooldown();
      }
      this.cdRef.detectChanges();
    }, 1000);
  }

  private clearCooldown(): void {
    if (this.cooldownTimer !== null) {
      clearInterval(this.cooldownTimer);
      this.cooldownTimer = null;
    }
  }

  // ── Password strength ─────────────────────────────────────────────────────

  getPasswordStrength(): string {
    const password = this.registerForm.get('password')?.value || '';
    if (password.length < 6) return 'weak';
    if (password.length < 10) return 'medium';
    return 'strong';
  }

  getPasswordStrengthText(): string {
    const strength = this.getPasswordStrength();
    switch (strength) {
      case 'weak': return 'Weak password';
      case 'medium': return 'Medium strength';
      case 'strong': return 'Strong password';
      default: return '';
    }
  }

}