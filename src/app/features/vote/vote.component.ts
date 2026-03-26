import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SurveyService } from '../../shared/services/survey.service';
import { Party, Survey } from '../../shared/models/survey.model';
import { SharedModule } from '../../shared/shared.module';

@Component({
  selector: 'app-vote',
  templateUrl: './vote.component.html',
  styleUrls: ['./vote.component.scss'],
  imports: [
    SharedModule
  ]
})
export class VoteComponent implements OnInit {
  survey: Survey | null = null;
  voteForm: FormGroup;
  hasVoted = false;
  hasVotedAlready = false;
  isSubmitting = false;
  isLoading = true;
  selectedParty: Party | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private cd: ChangeDetectorRef,
    private surveyService: SurveyService,
    private snackBar: MatSnackBar
  ) {
    this.voteForm = this.fb.group({
      voterEmail: ['', [Validators.required, Validators.email]],
      selectedPartyId: ['', Validators.required],
      gender: [''],
      age: ['', [Validators.min(18), Validators.max(120)]],
      location: ['']      
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

  private loadSurvey(surveyId: string): void {
    this.surveyService.getSurveyById(surveyId).subscribe({
      next: (survey) => {
        if (survey && survey.data?.isActive) {
          this.survey = survey.data;
          this.isLoading = false;
          this.cd.detectChanges();
        } else {
          this.snackBar.open('Survey not found or inactive', 'Close', { duration: 3000 });
          this.router.navigate(['/']);
        }
      },
      error: (error) => {
        console.error('Failed to load survey:', error);
        this.snackBar.open('Failed to load survey', 'Close', { duration: 3000 });
        this.router.navigate(['/']);
      }
    });
  }

  onPartySelect(party: Party): void {
    this.selectedParty = party;
    this.voteForm.patchValue({ selectedPartyId: party.id });
  }

  onEmailChange(): void {
    const email = this.voteForm.get('voterEmail')?.value;
    if (email && this.survey && this.isValidEmail(email)) {
      this.checkIfUserHasVoted(email);
    }
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private checkIfUserHasVoted(email: string): void {
    if (this.survey) {
      this.surveyService.hasUserVoted(this.survey.id, email).subscribe({
        next: (response) => {
          const hasVoted = response.data || false;
          this.hasVotedAlready = hasVoted;
          if (hasVoted) {
            this.voteForm.get('selectedPartyId')?.disable();
          } else {
            this.voteForm.get('selectedPartyId')?.enable();
          }
        }
      });
    }
  }

  onSubmit(): void {
    if (this.voteForm.valid && !this.isSubmitting && !this.hasVoted && this.survey) {
      this.isSubmitting = true;
      const { voterEmail, selectedPartyId, gender, age, location } = this.voteForm.value;

      this.surveyService.submitVote(
        this.survey.id,
        selectedPartyId,
        voterEmail,
        gender || undefined,
        age ? Number(age) : undefined,
        location || undefined
      ).subscribe({
        next: () => {
          this.snackBar.open('Thank you for voting!', 'Close', { duration: 3000 });
          this.hasVoted = true;
          this.voteForm.get('selectedPartyId')?.disable();
          this.isSubmitting = false;
          this.cd.detectChanges();
        },
        error: (error) => {
          console.error('Failed to submit vote:', error);
          this.snackBar.open(`Failed to submit vote. ${error?.error?.message}`, 'Close', { duration: 4000 });
          this.isSubmitting = false;
        }
      });
    }
  }

  getPartyById(partyId: string): Party | undefined {
    return this.survey?.surveyParties?.find(p => p.id === partyId)?.party;
  }
}