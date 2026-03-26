import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { SharedModule } from '../../shared.module';

@Component({
  selector: 'app-under-construction',
  imports: [
    SharedModule
  ],
  templateUrl: './under-construction.component.html',
  styleUrl: './under-construction.component.scss'
})
export class UnderConstructionComponent {
  constructor(private router: Router) { }

  goHome(): void {
    this.router.navigate(['/']);
  }
}
