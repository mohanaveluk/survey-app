import { Component, OnInit, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../auth.service';
import { SharedModule } from '../../shared/shared.module';
import { ProfileService } from '../user-profile/services/profile.service';
import { HttpErrorResponse } from '@angular/common/http';
import { ProfileUpdateRequest, UserProfile } from '../../shared/models/user-profile.model';

const MAX_FILE_SIZE_MB = 2;
const ALLOWED_TYPES    = ['image/jpeg', 'image/png', 'image/webp'];

@Component({
  selector: 'app-profile',
  templateUrl: './user-profile-v2.component.html',
  styleUrls: ['./user-profile-v2.component.scss'],
  imports: [SharedModule],
})
export class ProfileComponent implements OnInit {

  @ViewChild('fileInput') fileInputRef!: ElementRef<HTMLInputElement>;

  profileForm!: FormGroup;

  // ── UI state ──────────────────────────────────────────────────────────────
  isLoading        = true;
  isSaving         = false;
  isDeletingAvatar = false;
  successMessage   = '';
  errorMessage     = '';

  // ── Avatar state ──────────────────────────────────────────────────────────
  /** URL of the avatar already saved on the server */
  currentAvatarUrl: string | null = null;
  /** Local object URL for the newly selected file (preview only) */
  avatarPreview:    string | null = null;
  /** The raw File object waiting to be uploaded */
  avatarFile:       File   | null = null;
  /** True after a successful save that included the avatar */
  avatarSaved       = false;
  /** Validation error shown below the uploader */
  avatarError       = '';

  /** Snapshot for Discard Changes */
  private originalValues: Partial<UserProfile> = {};

  constructor(
    private fb:          FormBuilder,
    private authService: AuthService,
    private profileService: ProfileService,
    private cd:          ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.buildForm();
    this.loadProfile();
  }

  // ── Form ──────────────────────────────────────────────────────────────────

  private buildForm(): void {
    this.profileForm = this.fb.group({
      firstname:     ['', Validators.required],
      lastname:      ['', Validators.required],
      email:         ['', [Validators.required, Validators.email]],
      mobile:        ['', Validators.pattern(/^[+\d\s\-().]{7,20}$/)],
      address_line1: [''],
      address_line2: [''],
      city:          [''],
      state:         [''],
      postal_code:   [''],
      country:       [''],
    });
  }

  // ── Load profile ──────────────────────────────────────────────────────────

  private loadProfile(): void {
    this.profileService.getProfile().subscribe({
      next: (response) => {
        const profile: UserProfile = response ?? response;
        this.patchForm(profile);
        this.currentAvatarUrl = profile.profileImage ?? null;
        this.originalValues   = { ...this.profileForm.value };
        this.isLoading        = false;
        this.cd.detectChanges();
      },
      error: () => {
        this.errorMessage = 'Failed to load your profile. Please refresh the page.';
        this.isLoading    = false;
        this.cd.detectChanges();
      },
    });
  }

  private patchForm(profile: UserProfile): void {
    this.profileForm.patchValue({
      firstname:     profile.first_name     ?? '',
      lastname:      profile.last_name      ?? '',
      email:         profile.email         ?? '',
      mobile:        profile.mobile        ?? '',
      address_line1: profile.address_line1 ?? '',
      address_line2: profile.address_line2 ?? '',
      city:          profile.city          ?? '',
      state:         profile.state         ?? '',
      postal_code:   profile.postal_code   ?? '',
      country:       profile.country       ?? '',
    });
    this.profileForm.markAsPristine();
  }

  // ── Avatar: file selection ────────────────────────────────────────────────

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file  = input.files?.[0];

    // Reset input so selecting the same file again triggers change
    input.value = '';

    if (!file) return;

    // Validate type
    if (!ALLOWED_TYPES.includes(file.type)) {
      this.avatarError = 'Please select a JPG, PNG or WebP image.';
      return;
    }

    // Validate size
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      this.avatarError = `Image must be smaller than ${MAX_FILE_SIZE_MB} MB.`;
      return;
    }

    this.avatarError = '';

    // Revoke any previous object URL to avoid memory leaks
    if (this.avatarPreview) URL.revokeObjectURL(this.avatarPreview);

    this.avatarFile    = file;
    this.avatarPreview = URL.createObjectURL(file);
    this.avatarSaved   = false;

    this.profileService.uploadProfileImage(file).subscribe({
      next: (response) => {
        if (this.originalValues) {
          this.originalValues.profileImage = response.imageUrl;
        }
        this.successMessage = 'Profile image updated', 'Close';
        setTimeout(() => { this.successMessage = ''; this.cd.detectChanges(); }, 5000);
      },
      error: () => {
        this.errorMessage = 'Failed to upload image';
        setTimeout(() => { this.errorMessage = ''; this.cd.detectChanges(); }, 5000);
      }
    });

    this.cd.detectChanges();
  }

  // ── Avatar: delete ────────────────────────────────────────────────────────

  onDeleteAvatar(): void {
    // If only a local preview exists (not yet saved), just clear it
    if (this.avatarPreview && !this.currentAvatarUrl) {
      this.clearLocalAvatar();
      return;
    }

    // If there's a saved avatar on the server, call the delete API
    if (this.currentAvatarUrl) {
      this.isDeletingAvatar = true;
      /*this.profileService.deleteAvatar().subscribe({
        next: () => {
          this.isDeletingAvatar = false;
          this.currentAvatarUrl = null;
          this.clearLocalAvatar();
          this.successMessage   = 'Profile photo removed successfully.';
          this.cd.detectChanges();
          setTimeout(() => { this.successMessage = ''; this.cd.detectChanges(); }, 4000);
        },
        error: (err: HttpErrorResponse) => {
          this.isDeletingAvatar = false;
          this.errorMessage     = err?.error?.message ?? 'Failed to remove photo. Please try again.';
          this.cd.detectChanges();
        },
      });*/
    }
  }

  private clearLocalAvatar(): void {
    if (this.avatarPreview) URL.revokeObjectURL(this.avatarPreview);
    this.avatarPreview = null;
    this.avatarFile    = null;
    this.avatarError   = '';
  }

  // ── Save profile ──────────────────────────────────────────────────────────

  onSave(): void {
    if (this.profileForm.invalid || this.isSaving) return;
    if (this.profileForm.pristine && !this.avatarFile) return;

    this.isSaving       = true;
    this.successMessage = '';
    this.errorMessage   = '';

    // Build multipart FormData — always sent so the backend handles
    // both profile fields and the optional avatar in one request
    const formData = new FormData();

    const fields = this.profileForm.value;
    Object.keys(fields).forEach((key) => {
      if (fields[key] !== null && fields[key] !== undefined) {
        formData.append(key, fields[key]);
      }
    });

    // Append the image file only when the user has selected one
    if (this.avatarFile) {
      formData.append('avatar', this.avatarFile, this.avatarFile.name);
    }

      const userProfile: ProfileUpdateRequest = {
          first_name:   this.profileForm.value.firstname,
          last_name:    this.profileForm.value.lastname,
          mobile:       this.profileForm.value.mobile,
          created_at:   new Date,
          updated_at:   new Date,
          address_line1: this.profileForm.value.address_line1,
          address_line2: this.profileForm.value.address_line2,
          city:          this.profileForm.value.city,
          state:         this.profileForm.value.state,
          postal_code:  this.profileForm.value.postal_code,
          country:      this.profileForm.value.country,
          profileImage: ""
      };

    this.profileService.updateProfile(userProfile).subscribe({
      next: (response) => {
        this.isSaving       = false;
        this.successMessage = 'Your profile has been updated successfully.';

        // Update avatar state from server response if returned
        const updatedAvatarUrl = response?.profileImage ?? response?.profileImage;
        if (updatedAvatarUrl) {
          this.currentAvatarUrl = updatedAvatarUrl;
        }

        // Clear the pending file — it's now saved
        if (this.avatarPreview) URL.revokeObjectURL(this.avatarPreview);
        this.avatarPreview = null;
        this.avatarFile    = null;
        this.avatarSaved   = true;

        this.originalValues = { ...this.profileForm.value };
        this.profileForm.markAsPristine();
        this.cd.detectChanges();

        setTimeout(() => { this.successMessage = ''; this.cd.detectChanges(); }, 5000);
      },
      error: (err) => {
        this.isSaving     = false;
        this.errorMessage = err?.error?.message ?? 'Failed to update profile. Please try again.';
        this.cd.detectChanges();
      },
    });
  }

  // ── Discard ───────────────────────────────────────────────────────────────

  onReset(): void {
    this.profileForm.patchValue(this.originalValues);
    this.profileForm.markAsPristine();
    this.clearLocalAvatar();
    this.successMessage = '';
    this.errorMessage   = '';
  }

  // ── Computed ──────────────────────────────────────────────────────────────

  get initials(): string {
    const first = this.profileForm.get('firstname')?.value?.[0] ?? '';
    const last  = this.profileForm.get('lastname')?.value?.[0]  ?? '';
    return (first + last).toUpperCase() || '?';
  }
}