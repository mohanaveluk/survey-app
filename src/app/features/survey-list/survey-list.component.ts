import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { SurveyService } from '../../shared/services/survey.service';
import { Survey } from '../../shared/models/survey.model';
import { AuthService } from '../../auth/auth.service';
import { SharedModule } from '../../shared/shared.module';

@Component({
  selector: 'app-survey-list',
  templateUrl: './survey-list.component.html',
  styleUrls: ['./survey-list.component.scss'],
  imports: [SharedModule]
})
export class SurveyListComponent implements OnInit {
  mySurveys: Survey[] = [];
  isLoading = true;

  constructor(
    private surveyService: SurveyService,
    private authService: AuthService,
    private router: Router,
    private cd: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadMySurveys();
  }

  private loadMySurveys(): void {
    const currentUser = this.authService.currentUserValue; //getUser()
    if (currentUser) {
      this.surveyService.getMySurveys(currentUser.id).subscribe({
        next: (surveys) => {
          this.mySurveys = surveys.data || [];
          this.isLoading = false;
          this.cd.detectChanges();
        },
        error: (error) => {
          console.error('Failed to load surveys:', error);
          this.isLoading = false;
          this.cd.detectChanges();
        }
      });
    } else {
      this.router.navigate(['/login']);
    }
  }

  createNewSurvey(): void {
    this.router.navigate(['/survey/create']);
  }

  manageSurvey(surveyId: string): void {
    this.router.navigate(['/survey/manage', surveyId]);
  }

  getSurveyUrl(surveyId: string): string {
    const currentUser = this.authService.currentUserValue; //getUser()
    return this.surveyService.getSurveyUrl(surveyId, currentUser?.identity || '');
  }

  copyUrl(surveyId: string, event: Event): void {
    event.stopPropagation();
    const url = this.getSurveyUrl(surveyId);
    navigator.clipboard.writeText(url);
  }
}