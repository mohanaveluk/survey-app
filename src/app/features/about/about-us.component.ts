import { Component } from '@angular/core';
import { SharedModule } from '../../shared/shared.module';

@Component({
  selector: 'app-about-us',
  templateUrl: './about-us.component.html',
  styleUrls: ['./about-us.component.scss'],
  imports: [SharedModule],
})
export class AboutUsComponent {
  readonly currentYear = new Date().getFullYear();
}