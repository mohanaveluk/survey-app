import {
  Component,
  OnInit,
  OnDestroy,
  ViewChildren,
  QueryList,
  ElementRef,
  AfterViewChecked,
  ChangeDetectorRef,
} from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { AuthService } from '../auth.service';
import { SharedModule } from '../../shared/shared.module';

// ── Custom validator: password === confirmPassword ────────────────────────────
function passwordMatchValidator(group: AbstractControl): ValidationErrors | null {
  const password        = group.get('password')?.value;
  const confirmPassword = group.get('confirmPassword')?.value;
  return password && confirmPassword && password !== confirmPassword
    ? { mismatch: true }
    : null;
}

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.scss'],
  imports: [SharedModule],
})
export class ForgotPasswordComponent implements OnInit, OnDestroy, AfterViewChecked {

  // ── Step control (1 = email, 2 = OTP, 3 = new password, 4 = success) ──────
  currentStep = 1;

  // ── Forms ─────────────────────────────────────────────────────────────────
  emailForm!:    FormGroup;
  passwordForm!: FormGroup;

  // ── UI state ──────────────────────────────────────────────────────────────
  isLoading    = false;
  isResending  = false;
  errorMessage = '';
  resendSuccess = false;
  resendCooldown = 0;

  // ── Password visibility toggles ───────────────────────────────────────────
  hidePassword = true;
  hideConfirm  = true;

  // ── OTP state ─────────────────────────────────────────────────────────────
  readonly otpBoxes = Array(6).fill(null);
  otpValues: string[] = Array(6).fill('');
  otpHasError = false;

  @ViewChildren('otpInput') otpInputs!: QueryList<ElementRef<HTMLInputElement>>;
  private shouldFocusOtp = false;

  // ── Reset token returned by verify API ───────────────────────────────────
  private resetToken = '';

  // ── Timers ────────────────────────────────────────────────────────────────
  timeLeft = 300; // 5 min
  private countdownTimer: ReturnType<typeof setInterval> | null = null;
  private cooldownTimer:  ReturnType<typeof setInterval> | null = null;

  constructor(
    private fb:          FormBuilder,
    private authService: AuthService,
    private cd:          ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.emailForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
    });

    this.passwordForm = this.fb.group(
      {
        password:        ['', [Validators.required, Validators.minLength(8)]],
        confirmPassword: ['', Validators.required],
      },
      { validators: passwordMatchValidator },
    );
  }

  ngAfterViewChecked(): void {
    if (this.shouldFocusOtp && this.otpInputs?.first) {
      this.otpInputs.first.nativeElement.focus();
      this.shouldFocusOtp = false;
    }
  }

  ngOnDestroy(): void {
    this.clearAllTimers();
  }

  // ── Step navigation ───────────────────────────────────────────────────────

  goToStep(step: number): void {
    this.errorMessage = '';
    this.currentStep  = step;
    this.cd.detectChanges();
  }

  // ── STEP 1: Request OTP ───────────────────────────────────────────────────

  onRequestCode(): void {
    if (this.emailForm.invalid || this.isLoading) return;

    this.isLoading    = true;
    this.errorMessage = '';

    this.authService.requestPasswordReset(this.emailForm.value.email).subscribe({
      next: () => {
        this.isLoading = false;
        this.goToStep(2);
        this.startCountdown();
        this.shouldFocusOtp = true;
        this.cd.detectChanges();
      },
      error: (err) => {
        this.isLoading    = false;
        this.errorMessage = err?.error?.message ?? 'Could not send reset code. Please try again.';
        this.cd.detectChanges();
      },
    });
  }

  // ── STEP 2: OTP input handling ────────────────────────────────────────────

  get isOtpComplete(): boolean {
    return this.otpValues.every(v => v !== '');
  }

  get fullOtp(): string {
    return this.otpValues.join('');
  }

  onOtpKeyDown(event: KeyboardEvent, index: number): void {
    const inputs = this.otpInputs.toArray();
    if (event.key === 'Backspace') {
      event.preventDefault();
      if (this.otpValues[index]) {
        this.otpValues[index] = '';
      } else if (index > 0) {
        this.otpValues[index - 1] = '';
        inputs[index - 1].nativeElement.focus();
      }
      this.otpHasError  = false;
      this.errorMessage = '';
    } else if (event.key === 'ArrowLeft'  && index > 0) { inputs[index - 1].nativeElement.focus(); }
      else if (event.key === 'ArrowRight' && index < 5) { inputs[index + 1].nativeElement.focus(); }
  }

  onOtpInput(event: Event, index: number): void {
    const input = event.target as HTMLInputElement;
    const digit = input.value.replace(/\D/g, '').slice(-1);
    this.otpValues[index] = digit;
    input.value           = digit;
    this.otpHasError      = false;
    this.errorMessage     = '';

    if (digit && index < 5) {
      this.otpInputs.toArray()[index + 1].nativeElement.focus();
    }
  }

  onOtpPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const digits = (event.clipboardData?.getData('text') ?? '')
      .replace(/\D/g, '').slice(0, 6).split('');
    digits.forEach((d, i) => { if (i < 6) this.otpValues[i] = d; });
    const nextEmpty = this.otpValues.findIndex(v => !v);
    const inputs    = this.otpInputs.toArray();
    inputs[nextEmpty === -1 ? 5 : nextEmpty].nativeElement.focus();
  }

  onVerifyCode(): void {
    if (!this.isOtpComplete || this.isLoading) return;

    this.isLoading    = true;
    this.errorMessage = '';

    this.authService.verifyPasswordResetCode(
      this.emailForm.value.email,
      this.fullOtp,
    ).subscribe({
      next: (response) => {
        this.isLoading  = false;
        // Backend returns a short-lived reset token used in step 3
        this.resetToken = response?.data?.resetToken ?? response?.resetToken ?? '';
        this.clearCountdown();
        this.goToStep(3);
      },
      error: (err) => {
        this.isLoading    = false;
        this.otpHasError  = true;
        this.errorMessage = err?.error?.message ?? 'Invalid code. Please try again.';
        // Clear OTP boxes on wrong code
        this.otpValues = Array(6).fill('');
        setTimeout(() => {
          this.otpInputs?.first?.nativeElement.focus();
          this.otpHasError = false;
        }, 600);
        this.cd.detectChanges();
      },
    });
  }

  onResendCode(): void {
    if (this.isResending || this.resendCooldown > 0) return;

    this.isResending   = true;
    this.resendSuccess = false;
    this.errorMessage  = '';

    this.authService.requestPasswordReset(this.emailForm.value.email).subscribe({
      next: () => {
        this.isResending   = false;
        this.resendSuccess = true;
        this.timeLeft      = 300;
        this.restartCountdown();
        this.startCooldown(60);
        this.otpValues = Array(6).fill('');
        setTimeout(() => { this.resendSuccess = false; this.cd.detectChanges(); }, 4000);
        this.cd.detectChanges();
      },
      error: (err) => {
        this.isResending  = false;
        this.errorMessage = err?.error?.message ?? 'Failed to resend code.';
        this.cd.detectChanges();
      },
    });
  }

  // ── STEP 3: Update password ───────────────────────────────────────────────

  onUpdatePassword(): void {
    if (this.passwordForm.invalid || this.isLoading) return;

    this.isLoading    = true;
    this.errorMessage = '';

    this.authService.updatePassword({
      email:      this.emailForm.value.email,
      resetToken: this.resetToken,
      password:   this.passwordForm.value.password,
    }).subscribe({
      next: () => {
        this.isLoading = false;
        this.goToStep(4);
      },
      error: (err) => {
        this.isLoading    = false;
        this.errorMessage = err?.error?.message ?? 'Failed to update password. Please try again.';
        this.cd.detectChanges();
      },
    });
  }

  // ── Password strength ─────────────────────────────────────────────────────

  get passwordStrength(): string {
    const val = this.passwordForm.get('password')?.value ?? '';
    if (val.length < 6)  return 'weak';
    if (val.length < 10) return 'medium';
    const hasUpper   = /[A-Z]/.test(val);
    const hasNum     = /[0-9]/.test(val);
    const hasSpecial = /[^A-Za-z0-9]/.test(val);
    return hasUpper && hasNum && hasSpecial ? 'strong' : 'medium';
  }

  get passwordStrengthLabel(): string {
    return { weak: 'Weak', medium: 'Medium', strong: 'Strong' }[this.passwordStrength] ?? '';
  }

  // ── Timers ────────────────────────────────────────────────────────────────

  formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  private startCountdown(): void {
    this.timeLeft = 300;
    this.countdownTimer = setInterval(() => {
      if (this.timeLeft > 0) {
        this.timeLeft--;
      } else {
        this.clearCountdown();
        this.errorMessage = 'Code expired. Please request a new one.';
        this.cd.detectChanges();
      }
    }, 1000);
  }

  private restartCountdown(): void {
    this.clearCountdown();
    this.startCountdown();
  }

  private clearCountdown(): void {
    if (this.countdownTimer) { clearInterval(this.countdownTimer); this.countdownTimer = null; }
  }

  private startCooldown(seconds: number): void {
    this.resendCooldown = seconds;
    this.clearCooldownTimer();
    this.cooldownTimer = setInterval(() => {
      this.resendCooldown--;
      if (this.resendCooldown <= 0) { this.resendCooldown = 0; this.clearCooldownTimer(); }
      this.cd.detectChanges();
    }, 1000);
  }

  private clearCooldownTimer(): void {
    if (this.cooldownTimer) { clearInterval(this.cooldownTimer); this.cooldownTimer = null; }
  }

  private clearAllTimers(): void {
    this.clearCountdown();
    this.clearCooldownTimer();
  }
}