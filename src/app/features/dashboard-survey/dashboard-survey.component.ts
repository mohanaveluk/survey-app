import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Party, Survey, SurveyStatistics } from '../../shared/models/survey.model';
import { SurveyService } from '../../shared/services/survey.service';
import { AuthService } from '../../auth/auth.service';
import { Router } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';

@Component({
  selector: 'app-dashboard-survey',
  imports: [SharedModule],
  templateUrl: './dashboard-survey.component.html',
  styleUrl: './dashboard-survey.component.scss',
})
export class DashboardSurveyComponent  implements OnInit {
mySurveys: Survey[] = [];
  selectedSurvey: Survey | null = null;
  statistics: SurveyStatistics | null = null;
  isLoading = true;
  isLoadingStats = false;

  chartData: any[] = [];
  genderChartData: any[] = [];

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
    const currentUser = this.authService.currentUserValue;
    if (currentUser) {
      this.surveyService.getMySurveys(currentUser.id.toString()).subscribe({
        next: (surveys) => {
          this.mySurveys = surveys.data || [];
          this.isLoading = false;
          if (this.mySurveys.length > 0) {
            this.selectSurvey(this.mySurveys[0]);
            this.isLoading = false;
          }
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

  selectSurvey(survey: Survey): void {
    this.selectedSurvey = survey;
    this.isLoadingStats = true;
    this.loadStatistics(survey.id);
  }

  private loadStatistics(surveyId: string): void {
    this.surveyService.getSurveyStatistics(surveyId).subscribe({
      next: (stats) => {
        this.statistics = stats;
        this.prepareChartData();
        this.isLoadingStats = false;
        this.cd.detectChanges();

      },
      error: (error) => {
        console.error('Failed to load statistics:', error);
        this.isLoadingStats = false;
      }
    });
  }

  private prepareChartData(): void {
    if (!this.statistics || !this.selectedSurvey) {
      return;
    }

    this.chartData = this.selectedSurvey.surveyParties!.map(party => ({
      name: party.party.name,
      value: this.statistics!.votesByParty[party.party.id!] || 0,
      color: party.party.color
    }));

    this.genderChartData = [
      { name: 'Male', value: this.statistics.votesByGender.male },
      { name: 'Female', value: this.statistics.votesByGender.female },
      { name: 'Other', value: this.statistics.votesByGender.other }
    ].filter(item => item.value > 0);
  }

  getVotePercentage(partyId: string): number {
    if (!this.statistics || this.statistics.totalVotes === 0) {
      return 0;
    }
    const votes = this.statistics.votesByParty[partyId] || 0;
    return Math.round((votes / this.statistics.totalVotes) * 100);
  }

  getGenderPercentage(gender: 'male' | 'female' | 'other'): number {
    if (!this.statistics || this.statistics.totalVotes === 0) {
      return 0;
    }
    const votes = this.statistics.votesByGender[gender];
    return Math.round((votes / this.statistics.totalVotes) * 100);
  }

  getGenderVotesForParty(partyId: string, gender: 'male' | 'female' | 'other'): number {
    if (!this.statistics) {
      return 0;
    }
    return this.statistics.genderByParty[partyId]?.[gender] || 0;
  }

  getLeadingParty(): Party | null {
    if (!this.statistics || !this.selectedSurvey || this.statistics.totalVotes === 0) {
      return null;
    }

    let maxVotes = 0;
    let leadingPartyId = '';

    Object.entries(this.statistics.votesByParty).forEach(([partyId, votes]) => {
      if (votes > maxVotes) {
        maxVotes = votes;
        leadingPartyId = partyId;
      }
    });

    return this.selectedSurvey.surveyParties?.find(p => p.party.id === leadingPartyId)?.party || null;
  }

  createNewSurvey(): void {
    this.router.navigate(['/survey/create']);
  }

  manageSurvey(surveyId: string): void {
    this.router.navigate(['/survey/manage', surveyId]);
  }

  refreshStatistics(): void {
    if (this.selectedSurvey) {
      this.isLoadingStats = true;
      this.loadStatistics(this.selectedSurvey.id);
    }
  }

  getPartyById(partyId: string): Party | undefined {
    return this.selectedSurvey?.surveyParties?.find(p => p.party.id === partyId)?.party;
  }

  getVoteMiniPercentage(partyId: string): number {
    if (!this.statistics || (this.statistics && this.statistics.votesByParty[partyId] <= 0)) {
      return 0;
    }
    const votes = this.statistics.votesByParty[partyId] || 0;
    return Math.round((this.getGenderVotesForParty(partyId, 'male') / votes) * 100);
  }
}
