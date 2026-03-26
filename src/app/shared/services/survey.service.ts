import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, map, Observable, of, switchMap, take } from 'rxjs';
import { Party, Survey, Vote, SurveyResult, SurveyStatistics, SurveyParty, TemporaryVote } from '../models/survey.model';
import { ApiUrlBuilder } from '../utility/api-url-builder';
import { PartyService } from './party.service';
import { ApiResponse } from '../models/api-response.model';

@Injectable({
  providedIn: 'root'
})
export class SurveyService {
  private apiUrl = 'http://localhost:3000/api';
  private surveysSubject = new BehaviorSubject<Survey[]>([]);
  private allParties: Party[] = [];
  public surveys$ = this.surveysSubject.asObservable();

  // Mock data for parties
  private availableParties: Party[] = [
    { id: '1', name: 'Democratic Party', color: '#1976d2' },
    { id: '2', name: 'Republican Party', color: '#d32f2f' },
    { id: '3', name: 'Green Party', color: '#388e3c' },
    { id: '4', name: 'Libertarian Party', color: '#f57c00' },
    { id: '5', name: 'Independent', color: '#7b1fa2' },
    { id: '6', name: 'Socialist Party', color: '#c2185b' },
    { id: '7', name: 'Constitution Party', color: '#5d4037' },
    { id: '8', name: 'Reform Party', color: '#455a64' }
  ];

  // Mock storage
  private surveys: Survey[] = [];
  private votes: Vote[] = [];

  constructor(
    private http: HttpClient, 

    private apiUrlBuilder: ApiUrlBuilder,
    private partyService: PartyService
  ) {
    this.loadMockData();
  }

  private loadMockData(): void {
    const storedSurveys = localStorage.getItem('surveys');
    const storedVotes = localStorage.getItem('votes');
    
    if (storedSurveys) {
      this.surveys = JSON.parse(storedSurveys);
    }
    if (storedVotes) {
      this.votes = JSON.parse(storedVotes);
    }
    
    this.surveysSubject.next(this.surveys);
  }

  private saveToStorage(): void {
    localStorage.setItem('surveys', JSON.stringify(this.surveys));
    localStorage.setItem('votes', JSON.stringify(this.votes));
  }

  getAvailableParties(): Observable<Party[]> {
    return of(this.availableParties);
  }

  fetchAvailableParties(): Observable<Party[]> {
    const partyResponse = this.partyService.parties$;
    partyResponse.subscribe(parties => {
      this.allParties = parties;
    });
    //this.partyService.loadParties();
    return of(this.allParties);
  }

  createSurvey_old(surveyData: { name: string; description?: string; selectedPartyIds: string[]; startDate?: Date; endDate?: Date }, createdBy: string): Observable<Survey> {
    const selectedParties = this.availableParties.filter(party => 
      surveyData.selectedPartyIds.includes(party.id!)
    );

    const today = new Date();
    const fifteenDaysLater = new Date(today);
    fifteenDaysLater.setDate(fifteenDaysLater.getDate() + 15);

    const survey: Survey = {
      id: this.generateId(),
      name: surveyData.name,
      description: surveyData.description,
      parties: selectedParties,
      createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true,
      totalVotes: 0,
      status: 'draft',
      isAnonymous: true,
      startDate: surveyData.startDate || today,
      endDate: surveyData.endDate || fifteenDaysLater
    };

    this.surveys.push(survey);
    this.saveToStorage();
    this.surveysSubject.next(this.surveys);
    return of(survey);
  }

  createSurvey(surveyData: { name: string; description?: string; selectedPartyIds: string[]; startDate?: Date; endDate?: Date }, createdBy: string): Observable<ApiResponse<Survey>> {
    const surveyApi = this.apiUrlBuilder.buildApiUrl('survey');
    return this.partyService.parties$.pipe(
      take(1),
      map(parties => {
        const selectedParties = parties.filter(party =>
          surveyData.selectedPartyIds.includes(party.id!)
        );

        const today = new Date();
        const fifteenDaysLater = new Date(today);
        fifteenDaysLater.setDate(fifteenDaysLater.getDate() + 15);

        const survey: Survey = {
          id: this.generateId(),
          name: surveyData.name,
          description: surveyData.description,
          parties: selectedParties,
          partyIds: selectedParties.map(p => p.id!),
          createdBy,
          createdAt: new Date(),
          updatedAt: new Date(),
          isActive: true,
          totalVotes: 0,
          status: 'draft',
          isAnonymous: true,
          startDate: surveyData.startDate || today,
          endDate: surveyData.endDate || fifteenDaysLater
        };
        return survey;
      }),
      // ✅ call API using result from above
      switchMap(payload =>
        this.http.post<ApiResponse<Survey>>(surveyApi, payload)
      )
    );
  }

  getSurveyById_old(id: string): Observable<Survey | null> {
    const survey = this.surveys.find(s => s.id === id);
    return of(survey || null);
  }

  getSurveyById(id: string): Observable<ApiResponse<Survey> | null> {
    const surveyApi = this.apiUrlBuilder.buildApiUrl(`survey/${id}`);
    return this.http.get<ApiResponse<Survey>>(`${surveyApi}`);
  }

  getMySurveys_old(userId: string): Observable<Survey[]> {
    const mySurveys = this.surveys.filter(s => s.createdBy === userId);
    return of(mySurveys);
  }

  getMySurveys(userId: string): Observable<ApiResponse<Survey[]>> {
    const surveyApi = this.apiUrlBuilder.buildApiUrl(`survey/u/${userId}`);
    return this.http.get<ApiResponse<Survey[]>>(`${surveyApi}`);
  }

  hasUserVoted_old(surveyId: string, userEmail: string): Observable<boolean> {
    const hasVoted = this.votes.some(v => v.surveyId === surveyId && v.voterEmail === userEmail);
    return of(hasVoted);
  }

  hasUserVoted(surveyId: string, userEmail: string): Observable<ApiResponse<any>> {
    const voteApi = this.apiUrlBuilder.buildApiUrl(`vote/check-voter?surveyId=${surveyId}&email=${encodeURIComponent(userEmail)}`);
    return this.http.get<ApiResponse<any>>(`${voteApi}`); //.pipe(
      //map(response => response.data?.hasVoted || false)
    //);
  }

  submitVote_old(surveyId: string, partyId: string, voterEmail: string, gender?: 'male' | 'female' | 'other', age?: number, location?: string): Observable<Vote> {
    const vote: Vote = {
      id: this.generateId(),
      surveyId,
      partyId,
      voterEmail,
      votedAt: new Date(),
      gender,
      age,
      location
    };

    this.votes.push(vote);
    
    // Update survey total votes
    const survey = this.surveys.find(s => s.id === surveyId);
    if (survey) {
      survey.totalVotes++;
    }

    this.saveToStorage();
    this.surveysSubject.next(this.surveys);

    return of(vote);
  }

  submitVote(surveyId: string, partyId: string, voterEmail: string, gender?: 'male' | 'female' | 'other', age?: number, location?: string): Observable<ApiResponse<Vote>> {
    const voteApi = this.apiUrlBuilder.buildApiUrl(`vote/survey/${surveyId}`);
    const vote: Vote = {
      id: this.generateId(),
      surveyId: surveyId,
      partyId: partyId,
      voterEmail: voterEmail,
      votedAt: new Date(),
      gender,
      age,
      location
    };
    return this.http.post<ApiResponse<Vote>>(voteApi, vote);
  }

    requestVote(surveyId: string, partyId: string, voterEmail: string, gender?: 'male' | 'female' | 'other', age?: number, location?: string): Observable<ApiResponse<TemporaryVote>> {
    const voteApi = this.apiUrlBuilder.buildApiUrl(`vote/survey/${surveyId}`);
    const vote: Vote = {
      id: this.generateId(),
      surveyId: surveyId,
      partyId: partyId,
      voterEmail: voterEmail,
      votedAt: new Date(),
      gender,
      age,
      location
    };
    return this.http.post<ApiResponse<TemporaryVote>>(voteApi, vote);
  }

  // ── NEW: Step 2 — Verify OTP and confirm vote ────────────────────────────
  //  POST /api/v1/vote/verify
  //  Body:  { surveyId, voteRequestId, code }
  //  Returns: 200 OK on success, 4xx on failure
  verifyVote(
    surveyId:      string,
    voteRequestId: string,
    emailId:       string,
    code:          string,
  ): Observable<any> {
    const verifyVoteRequest = {tempVoteId: voteRequestId, surveyId: surveyId, voterEmail: emailId, verificationCode: code};
    const voteApi = this.apiUrlBuilder.buildApiUrl(`vote/verify`);
    return this.http.post(`${voteApi}`, verifyVoteRequest);
  }


// ── NEW: Resend OTP (reuses requestVoteOtp endpoint) ────────────────────
  //  The dialog calls this when the user clicks "Resend".
  //  You can point it to a dedicated /resend endpoint or reuse POST /vote.
  //  Here we POST to /api/v1/vote/resend.
  requestVoteOtp(surveyId: string, voterEmail: string): Observable<any> {
    const voteApi = this.apiUrlBuilder.buildApiUrl(`vote/resend`);
    return this.http.post(`${voteApi}`, {
      surveyId,
      voterEmail,
    });
  }

  getSurveyResults_old(surveyId: string): Observable<SurveyResult | null> {
    const survey = this.surveys.find(s => s.id === surveyId);
    if (!survey) {
      return of(null);
    }

    const surveyVotes = this.votes.filter(v => v.surveyId === surveyId);
    const votesByParty: { [partyId: string]: number } = {};

    // Initialize vote counts
    survey.parties.forEach(party => {
      votesByParty[party.id!] = 0;
    });

    // Count votes
    surveyVotes.forEach(vote => {
      votesByParty[vote.partyId]++;
    });

    const result: SurveyResult = {
      survey,
      votes: votesByParty,
      totalVotes: surveyVotes.length
    };

    return of(result);
  }

  getSurveyResults(surveyId: string): Observable<SurveyResult | null> {


    const surveyApi = this.apiUrlBuilder.buildApiUrl(`survey/${surveyId}`);
    return this.http.get<any>(surveyApi).pipe(
      map(apiResult => {
        if (!apiResult) {
          return null;
        }
        const survey = apiResult.data!;
        const surveyVotes = survey.votes || [];
        const votesByParty: { [partyId: string]: number } = {};

        survey.surveyParties?.forEach((sp: { party: { id: any; }; }) => {
          votesByParty[sp.party.id!] = 0;
        });

        // Count votes
        surveyVotes.forEach((vote: Vote) => {
          if (!votesByParty[vote.partyId]) {
            votesByParty[vote.partyId] = 0;
          }
          votesByParty[vote.partyId]++;
        });

        const result: SurveyResult = {
          survey,
          votes: votesByParty,
          totalVotes: surveyVotes.length
        };
        return result;
      })
    );
  }

  toggleSurveyStatus_old(surveyId: string): Observable<Survey | null> {
    const survey = this.surveys.find(s => s.id === surveyId);
    if (survey) {
      survey.isActive = !survey.isActive;
      this.saveToStorage();
      this.surveysSubject.next(this.surveys);
    }
    return of(survey || null);
  }

  
  toggleSurveyStatus(surveyId: string): Observable<ApiResponse<Survey> | null> {
    const surveyApi = this.apiUrlBuilder.buildApiUrl(`survey/${surveyId}/toggle-status`);
    return this.http.put<ApiResponse<Survey>>(surveyApi, {}).pipe(
      map(apiSurvey => apiSurvey || null)
    );
  }

  publishSurvey_old(surveyId: string): Observable<Survey | null> {
    const survey = this.surveys.find(s => s.id === surveyId);
    if (survey && survey.status === 'draft') {
      survey.status = 'published';
      survey.updatedAt = new Date();
      survey.isActive = true;
      this.saveToStorage();
      this.surveysSubject.next(this.surveys);
    }
    return of(survey || null);
  }

  publishSurvey(surveyId: string): Observable<ApiResponse<Survey> | null> {
    const surveyApi = this.apiUrlBuilder.buildApiUrl(`survey/${surveyId}/publish`);
    return this.http.put<ApiResponse<Survey>>(surveyApi, {}).pipe(
      map(apiSurvey => apiSurvey || null)
    );
  }

  updateSurvey_old(surveyId: string, updates: Partial<Survey>): Observable<Survey | null> {
    const survey = this.surveys.find(s => s.id === surveyId);
    if (survey && survey.status === 'draft') {
      Object.assign(survey, updates);
      survey.updatedAt = new Date();
      this.saveToStorage();
      this.surveysSubject.next(this.surveys);
    }
    return of(survey || null);
  }

  updateSurvey(surveyId: string, updates: { name: string; description?: string; selectedPartyIds: string[]; startDate?: Date; endDate?: Date }, createdBy: string): Observable<ApiResponse<Survey>>{
    const surveyApi = this.apiUrlBuilder.buildApiUrl(`survey/${surveyId}`);
    const survey: Survey = {
      id: surveyId,
      name: updates.name || '',
      description: updates.description,
      parties: null!, // This will be set by the backend based on selectedPartyIds
      partyIds: updates.selectedPartyIds,
      createdBy: createdBy || '',
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true,
      totalVotes: 0,
      status: 'draft',
      isAnonymous: true,
      startDate: updates.startDate || new Date(),
      endDate: updates.endDate || new Date()
    }

    return this.http.patch<ApiResponse<Survey>>(surveyApi, survey);
    
  }

  closeSurvey_old(surveyId: string): Observable<Survey | null> {
    const survey = this.surveys.find(s => s.id === surveyId);
    if (survey && survey.status === 'published') {
      survey.status = 'closed';
      survey.updatedAt = new Date();
      survey.isActive = false;
      this.saveToStorage();
      this.surveysSubject.next(this.surveys);
    }
    return of(survey || null);
  }

  closeSurvey(surveyId: string): Observable<ApiResponse<Survey> | null>{
    const surveyApi = this.apiUrlBuilder.buildApiUrl(`survey/${surveyId}/close`);
    return this.http.put<ApiResponse<Survey>>(surveyApi, {status: "closed"}).pipe(
      map(apiSurvey => apiSurvey || null)
    );
  }
  
  private generateId(): string {
    return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  }

  getSurveyUrl(surveyId: string): string {
    return `${window.location.origin}/vote/${surveyId}`;
  }

  getSurveyStatistics(surveyId: string): Observable< SurveyStatistics | null> {
    const surveyApi = this.apiUrlBuilder.buildApiUrl(`survey/${surveyId}`);
    return this.http.get<any>(surveyApi).pipe(
      map(apiSurvey => {
        if (!apiSurvey) {
          return null;
        }
        
        const survey = apiSurvey.data!;
        const surveyVotes = apiSurvey.data!.votes || [];

        // Initialize vote counts by party
        const votesByParty: { [partyId: string]: number } = {};
        survey.surveyParties.forEach((party: SurveyParty) => {
          votesByParty[party.party.id!] = 0;
        });

        // Initialize gender statistics
        const votesByGender = {
          male: 0,
          female: 0,
          other: 0
        };

        // Initialize gender by party
        const genderByParty: { [partyId: string]: { male: number; female: number; other: number } } = {};
        survey.surveyParties.forEach((party: SurveyParty) => {
          genderByParty[party.party.id!] = { male: 0, female: 0, other: 0 };
        });

        // Process all votes
        surveyVotes.forEach((vote: Vote) => {
          // Count votes by party
          if (votesByParty[vote.partyId] !== undefined) {
            votesByParty[vote.partyId]++;
          }

          // Count votes by gender
          if (vote.gender) {
            votesByGender[vote.gender]++;

            // Count gender by party
            if (genderByParty[vote.partyId]) {
              genderByParty[vote.partyId][vote.gender]++;
            }
          }
        });

        // Calculate voting trend (group votes by day)
        const votingTrend = this.calculateVotingTrend(surveyVotes);

        // Calculate participation rate
        const participationRate = surveyVotes.length > 0 ? 100 : 0;

        const statistics: SurveyStatistics = {
          survey,
          totalVotes: surveyVotes.length,
          votesByParty,
          votesByGender,
          genderByParty,
          votingTrend,
          participationRate
        };

        return statistics;
      })
    );

    // const survey = this.surveys.find(s => s.id === surveyId);
    // if (!survey) {
    //   return of(null);
    // }

    // const surveyVotes = this.votes.filter(v => v.surveyId === surveyId);

    // // Initialize vote counts by party
    // const votesByParty: { [partyId: string]: number } = {};
    // survey.parties.forEach(party => {
    //   votesByParty[party.id!] = 0;
    // });

    // // Initialize gender statistics
    // const votesByGender = {
    //   male: 0,
    //   female: 0,
    //   other: 0
    // };

    // // Initialize gender by party
    // const genderByParty: { [partyId: string]: { male: number; female: number; other: number } } = {};
    // survey.parties.forEach(party => {
    //   genderByParty[party.id!] = { male: 0, female: 0, other: 0 };
    // });

    // // Process all votes
    // surveyVotes.forEach(vote => {
    //   // Count votes by party
    //   if (votesByParty[vote.partyId] !== undefined) {
    //     votesByParty[vote.partyId]++;
    //   }

    //   // Count votes by gender
    //   if (vote.gender) {
    //     votesByGender[vote.gender]++;

    //     // Count gender by party
    //     if (genderByParty[vote.partyId]) {
    //       genderByParty[vote.partyId][vote.gender]++;
    //     }
    //   }
    // });

    // // Calculate voting trend (group votes by day)
    // const votingTrend = this.calculateVotingTrend(surveyVotes);

    // // Calculate participation rate (assuming 100% for now since we don't have target audience data)
    // const participationRate = surveyVotes.length > 0 ? 100 : 0;

    // const statistics: SurveyStatistics = {
    //   survey,
    //   totalVotes: surveyVotes.length,
    //   votesByParty,
    //   votesByGender,
    //   genderByParty,
    //   votingTrend,
    //   participationRate
    // };

    // return of(statistics);
  }

  private calculateVotingTrend(votes: Vote[]): { date: Date; count: number }[] {
    const trendMap = new Map<string, number>();

    votes.forEach(vote => {
      const dateKey = new Date(vote.votedAt).toDateString();
      trendMap.set(dateKey, (trendMap.get(dateKey) || 0) + 1);
    });

    const trend = Array.from(trendMap.entries())
      .map(([dateStr, count]) => ({
        date: new Date(dateStr),
        count
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    return trend;
  }
}