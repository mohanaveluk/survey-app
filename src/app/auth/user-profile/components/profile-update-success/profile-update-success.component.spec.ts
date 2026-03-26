import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProfileUpdateSuccessComponent } from './profile-update-success.component';

describe('ProfileUpdateSuccessComponent', () => {
  let component: ProfileUpdateSuccessComponent;
  let fixture: ComponentFixture<ProfileUpdateSuccessComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ProfileUpdateSuccessComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProfileUpdateSuccessComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
