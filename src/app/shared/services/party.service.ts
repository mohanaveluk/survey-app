import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, catchError, map, Observable, of } from 'rxjs';
import { ApiUrlBuilder } from '../utility/api-url-builder';
import { TokenService } from '../../core/services/token.service';
import { Router } from '@angular/router';
import { ApiResponse } from '../models/api-response.model';
import { Party } from '../models/survey.model';
import { AuthService } from '../../auth/auth.service';
import { CreatePartyPayload, PartyMaster } from '../models/party.models';


@Injectable({
  providedIn: 'root'
})
export class PartyService {
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

  createParty(party: Party, logoFile?: File): Observable<Party> {
    const formData = new FormData();
    if(party.name) formData.append("name", party.name);
    if(party.leader_name) formData.append("leader_name", party.leader_name);
    if(party.contestant_name) formData.append("contestant_name", party.contestant_name);
    if(party.color) formData.append("color", party.color);
    if(party.createdBy) formData.append("createdBy", party.createdBy);
    if(party.countryId) formData.append("countryId", party.countryId);
    // logo_url can be null — send it as an empty string so NestJS can clear it
    formData.append('logo_url', party.logo_url ?? '');

    // Append file only if one was selected
    if (logoFile) {
      formData.append('file', logoFile, logoFile.name);
    }
    
    const apiUrl = this.apiUrlBuilder.buildApiUrl('party');
    return this.http.post<Party>(apiUrl, formData);
  }

  updateParty(id: string, party: Partial<Party>, logoFile: File): Observable<Party> {
    const formData = new FormData();
    if(party.name) formData.append("name", party.name);
    if(party.leader_name) formData.append("leader_name", party.leader_name);
    if(party.contestant_name) formData.append("contestant_name", party.contestant_name);
    if(party.color) formData.append("color", party.color);
    if(party.createdBy) formData.append("createdBy", party.createdBy);
    if(party.countryId) formData.append("countryId", party.countryId);

    // logo_url can be null — send it as an empty string so NestJS can clear it
    formData.append('logo_url', party.logo_url ?? '');

    // Append file only if one was selected
    if (logoFile) {
      formData.append('file', logoFile, logoFile.name);
    }
    const apiUrl = this.apiUrlBuilder.buildApiUrl(`party/${id}`);
    return this.http.patch<Party>(apiUrl, formData);
  }

  deleteParty(id: string): Observable<void> {
    const apiUrl = this.apiUrlBuilder.buildApiUrl(`party/${id}`);
    return this.http.delete<void>(apiUrl);
  }

  uploadImage(file: File): Observable<{ imageUrl: string }> {
    const formData = new FormData();
    formData.append('file', file, file.name);
    const url = this.apiUrlBuilder.buildApiUrl('auth/profile/image');
    return this.http.post<{ imageUrl: string }>(url, formData);
  }

  getAllLogoImages(): Observable<{ imageUrl: string }[]> {
    const url = this.apiUrlBuilder.buildApiUrl('party/logos');
    return this.http.get<{ imageUrl: string }[]>(url).pipe(
        map((r: any) => r.data ?? r as any),
        catchError(() => of([])),
      );
  }

  /* Party Master */
  getMasterParties1(): Observable<PartyMaster[]> {
    const apiUrl = this.apiUrlBuilder.buildApiUrl('party_master');
    return this.http
      .get<PartyMaster[]>(apiUrl)
      .pipe(
        // Sort client-side too — ensures alphabetical even if API changes
        map(parties  => [...parties].sort((a, b) => a.name.localeCompare(b.name)))
      );
  }

  getMasterParties(): Observable<any[]> {
  const apiUrl = this.apiUrlBuilder.buildApiUrl('party_master');
  return this.http.get<any>(apiUrl).pipe(
    map(response => {
      const list = Array.isArray(response)
        ? response                      // plain array (future-proof)
        : Array.isArray(response?.data)
          ? response.data               // ✅ unwraps { status, data:[...] }
          : [];
      return list.sort((a: any, b: any) => a.name.localeCompare(b.name));
    })
  );
}

  // ─── 2. Create one party in the user's party table ──────────────────────
  //        (Already exists in most implementations as createParty / addParty)
  //        If not already present, add:
  createPartyMaster(payload: CreatePartyPayload): Observable<any> {
    // If no file, send plain JSON
      const apiUrl = this.apiUrlBuilder.buildApiUrl('party_master');
    if (!payload.logo_file) {
      return this.http.post(apiUrl, {
        name:            payload.name,
        leader_name:     payload.leader_name,
        contestant_name: payload.contestant_name,
        color:           payload.color,
        logo_url:        payload.logo_url,
      });
    }
 
    // If a file is attached, use FormData
    const fd = new FormData();
    fd.append('name',  payload.name);
    if (payload.leader_name)     fd.append('leader_name',     payload.leader_name);
    if (payload.contestant_name) fd.append('contestant_name', payload.contestant_name);
    if (payload.color)           fd.append('color',           payload.color);
    if (payload.logo_url)        fd.append('logo_url',        payload.logo_url);
    fd.append('file', payload.logo_file);
    return this.http.post(`${apiUrl}/party`, fd);
  }
 

    
}
