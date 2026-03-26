import { Inject, Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { TokenService } from '../services/token.service';
import { AuthService } from '../../auth/auth.service';
import { CommonService } from '../../shared/services/common.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private isRefreshing = false;


  constructor(
    private tokenService: TokenService,
    private authService: AuthService,
    private commonService: CommonService,
    private snackBar: MatSnackBar,
    private router: Router,
    private dialog: MatDialog
  ) { }

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const accessToken = this.tokenService.getToken();

    if (accessToken) {
      request = this.addToken(request, accessToken);
    }

    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        if (this.commonService.isNullOrEmpty(error) || (this.commonService.isNullOrEmpty(error) && this.commonService.isNullOrEmpty(error.error))) {
          return throwError(() => "invalid user");
        }

        if (error.status === 0) {
          return throwError(() => "Looks like API service is unavailable");
        }
        else if (error.error.message?.includes("Password is incorrect") || error.error.message?.includes("Invalid User Id") || error.error.message?.includes("verification code has been sent")) {
          return throwError(() => error);
        }
        else if (error.status === 401 && !this.isRefreshing) {
          return this.handle401Error(request, next);
        }

        const message =
          error.error?.message || 'Server error occurred';
          
        this.snackBar.open(message, 'Close', {
          duration: 4000
        });

        return throwError(() => error);
      })
    );
  }

  private addToken(request: HttpRequest<any>, token: string): HttpRequest<any> {
    return request.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  private handle401Error(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (!this.isRefreshing) {
      this.isRefreshing = true;

      return this.authService.refreshToken().pipe(
        switchMap(response => {
          this.isRefreshing = false;
          return next.handle(this.addToken(request, response.access_token!));
        }),
        catchError(error => {
          this.isRefreshing = false;
          this.tokenService.removeTokens();
          return throwError(() => error);
        })
      );
    }
    return next.handle(request);
  }
}