import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-loading-spinner',
  templateUrl: './loading-spinner.component.html',
  styleUrls: ['./loading-spinner.component.scss'],
  imports: [CommonModule, MatProgressSpinnerModule]
})
export class LoadingSpinnerComponent {
  @Input() show = false;
  @Input() message?: string;

  loading = false;
  error: string | null = null;

  constructor() {
    // Initialization logic if needed
  }

  startLoading(): void {
    this.loading = true;
  }

  stopLoading(): void {
    this.loading = false;
  }

  setError(message: string): void {
    this.error = message;
  }

  clearError(): void {
    this.error = null;
  }
}