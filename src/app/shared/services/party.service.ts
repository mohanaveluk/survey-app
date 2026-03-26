import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { ApiUrlBuilder } from '../utility/api-url-builder';
import { TokenService } from '../../core/services/token.service';
import { Router } from '@angular/router';
import { ApiResponse } from '../models/api-response.model';
import { Party } from '../models/survey.model';
import { AuthService } from '../../auth/auth.service';


@Injectable({
  providedIn: 'root'
})
export class PartyService {
  private apiUrl = 'http://localhost:3000/api/v1/party';
  private partiesSubject = new BehaviorSubject<Party[]>([]);
  public parties$ = this.partiesSubject.asObservable();

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private apiUrlBuilder: ApiUrlBuilder,
    private tokenService: TokenService,
    private router: Router,
) {
    const currentUser = this.authService.currentUserValue;
    if (currentUser) {
        this.loadParties(currentUser.id.toString());
    } else {
        if (!currentUser && this.router.url.includes('/vote') === false) {
            this.router.navigate(['/login']);
        }
    }
  }

  loadParties(currentUserId: string): void {
    this.getAllParties(currentUserId).subscribe({
      next: (parties) => {
        this.partiesSubject.next(parties?.data || []);
      },
      error: (error) => {
        console.error('Failed to load parties:', error);
      }
    });
  }

  getAllParties(currentUserId: string): Observable<ApiResponse<Party[]>> {
    const loadPartyApi = this.apiUrlBuilder.buildApiUrl(`party?userId=${currentUserId}`);
    return this.http.get<ApiResponse<Party[]>>(loadPartyApi);
  }

  getPartyById(id: string): Observable<Party> {
    const apiUrl = this.apiUrlBuilder.buildApiUrl(`party/${id}`);
    return this.http.get<Party>(apiUrl);
  }

  createParty(party: Party): Observable<Party> {
    const apiUrl = this.apiUrlBuilder.buildApiUrl('party');
    return this.http.post<Party>(apiUrl, party);
  }

  updateParty(id: string, party: Partial<Party>): Observable<Party> {
    const apiUrl = this.apiUrlBuilder.buildApiUrl(`party/${id}`);
    return this.http.patch<Party>(apiUrl, party);
  }

  deleteParty(id: string): Observable<void> {
    const apiUrl = this.apiUrlBuilder.buildApiUrl(`party/${id}`);
    return this.http.delete<void>(apiUrl);
  }
}
