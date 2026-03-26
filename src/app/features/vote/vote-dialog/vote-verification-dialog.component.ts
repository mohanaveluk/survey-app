import {
  Component,
  Inject,
  OnInit,
  OnDestroy,
  ViewChildren,
  QueryList,
  ElementRef,
  AfterViewInit,
  ChangeDetectorRef,
} from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { SurveyService } from '../../../shared/services/survey.service';
import { SharedModule } from '../../../shared/shared.module';
import { HttpErrorResponse } from '@angular/common/http';

export interface VoteVerificationDialogData {
  /** The voter's email address (shown in the dialog) */
  email: string;
  /** Survey ID — needed for the verify API call */
  surveyId: string;
  /** Vote request ID returned by POST /api/v1/vote */
  voteRequestId: string;
 
}

export interface VoteVerificationDialogResult {
  verified: boolean;
}

@Component({
  selector: 'app-vote-verification-dialog',
  templateUrl: './vote-verification-dialog.component.html',
  styleUrls: ['./vote-verification-dialog.component.scss'],
  imports: [SharedModule],
})
export class VoteVerificationDialogComponent implements OnInit, OnDestroy, AfterViewInit {

  // ── OTP boxes ────────────────────────────────────────────────────────────
  readonly otpBoxes  = Array(6).fill(null);
  otpValues: string[] = Array(6).fill('');

  @ViewChildren('otpInput') otpInputs!: QueryList<ElementRef<HTMLInputElement>>;

  get isCodeComplete(): boolean {
    return this.otpValues.every(v => v !== '');
  }

  get fullCode(): string {
    return this.otpValues.join('');
  }

  get hasError(): boolean {
    return !!this.errorMessage;
  }

  // ── State ─────────────────────────────────────────────────────────────────
  isVerifying   = false;
  isResending   = false;
  resendSuccess = false;
  resendCooldown = 0;
  errorMessage  = '';

  // ── Countdown timer ───────────────────────────────────────────────────────
  timeLeft = 300; // 5 minutes
  private countdownTimer: ReturnType<typeof setInterval> | null = null;
  private cooldownTimer:  ReturnType<typeof setInterval> | null = null;

  constructor(
    private dialogRef: MatDialogRef<VoteVerificationDialogComponent, VoteVerificationDialogResult>,
    @Inject(MAT_DIALOG_DATA) public data: VoteVerificationDialogData,
    private surveyService: SurveyService,
    private cd: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.startCountdown();
  }

  ngAfterViewInit(): void {
    // Auto-focus the first box
    setTimeout(() => this.otpInputs.first?.nativeElement.focus(), 100);
  }

  ngOnDestroy(): void {
    this.clearTimers();
  }

  // ── OTP keyboard handling ─────────────────────────────────────────────────

  onKeyDown(event: KeyboardEvent, index: number): void {
    const inputs = this.otpInputs.toArray();

    if (event.key === 'Backspace') {
      event.preventDefault();
      if (this.otpValues[index]) {
        this.otpValues[index] = '';
      } else if (index > 0) {
        this.otpValues[index - 1] = '';
        inputs[index - 1].nativeElement.focus();
      }
      this.errorMessage = '';
    } else if (event.key === 'ArrowLeft' && index > 0) {
      inputs[index - 1].nativeElement.focus();
    } else if (event.key === 'ArrowRight' && index < 5) {
      inputs[index + 1].nativeElement.focus();
    }
  }

  onInput(event: Event, index: number): void {
    const input = event.target as HTMLInputElement;
    const digit = input.value.replace(/\D/g, '').slice(-1);
    this.otpValues[index] = digit;
    input.value = digit; // keep DOM in sync
    this.errorMessage = '';

    if (digit && index < 5) {
      const inputs = this.otpInputs.toArray();
      inputs[index + 1].nativeElement.focus();
    }
  }

  onPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const pasted = event.clipboardData?.getData('text') ?? '';
    const digits  = pasted.replace(/\D/g, '').slice(0, 6).split('');
    digits.forEach((d, i) => { if (i < 6) this.otpValues[i] = d; });

    // Focus the next empty box or the last
    const nextEmpty = this.otpValues.findIndex(v => !v);
    const inputs = this.otpInputs.toArray();
    const target = nextEmpty === -1 ? 5 : nextEmpty;
    inputs[target].nativeElement.focus();
  }

  // ── Verify ────────────────────────────────────────────────────────────────

  verify(): void {
    if (!this.isCodeComplete || this.isVerifying) return;

    this.isVerifying  = true;
    this.errorMessage = '';

    this.surveyService.verifyVote(
      this.data.surveyId,
      this.data.voteRequestId,
      this.data.email,
      this.fullCode,
    ).subscribe({
      next: () => {
        this.isVerifying = false;
        this.dialogRef.close({ verified: true });
        this.cd.detectChanges();
      },
      error: (err) => {
        this.isVerifying  = false;
        this.errorMessage =
          err?.error?.message ?? 'Invalid code. Please try again.';
        // Shake and clear OTP on wrong code
        this.otpValues = Array(6).fill('');
        setTimeout(() => this.otpInputs.first?.nativeElement.focus(), 50);
        this.cd.detectChanges();
      },
    });
  }

  // ── Resend ────────────────────────────────────────────────────────────────

  resend(): void {
    if (this.isResending || this.resendCooldown > 0) return;

    this.isResending  = true;
    this.resendSuccess = false;
    this.errorMessage  = '';

    this.surveyService.requestVoteOtp(
      this.data.surveyId,
      this.data.email,
    ).subscribe({
      next: () => {
        this.isResending   = false;
        this.resendSuccess = true;
        this.timeLeft      = 300;
        this.startCooldown(60);
        setTimeout(() => (this.resendSuccess = false), 10000);
        this.cd.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.isResending  = false;
        this.errorMessage = err?.error?.message ?? 'Failed to resend code.';
        this.cd.detectChanges();
      },
    });
  }

  cancel(): void {
    this.dialogRef.close({ verified: false });
  }

  // ── Timers ────────────────────────────────────────────────────────────────

  formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  private startCountdown(): void {
    this.countdownTimer = setInterval(() => {
      if (this.timeLeft > 0) {
        this.timeLeft--;
      } else {
        this.clearTimers();
        this.errorMessage = 'Code expired. Please resend a new code.';
        this.isResending = false;
      }
      this.cd.detectChanges();
    }, 1000);
    this.cd.detectChanges();
  }

  private startCooldown(seconds: number): void {
    this.resendCooldown = seconds;
    this.clearCooldownTimer();
    this.cooldownTimer = setInterval(() => {
      this.resendCooldown--;
      if (this.resendCooldown <= 0) this.clearCooldownTimer();
    }, 1000);
    this.cd.detectChanges();
  }

  private clearTimers(): void {
    if (this.countdownTimer) { clearInterval(this.countdownTimer); this.countdownTimer = null; }
    this.clearCooldownTimer();
  }

  private clearCooldownTimer(): void {
    if (this.cooldownTimer) { clearInterval(this.cooldownTimer); this.cooldownTimer = null; }
  }
}
