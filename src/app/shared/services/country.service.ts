import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError, shareReplay } from 'rxjs/operators';
import { Country, CountryListResponse, CountrySingleResponse } from '../models/party.models';
import { ApiUrlBuilder } from '../utility/api-url-builder';

// ─────────────────────────────────────────────────────────
//  Service
// ─────────────────────────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class CountryService {
 
 
  // Cache the full list — countries never change at runtime
  private allCountries$?: Observable<Country[]>;
 
  constructor(
    private readonly http: HttpClient,
    private apiUrlBuilder: ApiUrlBuilder
) {}
 
  // ── GET /countries (all, A-Z) ──────────────────────────────────────────
  getAll(): Observable<Country[]> {
    const apiUrl = this.apiUrlBuilder.buildApiUrl('countries');
    if (!this.allCountries$) {
      this.allCountries$ = this.http
        .get<CountryListResponse>(apiUrl)
        .pipe(
          map(r => r.data ?? []),
          catchError(() => of([])),
          shareReplay(1),       // cache result, share across subscribers
        );
    }
    return this.allCountries$;
  }
 
  // ── GET /countries?isoCode=XX ──────────────────────────────────────────
  getByIsoCode(isoCode: string): Observable<Country | null> {
    const apiUrl = this.apiUrlBuilder.buildApiUrl('countries');
    const params = new HttpParams().set('isoCode', isoCode.toUpperCase());
    return this.http
      .get<CountryListResponse>(apiUrl, { params })
      .pipe(
        map(r => r.data?.[0] ?? null),
        catchError(() => of(null)),
      );
  }
 
  // ── GET /countries/:id  (UUID or ISO code) ─────────────────────────────
  getById(id: string): Observable<Country | null> {
    const apiUrl = this.apiUrlBuilder.buildApiUrl(`countries/${id}`);
    return this.http
      .get<CountrySingleResponse>(apiUrl)
      .pipe(
        map(r => r.data ?? null),
        catchError(() => of(null)),
      );
  }
 
  // ── Helper: name from id (uses cached list) ────────────────────────────
  getNameById(id: string): Observable<string> {
    return this.getAll().pipe(
      map(list => list.find(c => c.id === id)?.name ?? ''),
    );
  }
}