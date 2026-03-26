import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiUrlBuilder } from '../../../shared/utility/api-url-builder';

@Injectable({
  providedIn: 'root'
})
export class PasswordResetService {
  constructor(
    private http: HttpClient,
    private apiUrlBuilder: ApiUrlBuilder
  ) {}

  requestReset(email: string): Observable<any> {
    const url = this.apiUrlBuilder.buildApiUrl('auth/password-reset/request');
    return this.http.post(url, { email });
  }

  resetPassword(token: string, password: string): Observable<any> {
    const url = this.apiUrlBuilder.buildApiUrl('auth/password-reset/reset');
    return this.http.post(url, { token, password });
  }
}