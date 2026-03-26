import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { UserProfile } from '../../shared/models/user-profile.model';
import { ProfileService } from './services/profile.service';
import { ProfileImageComponent } from "./components/profile-image/profile-image.component";
import { SharedModule } from '../../shared/shared.module';

@Component({
  selector: 'app-user-profile',
  imports: [
    SharedModule,
    ProfileImageComponent
],    
  templateUrl: './user-profile.component.html',
  styleUrl: './user-profile.component.scss'
})
export class UserProfileComponent implements OnInit {
  profileForm: FormGroup;
  profile: UserProfile | null = null;
  loading = true;
  saving = false;
  showSuccessMessage = false;

  constructor(
    private fb: FormBuilder,
    private profileService: ProfileService,
    private snackBar: MatSnackBar,
    private cd: ChangeDetectorRef
  ) {
    this.profileForm = this.fb.group({
      first_name: ['', Validators.required],
      last_name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      mobile: ['', Validators.pattern('^\\+?[1-9]\\d{1,14}$')],
      major: [''],
      password: ['']
    });
  }

  ngOnInit(): void {
    this.loadProfile();
  }

  private loadProfile(): void {
    this.loading = true;
    this.profileService.getProfile().subscribe({
      next: (profile) => {
        this.profile = profile;
        this.profileForm.patchValue(profile);
        this.loading = false;
        this.cd.detectChanges();
      },
      error: () => {
        this.snackBar.open('Failed to load profile', 'Close', { duration: 3000 });
        this.loading = false;
        this.cd.detectChanges();
      }
    });
  }

  editProfile(): void {
    this.showSuccessMessage = false;
  }
  
  onImageSelected(file: File): void {
    this.profileService.uploadProfileImage(file).subscribe({
      next: (response) => {
        if (this.profile) {
          this.profile.profileImage = response.imageUrl;
        }
        this.snackBar.open('Profile image updated', 'Close', { duration: 3000 });
      },
      error: () => {
        this.snackBar.open('Failed to upload image', 'Close', { duration: 3000 });
      }
    });
  }

  onImageRemoved(): void {
    if (this.profile) {
      this.profile.profileImage = '';
    }
  }

  onSubmit(): void {
    if (this.profileForm.valid) {
      this.saving = true;
      const updates = this.getFormUpdates();

      this.profileService.updateProfile(updates).subscribe({
        next: (profile) => {
          this.profile = profile;
          this.showSuccessMessage = true; // Show success message
          this.snackBar.open('Profile updated successfully', 'Close', { duration: 3000 });
          this.saving = false;
        },
        error: () => {
          this.snackBar.open('Failed to update profile', 'Close', { duration: 3000 });
          this.saving = false;
        }
      });
    }
  }

  private getFormUpdates() {
    const updates: any = {};
    Object.keys(this.profileForm.controls).forEach(key => {
      const control = this.profileForm.get(key);
      if (control?.dirty && control.value !== '') {
        updates[key] = control.value;
      }
    });
    return updates;
  }
}
