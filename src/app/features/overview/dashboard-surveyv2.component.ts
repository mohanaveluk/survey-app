import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Party, Survey, SurveyStatistics } from '../../shared/models/survey.model';
import { SurveyService } from '../../shared/services/survey.service';
import { AuthService } from '../../auth/auth.service';
import { Router } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';

@Component({
  selector: 'app-dashboard-survey',
  imports: [SharedModule],
  templateUrl: './dashboard-surveyv2.component.html',
  styleUrl: './dashboard-surveyv2.component.scss',
})
export class DashboardSurveyv2Component implements OnInit {

  mySurveys:     Survey[]           = [];
  selectedSurvey: Survey | null     = null;
  statistics:    SurveyStatistics | null = null;

  isLoading      = true;
  isLoadingStats = false;

  // kept for future use / compatibility
  chartData:       any[] = [];
  genderChartData: any[] = [];

  // SVG donut constants
  private readonly DONUT_CIRCUMFERENCE = 2 * Math.PI * 72; // r = 72
  private readonly ARC_GAP_PX = 0; // visible gap between segments in pixels

  constructor(
    private surveyService: SurveyService,
    private authService:   AuthService,
    private router:        Router,
    private cd:            ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadMySurveys();
  }

  // ── Data loading ──────────────────────────────────────────────────────────

  private loadMySurveys(): void {
    const currentUser = this.authService.currentUserValue;
    if (currentUser) {
      this.surveyService.getMySurveys(currentUser.id.toString()).subscribe({
        next: (surveys) => {
          this.mySurveys = surveys.data || [];
          this.isLoading = false;
          if (this.mySurveys.length > 0) {
            this.selectSurvey(this.mySurveys[0]);
          }
          this.cd.detectChanges();
        },
        error: (error) => {
          console.error('Failed to load surveys:', error);
          this.isLoading = false;
          this.cd.detectChanges();
        },
      });
    } else {
      this.router.navigate(['/login']);
    }
  }

  selectSurvey(survey: Survey): void {
    this.selectedSurvey = survey;
    this.isLoadingStats = true;
    this.statistics     = null;
    this.loadStatistics(survey.id);
  }

  private loadStatistics(surveyId: string): void {
    this.surveyService.getSurveyStatistics(surveyId).subscribe({
      next: (stats) => {
        this.statistics    = stats;
        this.isLoadingStats = false;
        this.prepareChartData();
        this.cd.detectChanges();
      },
      error: (error) => {
        console.error('Failed to load statistics:', error);
        this.isLoadingStats = false;
        this.cd.detectChanges();
      },
    });
  }

  private prepareChartData(): void {
    if (!this.statistics || !this.selectedSurvey) return;

    this.chartData = this.selectedSurvey.surveyParties!.map(party => ({
      name:  party.party.name,
      value: this.statistics!.votesByParty[party.party.id!] || 0,
      color: party.party.color,
    }));

    this.genderChartData = [
      { name: 'Male',   value: this.statistics.votesByGender.male },
      { name: 'Female', value: this.statistics.votesByGender.female },
      { name: 'Other',  value: this.statistics.votesByGender.other },
    ].filter(item => item.value > 0);
  }

  // ── Party vote helpers ────────────────────────────────────────────────────

  getVotePercentage(partyId: string): number {
    if (!this.statistics || this.statistics.totalVotes === 0) return 0;
    const votes = this.statistics.votesByParty[partyId] || 0;
    return Math.round((votes / this.statistics.totalVotes) * 100);
  }

  getLeadingParty(): Party | null {
    if (!this.statistics || !this.selectedSurvey || this.statistics.totalVotes === 0) return null;

    let maxVotes = 0;
    let leadingPartyId = '';
    Object.entries(this.statistics.votesByParty).forEach(([partyId, votes]) => {
      if (votes > maxVotes) { maxVotes = votes; leadingPartyId = partyId; }
    });

    return this.selectedSurvey.surveyParties?.find(p => p.party.id === leadingPartyId)?.party || null;
  }

  // ── Gender helpers ────────────────────────────────────────────────────────

  getGenderPercentage(gender: 'male' | 'female' | 'other'): number {
    if (!this.statistics || this.statistics.totalVotes === 0) return 0;
    return Math.round((this.statistics.votesByGender[gender] / this.statistics.totalVotes) * 100);
  }

  getGenderVotesForParty(partyId: string, gender: 'male' | 'female' | 'other'): number {
    if (!this.statistics) return 0;
    return this.statistics.genderByParty[partyId]?.[gender] || 0;
  }

  /** Gender % within a specific party's total votes — used in the table */
  getGenderPctForParty(partyId: string, gender: 'male' | 'female' | 'other'): number {
    if (!this.statistics) return 0;
    const partyTotal = this.statistics.votesByParty[partyId] || 0;
    if (partyTotal === 0) return 0;
    const genderVotes = this.getGenderVotesForParty(partyId, gender);
    return Math.round((genderVotes / partyTotal) * 100);
  }

  // ── Stacked bar chart helpers ─────────────────────────────────────────────

  /** Width % of a gender segment relative to the leading party's total (normalised) */
  getGenderSegmentWidth(partyId: string, gender: 'male' | 'female' | 'other'): number {
    if (!this.statistics || this.statistics.totalVotes === 0) return 0;
    const genderVotes = this.getGenderVotesForParty(partyId, gender);
    return Math.round((genderVotes / this.statistics.totalVotes) * 100);
  }

  // ── SVG Donut arc helpers ─────────────────────────────────────────────────
  // Each arc uses stroke-dasharray / stroke-dashoffset on a circle
  // with circumference = 2π×72 ≈ 452.4 px.
  //
  // stroke-dasharray  = "fillLength circumference"
  // stroke-dashoffset = circumference - (sum of previous segments)

  private arcLength(pct: number): number {
    return (pct / 100) * this.DONUT_CIRCUMFERENCE;
  }

  getMaleArc(): string {
    const fill = this.arcLength(this.getGenderPercentage('male'));
    return `${fill} ${this.DONUT_CIRCUMFERENCE}`;
  }

  getMaleDashOffset(): number {
    return 0; // male starts at 12 o'clock (handled by rotate(-90))
  }

  getFemaleArc(): string {
    const fill = this.arcLength(this.getGenderPercentage('female'));
    return `${fill} ${this.DONUT_CIRCUMFERENCE}`;
  }

  getFemaleOffset(): number {
    // female starts after male arc ends
    const maleLen = this.arcLength(this.getGenderPercentage('male'));
    return this.DONUT_CIRCUMFERENCE - maleLen;
  }

  getOtherArc(): string {
    const fill = this.arcLength(this.getGenderPercentage('other'));
    return `${fill} ${this.DONUT_CIRCUMFERENCE}`;
  }

  getOtherOffset(): number {
    const maleLen   = this.arcLength(this.getGenderPercentage('male'));
    const femaleLen = this.arcLength(this.getGenderPercentage('female'));
    return this.DONUT_CIRCUMFERENCE - maleLen - femaleLen;
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  createNewSurvey():      void { this.router.navigate(['/survey/create']); }
  manageSurvey(id: string): void { this.router.navigate(['/survey/manage', id]); }

  refreshStatistics(): void {
    if (this.selectedSurvey) {
      this.isLoadingStats = true;
      this.loadStatistics(this.selectedSurvey.id);
    }
  }

  getPartyById(partyId: string): Party | undefined {
    return this.selectedSurvey?.surveyParties?.find(p => p.party.id === partyId)?.party;
  }

  // kept for backward-compat (used by existing table rows)
  getVoteMiniPercentage(partyId: string): number {
    return this.getGenderPctForParty(partyId, 'male');
  }

  /**
 * Returns stroke-dasharray for a gender segment.
 * Each arc = its own fill length, with a small gap subtracted,
 * followed by the remaining circumference as empty space.
 */
  getArcDash(gender: 'male' | 'female' | 'other'): string {
    const pct = this.getGenderPercentage(gender);
    const fill = (pct / 100) * this.DONUT_CIRCUMFERENCE;

    // Subtract gap so arcs don't bleed into each other
    const visibleFill = Math.max(0, fill - this.ARC_GAP_PX);
    const emptySpace = this.DONUT_CIRCUMFERENCE - visibleFill;

    return `${visibleFill} ${emptySpace}`;
  }

  getArcOffset(gender: 'male' | 'female' | 'other'): number {
    const maleLen = (this.getGenderPercentage('male') / 100) * this.DONUT_CIRCUMFERENCE;
    const femaleLen = (this.getGenderPercentage('female') / 100) * this.DONUT_CIRCUMFERENCE;

    switch (gender) {
      case 'male':
        // Starts at 12 o'clock — offset = 0
        return 0;

      case 'female':
        // Starts after male arc
        // offset = circumference - maleLen  means "skip maleLen forward"
        return this.DONUT_CIRCUMFERENCE - maleLen;

      case 'other':
        // Starts after male + female arcs
        return this.DONUT_CIRCUMFERENCE - maleLen - femaleLen;
    }
  }

}
