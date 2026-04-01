import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class IdentityService {

  private identityNameSource = new BehaviorSubject<string>('');
  identityName$ = this.identityNameSource.asObservable();

  setIdentityName(name: string) {
    this.identityNameSource.next(name);
  }
}