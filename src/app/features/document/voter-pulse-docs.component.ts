import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { ImageModalComponent } from "../../shared/components/image-modal/image-modal.component";

@Component({
  selector:    'app-voter-pulse-docs',
  templateUrl: './voter-pulse-docs.component.html',
  styleUrls:   ['./voter-pulse-docs.component.scss'],
  imports: [SharedModule, RouterLink, ImageModalComponent],
})
export class VoterPulseDocsComponent {

  selectedImage: string | null = null;

  /** Smooth-scroll to a section by its HTML id */
  scrollTo(id: string): void {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /**
   * Triggers download of the pre-generated PDF user guide.
   * The PDF is generated server-side (or via the Python script in /scripts)
   * and stored at /assets/docs/voter-pulse-user-guide.pdf
   */
  downloadPdf(): void {
    const link   = document.createElement('a');
    link.href    = 'assets/docs/voter-pulse-user-guide.pdf';
    link.download = 'Voter-Pulse-User-Guide.pdf';
    link.click();
  }

  openImageModal(imageSrc: string): void {
    this.selectedImage = imageSrc;
  }

  closeImageModal(): void {
    this.selectedImage = null;
  }

}