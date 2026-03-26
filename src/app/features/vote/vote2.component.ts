import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { SurveyService } from '../../shared/services/survey.service';
import { Party, Survey } from '../../shared/models/survey.model';
import { SharedModule } from '../../shared/shared.module';
import {
  VoteVerificationDialogComponent,
  VoteVerificationDialogData,
  VoteVerificationDialogResult,
} from './vote-dialog/vote-verification-dialog.component';

@Component({
  selector: 'app-vote',
  templateUrl: './vote2.component.html',
  styleUrls: ['./vote2.component.scss'],
  imports: [SharedModule],
})
export class Vote2Component implements OnInit {
  survey: Survey | null = null;
  voteForm: FormGroup;

  hasVoted        = false;   // true after OTP verified & vote confirmed
  hasVotedAlready = false;   // true if user already voted (detected on email blur)
  isSubmitting    = false;   // true while calling POST /vote to request OTP
  isLoading       = true;

  selectedParty:  Party | null = null;
  submittedParty: Party | null = null;  // saved for the thank-you card

  constructor(
    private route:         ActivatedRoute,
    private router:        Router,
    private fb:            FormBuilder,
    private cd:            ChangeDetectorRef,
    private surveyService: SurveyService,
    private snackBar:      MatSnackBar,
    private dialog:        MatDialog,
  ) {
    this.voteForm = this.fb.group({
      voterEmail:      ['', [Validators.required, Validators.email]],
      selectedPartyId: ['', Validators.required],
      gender:          [''],
      age:             ['', [Validators.min(18), Validators.max(120)]],
      location:        [''],
    });
  }

  ngOnInit(): void {
    const surveyId = this.route.snapshot.paramMap.get('id');
    if (surveyId) {
      this.loadSurvey(surveyId);
    } else {
      this.router.navigate(['/']);
    }
  }

  // ── Survey loading ────────────────────────────────────────────────────────

  private loadSurvey(surveyId: string): void {
    this.surveyService.getSurveyById(surveyId).subscribe({
      next: (survey) => {
        if (survey?.data?.isActive) {
          this.survey   = survey.data;
          this.isLoading = false;
          this.cd.detectChanges();
        } else {
          this.snackBar.open('Survey not found or inactive', 'Close', { duration: 3000 });
          this.router.navigate(['/']);
        }
      },
      error: () => {
        this.snackBar.open('Failed to load survey', 'Close', { duration: 3000 });
        this.router.navigate(['/']);
      },
    });
  }

  // ── Party selection ───────────────────────────────────────────────────────

  onPartySelect(party: Party): void {
    this.selectedParty = party;
    this.voteForm.patchValue({ selectedPartyId: party.id });
  }

  // ── Email blur — check for existing vote ─────────────────────────────────

  onEmailChange(): void {
    const email = this.voteForm.get('voterEmail')?.value;
    if (email && this.survey && this.isValidEmail(email)) {
      this.checkIfUserHasVoted(email);
    }
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  private checkIfUserHasVoted(email: string): void {
    if (!this.survey) return;
    this.surveyService.hasUserVoted(this.survey.id, email).subscribe({
      next: (response) => {
        this.hasVotedAlready = response.data ?? false;
        const ctrl = this.voteForm.get('selectedPartyId');
        this.hasVotedAlready ? ctrl?.disable() : ctrl?.enable();
        this.cd.detectChanges();
      },
    });
  }

  // ── Submit: request OTP then open dialog ─────────────────────────────────

  onSubmit(): void {
    if (this.voteForm.invalid || this.isSubmitting || this.hasVoted || !this.survey) return;

    this.isSubmitting = true;
    const { voterEmail, selectedPartyId, gender, age, location } = this.voteForm.value;

    // Step 1 — POST /api/v1/vote  → backend sends OTP email, returns voteRequestId
    this.surveyService.requestVote(
      this.survey.id,
      selectedPartyId,
      voterEmail,
      gender   || undefined,
      age      ? Number(age) : undefined,
      location || undefined,
    ).subscribe({
      next: (response: any) => {
        this.isSubmitting = false;
        const voteRequestId: string = response.data?.tempVoteId;

        // Step 2 — open OTP dialog
        this.openVerificationDialog(voterEmail, voteRequestId);
      },
      error: (err) => {
        this.isSubmitting = false;
        const msg = err?.error?.message ?? 'Failed to initiate vote. Please try again.';
        this.snackBar.open(msg, 'Close', { duration: 4000 });
      },
    });
  }

  // ── Open OTP dialog ───────────────────────────────────────────────────────

  private openVerificationDialog(email: string, voteRequestId: string): void {
    const dialogData: VoteVerificationDialogData = {
      email,
      surveyId: this.survey!.id,
      voteRequestId
    };

    const dialogRef = this.dialog.open<
      VoteVerificationDialogComponent,
      VoteVerificationDialogData,
      VoteVerificationDialogResult
    >(VoteVerificationDialogComponent, {
      data: dialogData,
      width: '460px',
      maxWidth: '95vw',
      disableClose: true,        // prevent accidental close
      panelClass: 'otp-dialog-panel',
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result?.verified) {
        // Vote confirmed — show thank-you
        this.submittedParty = this.selectedParty;
        this.hasVoted = true;
        this.voteForm.get('selectedPartyId')?.disable();
        this.cd.detectChanges();
        this.snackBar.open('Your vote has been verified and recorded!', '✓', { duration: 5000 });
      }
      // If cancelled, do nothing — user stays on the form
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  getPartyById(partyId: string): Party | undefined {
    return this.survey?.surveyParties?.find(p => p.id === partyId)?.party;
  }
}