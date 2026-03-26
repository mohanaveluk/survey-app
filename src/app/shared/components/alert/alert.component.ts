import { Component, OnDestroy, OnInit } from '@angular/core';
import { AlertService } from '../../services/alert.service';
import { Subscription } from 'rxjs';
import { SharedModule } from '../../shared.module';

@Component({
  selector: 'app-alert',
  imports: [
    SharedModule
  ],  
  templateUrl: './alert.component.html',
  styleUrl: './alert.component.scss'
})
export class AlertComponent implements OnInit, OnDestroy {
  private subscription!: Subscription;
  message: any;

  
  constructor(private alertService: AlertService){}

  ngOnInit(): void {
    this.subscription = this.alertService.getMessage().subscribe(message => { 
      this.message = message; 
  });
  }
  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
}
