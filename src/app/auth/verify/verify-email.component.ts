import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../auth.service';
import { SharedModule } from '../../shared/shared.module';

type VerifyState = 'verifying' | 'success' | 'failed' | 'expired' | 'resent';

@Component({
  selector: 'app-verify-email',
  templateUrl: './verify-email.component.html',
  styleUrls:  ['./verify-email.component.scss'],
  imports: [SharedModule]
})
export class VerifyEmailComponent implements OnInit, OnDestroy {

  state: VerifyState = 'verifying';
  errorMessage = 'We could not verify your email address.';
  errorDetail  = 'The link may be invalid or already used.';
  canRetry     = false;
  responseMessage = '';

  // Resend state
  registeredEmail  = '';
  isResending      = false;
  resendError      = '';
  resendCooldown   = 0;
  private cooldownTimer: ReturnType<typeof setInterval> | null = null;

  private userGuid         = '';
  private verificationCode = '';

  constructor(
    private route: ActivatedRoute,
    private authService: AuthService,
    private cd: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Extract path params from: /auth/verifyemail/:userGuid/:verificationCode
    this.userGuid         = this.route.snapshot.paramMap.get('userGuid')         ?? '';
    this.verificationCode = this.route.snapshot.paramMap.get('verificationCode') ?? '';

    if (!this.userGuid || !this.verificationCode) {
      this.setFailed(
        'Invalid verification link.',
        'The link is missing required parameters. Please check your email and try again.',
        false
      );
      return;
    }

    this.verify();
  }

  ngOnDestroy(): void {
    this.clearCooldown();
  }

  verify(): void {
    this.state = 'verifying';

    this.authService.verifyEmail(this.userGuid, this.verificationCode).subscribe({
      next: (response) => {
        this.responseMessage = response?.message ?? 'Your email has been successfully verified!';
        this.state = 'success';
        this.cd.detectChanges();
      },
      error: (error) => {
        this.handleError(error);
        this.cd.detectChanges();
      }
    });
  }

  retryVerification(): void {
    this.verify();
  }

  resendVerificationEmail1(): void {
    if (!this.userGuid) {
      this.setFailed(
        'Unable to resend verification email.',
        'User information is missing. Please contact support.',
        false
      );
      return;
    }
    this.authService.resendVerificationEmail(this.userGuid).subscribe({
      next: () => {
        this.errorMessage = 'A new verification email has been sent. Please check your inbox.';
        this.errorDetail  = '';
        this.canRetry     = false;
        this.cd.detectChanges();
      },
      error: (error) => {
        this.setFailed(
          'Failed to resend verification email.',
          error?.error?.message || 'Please try again later.',
          false
        );
        this.cd.detectChanges();
      }
    });
  }

  
  private handleError(error: any): void {
    const status = error?.status;

    if (status === 410 || error?.error?.message?.toLowerCase().includes('expired')) {
      // 410 Gone — link has expired
      this.state = 'expired';
      return;
    }

    if (status === 404) {
      this.setFailed(
        'Verification link not found.',
        'This link does not exist or has already been used.',
        false
      );
      return;
    }

    if (status === 400) {
      this.setFailed(
        'Invalid verification link.',
        error?.error?.message ?? 'The link is malformed or the code is incorrect.',
        false
      );
      return;
    }

    if (status === 0) {
      this.setFailed(
        'Unable to reach the server.',
        'Please check your internet connection and try again.',
        true  // allow retry on network errors
      );
      return;
    }

    // Generic fallback
    this.setFailed(
      error?.error?.message ?? 'Verification failed. Please try again.',
      'If the problem persists, please request a new verification email.',
      true
    );
  }

  private setFailed(message: string, detail: string, canRetry: boolean): void {
    this.state        = 'failed';
    this.errorMessage = message;
    this.errorDetail  = detail;
    this.canRetry     = canRetry;
  }

// ── Resend ───────────────────────────────────────────────────────────────
 
  resendVerification(): void {
    if (this.isResending || this.resendCooldown > 0) return;
 
    this.isResending  = true;
    this.resendError  = '';
 
    // userGuid is enough for the backend to look up the user and send a fresh code
    this.authService.resendVerificationEmail(this.userGuid).subscribe({
      next: (response) => {
        this.isResending     = false;
        // Backend can optionally return the masked email e.g. { email: 'j***@gmail.com' }
        this.registeredEmail = response?.email ?? this.registeredEmail;
        this.state = 'resent';
        this.startCooldown(60);
        this.cd.detectChanges();
      },
      error: (error) => {
        this.isResending = false;
        this.resendError =
          error?.error?.message ?? 'Could not send the email. Please try again.';
        this.cd.detectChanges();
      }
    });
  }
 
  // ── Cooldown timer ───────────────────────────────────────────────────────
 
  private startCooldown(seconds: number): void {
    this.resendCooldown = seconds;
    this.clearCooldown();
    this.cooldownTimer = setInterval(() => {
      this.resendCooldown--;
      if (this.resendCooldown <= 0) {
        this.resendCooldown = 0;
        this.clearCooldown();
      }
      this.cd.detectChanges();
    }, 1000);
  }
 
  private clearCooldown(): void {
    if (this.cooldownTimer !== null) {
      clearInterval(this.cooldownTimer);
      this.cooldownTimer = null;
      this.cd.detectChanges();
    }
  }  
}