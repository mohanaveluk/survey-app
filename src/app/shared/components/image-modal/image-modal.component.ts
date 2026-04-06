import { Component, Input, Output, EventEmitter } from '@angular/core';
import { MaterialModule } from "../../material.module";

@Component({
  selector: 'app-image-modal',
  templateUrl: './image-modal.component.html',
  styleUrls: ['./image-modal.component.scss'],
  imports: [MaterialModule]
})
export class ImageModalComponent {
  @Input() imageSrc: string | null = null;
  @Output() close = new EventEmitter<void>();

  closeModal(): void {
    this.close.emit();
  }
}