import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardSurveyComponent } from './dashboard-survey.component';

describe('Dashboard', () => {
  let component: DashboardSurveyComponent;
  let fixture: ComponentFixture<DashboardSurveyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardSurveyComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DashboardSurveyComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
