import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, map, Observable, of } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})

export class ApiUrlBuilder {
    apikey: string = "6a5779cd4ec7dd4f27fd68d406381571";


constructor(
    public  _httpClient: HttpClient
) { }

  public getApiUrl(){
    return `${environment.apiUrl}`;
  }

  public buildApiUrl(endpoint: string) {
    return `${environment.apiUrl}/v1/${endpoint.replace('/api', '')}`;
  }

  public buildPath(endpoint: string) {
    return endpoint.indexOf('http') >= 0 ? endpoint : `${environment.apiUrl}/${endpoint}`;
  }

  public getNoAuthHeader() {
    return new HttpHeaders().append('No-Auth', 'True')
  }

  public isFileExists(url: string): Observable<boolean> {
    var r = this._httpClient.get(url).pipe(map(() => true), catchError(() => of(false)));
    return r;
  }

}