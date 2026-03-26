import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class EmailService {
  private apiUrl = 'http://your-api-url/send-email';

  constructor(private http: HttpClient) {}

  sendEmail(email: string, notes: string, productId: string): Observable<any> {
    const body = { email, notes, productId };
    return this.http.post(this.apiUrl, body).pipe(
      catchError((error: HttpErrorResponse) => {
        console.error('Error sending email:', error);
        return throwError(() => new Error('Failed to send email'));
      })
    );
  }
}