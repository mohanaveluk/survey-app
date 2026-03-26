import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Survey, SurveyResult } from '../../shared/models/survey.model';
import { AuthService } from '../../auth/auth.service';
import { SurveyService } from '../../shared/services/survey.service';
import { SharedModule } from '../../shared/shared.module';

@Component({
  selector: 'app-manage-survey',
  templateUrl: './manage-survey.component.html',
  styleUrls: ['./manage-survey.component.scss'],
  imports: [SharedModule]
})
export class ManageSurveyComponent implements OnInit {
  survey: Survey | null = null;
  surveyResult: SurveyResult | null = null;
  surveyUrl = '';
  isLoading = true;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private surveyService: SurveyService,
    private authService: AuthService,
    private snackBar: MatSnackBar,
    private cd: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const surveyId = this.route.snapshot.paramMap.get('id');
    if (surveyId) {
      this.loadSurvey(surveyId);
      //this.loadSurveyResults(surveyId);
      this.surveyUrl = this.surveyService.getSurveyUrl(surveyId);
      this.cd.detectChanges();
    } else {
      this.router.navigate(['/dashboard']);
    }
  }

  private loadSurvey(surveyId: string): void {
    this.surveyService.getSurveyById(surveyId).subscribe({
      next: (survey) => {
        if (survey) {
          const currentUser = this.authService.currentUserValue; //getUser()
          if (currentUser && survey.data?.creator?.uguid === currentUser.id) {
            this.survey = survey.data || null;
            this.loadSurveyResult(surveyId, this.survey as Survey);
          } else {
            this.snackBar.open('You are not authorized to manage this survey', 'Close', { duration: 3000 });
            this.router.navigate(['/dashboard']);
          }
        } else {
          this.snackBar.open('Survey not found', 'Close', { duration: 3000 });
          this.router.navigate(['/dashboard']);
        }
        this.isLoading = false;
        this.cd.detectChanges();
      },
      error: (error) => {
        console.error('Failed to load survey:', error);
        this.snackBar.open('Failed to load survey', 'Close', { duration: 3000 });
        this.router.navigate(['/dashboard']);
      }
    });
  }

  private loadSurveyResults(surveyId: string): void {
    this.surveyService.getSurveyResults(surveyId).subscribe({
      next: (result) => {
        this.surveyResult = result;
        this.cd.detectChanges();
      },
      error: (error) => {
        console.error('Failed to load survey results:', error);
      }
    });
  }

  loadSurveyResult(surveyId: string, survey: Survey): SurveyResult{
    const surveyVotes = survey.votes || [];
    const votesByParty: { [partyId: string]: number } = {};

    survey.surveyParties?.forEach(sp => {
      votesByParty[sp.party.id!] = 0;
    });

    // Count votes
    surveyVotes.forEach(vote => {
      if (!votesByParty[vote.partyId]) {
        votesByParty[vote.partyId] = 0;
      }
      votesByParty[vote.partyId]++;
    });
    
    this.surveyResult = {
      survey,
      votes: votesByParty,
      totalVotes: surveyVotes.length
    };
    return this.surveyResult;
  }

  copyUrl(): void {
    navigator.clipboard.writeText(this.surveyUrl).then(() => {
      this.snackBar.open('Survey URL copied to clipboard!', 'Close', { duration: 2000 });
    });
  }

  toggleSurveyStatus(): void {
    if (this.survey) {
      this.surveyService.toggleSurveyStatus(this.survey.id).subscribe({
        next: (updatedSurvey) => {
          if (updatedSurvey) {
            this.survey = updatedSurvey.data || this.survey;
            const status = updatedSurvey.data?.isActive ? 'activated' : 'deactivated';
            this.snackBar.open(`Survey ${status} successfully`, 'Close', { duration: 2000 });
            this.cd.detectChanges();
          }
        },
        error: (error) => {
          console.error('Failed to toggle survey status:', error);
          this.snackBar.open('Failed to update survey status', 'Close', { duration: 3000 });
        }
      });
    }
  }

  getVotePercentage(partyId: string): number {
    if (!this.surveyResult || this.surveyResult.totalVotes === 0) {
      return 0;
    }
    const votes = this.surveyResult.votes[partyId] || 0;
    return Math.round((votes / this.surveyResult.totalVotes) * 100);
  }

  getVoteCount(partyId: string): number {
    return this.surveyResult?.votes[partyId] || 0;
  }

  getWinningParty(): string | null {
    if (!this.surveyResult || this.surveyResult.totalVotes === 0) {
      return null;
    }

    let maxVotes = 0;
    let winningPartyId = '';

    Object.entries(this.surveyResult.votes).forEach(([partyId, votes]) => {
      if (votes > maxVotes) {
        maxVotes = votes;
        winningPartyId = partyId;
      }
    });

    const winningParty = this.survey?.surveyParties?.find(p => p.party.id === winningPartyId);
    return winningParty?.party.name || null;
  }

  refreshResults(): void {
    if (this.survey) {
      this.loadSurveyResults(this.survey.id);
      this.snackBar.open('Results refreshed', 'Close', { duration: 1000 });
    }
  }

  goBack(): void {
    this.router.navigate(['/dashboard']);
  }

  isWinningParty(partyId: string): boolean {
    if (!this.surveyResult || this.surveyResult.totalVotes === 0) {
      return false;
    } 
    const maxVotes = Math.max(...Object.values(this.surveyResult.votes));
    return this.surveyResult.votes[partyId] === maxVotes && maxVotes > 0;
  }
  
  publishSurvey(): void {
    if (this.survey) {
      if (this.survey && confirm('Are you sure you want to publish this survey? You will not be able to edit it after publishing.')) {
        this.surveyService.publishSurvey(this.survey.id).subscribe({
          next: (updatedSurvey) => {
            if (updatedSurvey) {
              this.survey = updatedSurvey.data || this.survey;
              this.snackBar.open('Survey published successfully!', 'Close', { duration: 2000 });
              this.cd.detectChanges();
            }
          },
          error: (error) => {
            console.error('Failed to publish survey:', error);
            this.snackBar.open('Failed to publish survey', 'Close', { duration: 3000 });
          }
        });
      }
    }
  }

  editSurvey(): void {
    if (this.survey) {
      this.router.navigate(['/survey/edit', this.survey.id]);
    }
  }

  closeSurvey(): void {
    if (this.survey && confirm('Are you sure you want to close this survey? It will no longer accept votes.')) {
      this.surveyService.closeSurvey(this.survey.id).subscribe({
        next: (updatedSurvey) => {
          if (updatedSurvey) {
            this.survey = updatedSurvey.data || this.survey;
            this.snackBar.open('Survey closed successfully', 'Close', { duration: 2000 });
            this.cd.detectChanges(); 
          }
        },
        error: (error) => {
          console.error('Failed to close survey:', error);
          this.snackBar.open('Failed to close survey', 'Close', { duration: 3000 });
        }
      });
    }
  }

  isDraft(): boolean {
    return this.survey?.status === 'draft';
  }

  isPublished(): boolean {
    return this.survey?.status === 'published';
  }
  
}