import { Component } from '@angular/core';
import { SharedModule } from '../../shared/shared.module';

@Component({
  selector: 'app-homev2',
  templateUrl: './homev2.component.html',
  styleUrls: ['./homev2.component.scss'],
  imports: [SharedModule]
})
export class Homev2Component {
  readonly currentYear = new Date().getFullYear();
}