import { Component, Inject, OnInit, OnDestroy, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { SharedModule } from '../../../shared/shared.module';
import { LibraryImage, Party } from '../../../shared/models/survey.model';
import { PartyService } from '../../../shared/services/party.service';
import { map } from 'rxjs';
import { Country } from '../../../shared/models/party.models';

export type LogoSource = 'local' | 'url' | 'gdrive' | 'library';

const MAX_FILE_SIZE_MB  = 2;
const ALLOWED_MIME_TYPES = [
  'image/jpeg', 'image/png', 'image/svg+xml', 'image/webp', 'image/gif',
];

@Component({
  selector: 'app-party-dialog',
  templateUrl: './party-dialog.component.html',
  styleUrls: ['./party-dialog.component.scss'],
  imports: [SharedModule],
})
export class PartyDialogComponent implements OnInit, OnDestroy {

  @ViewChild('fileInput') fileInputRef!: ElementRef<HTMLInputElement>;

  partyForm: FormGroup;
  isEditMode = false;
  isSaving   = false;

  successMessage   = '';
  errorMessage     = '';  
  // ── Color ─────────────────────────────────────────────────────────────────
  selectedColor = '#1976d2';
  presetColors  = [
    '#1976d2', '#d32f2f', '#388e3c', '#f57c00', '#7b1fa2',
    '#c2185b', '#5d4037', '#455a64', '#00796b', '#0097a7',
  ];

  // ── Logo state ─────────────────────────────────────────────────────────────
  logoSource: LogoSource = 'local';
  logoPreviewUrl: string | null = null;   // what is shown in the preview
  logoFile: File | null = null;           // set when source === 'local'
  logoError = '';

  // URL source helpers
  urlImageValid = false;
  urlImageError = false;

  // Drag & drop
  isDragOver = false;

  // ── Image library state ────────────────────────────────────
  libraryImages: LibraryImage[] = [];
  filteredLibraryImages: LibraryImage[] = [];
  libraryLoading = false;
  libraryError = '';
  librarySearch = '';
  libSearchFocused = false;
  selectedLibraryName = '';
  
   // ── Country state ───────────────────────────────────────────────────────
  countries:             Country[] = [];   // passed in via MAT_DIALOG_DATA
  filteredDialogCountries: Country[] = [];
  dialogCountrySearch    = '';
  
  private objectUrl: string | null = null; // kept for revokeObjectURL on destroy
  /** Snapshot for Discard Changes */
  private originalValues: Partial<Party> = {};


  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<PartyDialogComponent>,
    private partySerive: PartyService,
    private cd:          ChangeDetectorRef,
    @Inject(MAT_DIALOG_DATA) public data: { party: Party, countries: Country[] } | null,
  ) {
    this.partyForm = this.fb.group({
      name:        ['', [Validators.required, Validators.minLength(2)]],
      leader_name: [''],
      contestant_name: [''],
      color:       ['#1976d2'],
      logo_url:    [''],
      countryId: [this.data?.party?.countryId ?? ''],
    });
  }

  ngOnInit(): void {
    this.countries              = this.data?.countries ?? [];
    this.filteredDialogCountries = [...this.countries];
    if (this.data?.party) {
      this.isEditMode = true;
      this.partyForm.patchValue(this.data.party);
      this.selectedColor = this.data.party.color || '#1976d2';

      // Pre-populate logo if editing
      if (this.data.party.logo_url) {
        this.logoPreviewUrl = this.data.party.logo_url;
        this.logoSource     = 'url';
        this.urlImageValid  = true;
      }
    }
  }

  ngOnDestroy(): void {
    // Free blob URL memory
    if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
  }

  // ── Filter helper ────────────────────────────────────────────────────────
  filterDialogCountries(): void {
    const q = (this.dialogCountrySearch ?? '').toLowerCase().trim();
    this.filteredDialogCountries = q
      ? this.countries.filter(c =>
          c.name.toLowerCase().includes(q) ||
          (c.isoCode ?? '').toLowerCase().includes(q)
        )
      : [...this.countries];
  }  

  // ── Color ─────────────────────────────────────────────────────────────────

  selectColor(color: string): void {
    this.selectedColor = color;
    this.partyForm.patchValue({ color });
  }

  // ── Logo source tabs ──────────────────────────────────────────────────────

  setLogoSource(source: LogoSource): void {
    this.logoSource = source;
    this.logoError  = '';
   if (source === 'library' && this.libraryImages.length === 0 && !this.libraryLoading) {
     this.loadLibrary();
   }    
    // Don't clear preview when switching tabs — user keeps their image
  }

  loadLibrary(): void {
    this.libraryLoading = true;
    this.libraryError = '';

    this.partySerive.getAllLogoImages().pipe(
      //map((images: { imageUrl: string }[]) => images.map(img => img.imageUrl))
    ).subscribe({
      next: (urls: any) => {
        this.libraryImages = this.buildLibraryItems(urls);
        this.filteredLibraryImages = [...this.libraryImages];
        this.libraryLoading = false;
        this.cd.detectChanges();
      },
      error: (err: any) => {
        this.libraryError = err?.error?.message ?? 'Failed to load the image library. Please retry.';
        this.libraryLoading = false;
        this.cd.detectChanges();
      },
    });
  }
  
  // ── LOCAL FILE ────────────────────────────────────────────────────────────

  onLocalFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file  = input.files?.[0];
    input.value = ''; // allow re-selecting same file
    if (file) this.processFile(file);
  }

  private processFile(file: File): void {
    this.logoError = '';

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      this.logoError = 'Unsupported file type. Please use PNG, JPG, SVG, WebP or GIF.';
      return;
    }

    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      this.logoError = `File too large. Maximum size is ${MAX_FILE_SIZE_MB} MB.`;
      return;
    }

    // Revoke previous blob URL
    if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);

    this.logoFile       = file;
    this.objectUrl      = URL.createObjectURL(file);
    this.logoPreviewUrl = this.objectUrl;

    /*this.partySerive.uploadImage(file).subscribe({
      next: (response) => {
        if (this.originalValues) {
          this.originalValues.logo_url = response.imageUrl;
        }
        this.successMessage = 'Profile image updated', 'Close';
        setTimeout(() => { this.successMessage = ''; this.cd.detectChanges(); }, 5000);
      },
      error: () => {
        this.errorMessage = 'Failed to upload image';
        setTimeout(() => { this.errorMessage = ''; this.cd.detectChanges(); }, 5000);
      }
    });*/

    // Clear the logo_url field — file upload takes precedence
    this.partyForm.patchValue({ logo_url: '' });
  }

  // ── Drag & drop ───────────────────────────────────────────────────────────

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = true;
  }

  onDragLeave(): void {
    this.isDragOver = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;

    const file = event.dataTransfer?.files?.[0];
    if (file) this.processFile(file);
  }

  // ── ONLINE URL ────────────────────────────────────────────────────────────

  onUrlInput(): void {
    const url = this.partyForm.get('logo_url')?.value?.trim();
    this.urlImageValid = false;
    this.urlImageError = false;
    this.logoError     = '';

    if (url && this.isValidUrl(url)) {
      this.logoPreviewUrl = url;
      this.logoFile       = null;
    } else {
      this.logoPreviewUrl = null;
    }
  }

  onUrlImageLoad(): void {
    this.urlImageValid = true;
    this.urlImageError = false;
  }

  onUrlImageError(): void {
    this.urlImageValid = false;
    this.urlImageError = true;
  }

  private isValidUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      return ['http:', 'https:'].includes(parsed.protocol);
    } catch {
      return false;
    }
  }

  // ── GOOGLE DRIVE ──────────────────────────────────────────────────────────

  loadGoogleDriveImage(input: string): void {
    this.logoError = '';
    const fileId   = this.extractDriveFileId(input.trim());

    if (!fileId) {
      this.logoError = 'Could not extract a file ID. Paste the full share link or the file ID directly.';
      return;
    }

    // Google Drive direct image URL (works for publicly shared files)
    const directUrl = `https://drive.google.com/thumbnail?id=${fileId}&sz=w400`;
    this.logoPreviewUrl = directUrl;
    this.partyForm.patchValue({ logo_url: directUrl });
    this.logoFile = null;
  }

  private extractDriveFileId(input: string): string | null {
    // Full share link: https://drive.google.com/file/d/FILE_ID/view
    const match = input.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (match) return match[1];

    // Open link: https://drive.google.com/open?id=FILE_ID
    const openMatch = input.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (openMatch) return openMatch[1];

    // Raw file ID (alphanumeric, 25–44 chars typical for Drive)
    if (/^[a-zA-Z0-9_-]{20,}$/.test(input)) return input;

    return null;
  }

  // ── Remove logo ────────────────────────────────────────────────────────────

  removeLogo(): void {
    if (this.objectUrl) { URL.revokeObjectURL(this.objectUrl); this.objectUrl = null; }
    this.logoFile       = null;
    this.logoPreviewUrl = null;
    this.urlImageValid  = false;
    this.urlImageError  = false;
    this.logoError      = '';
    this.partyForm.patchValue({ logo_url: '' });
  }

  // ── Dialog actions ────────────────────────────────────────────────────────

  onCancel(): void {
    this.dialogRef.close();
  }

  onSubmit(): void {
    if (this.partyForm.invalid) return;

    const formValue = { ...this.partyForm.value };

    // If a local file was selected, attach it so the caller can upload it
    // The caller (PartyListComponent or similar) should POST as multipart/form-data
    const result: { party: any; logoFile?: File } = {
      party: {
        ...formValue,
        // If local file was selected, clear logo_url — caller will upload and get URL back
        logo_url: this.logoFile ? null : (this.logoPreviewUrl || formValue.logo_url || null),
      },
    };

    if (this.logoFile) {
      result.logoFile = this.logoFile;
    }

    this.dialogRef.close(result);
  }

  // Convert raw URL strings → LibraryImage objects with a human-readable name
  private buildLibraryItems(urls: string[]): any[] {
    return urls.map(url => ({
      url,
      name: this.deriveNameFromUrl(url),
      broken: false,
    }));
  }
 
  // Extract a readable name from the URL:
  //   "https://example.com/logos/party-alpha.png" → "party-alpha"
  //   "https://img.icons8.com/.../(1200/beta.j..."  → "beta"
  private deriveNameFromUrl(url: string): string {
    try {
      const pathname = new URL(url).pathname;
      const filename = pathname.split('/').filter(Boolean).pop() ?? url;
      return filename.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
    } catch {
      // Not a well-formed URL — use last segment of the string
      return url.split('/').pop()?.replace(/\.[^.]+$/, '') ?? url;
    }
  }
 
  // ── Search filtering ──────────────────────────────────────────────────
 
  filterLibrary(): void {
    const q = (this.librarySearch ?? '').toLowerCase().trim();
    if (!q) {
      this.filteredLibraryImages = [...this.libraryImages];
      return;
    }
    this.filteredLibraryImages = this.libraryImages.filter(img =>
      img.name.toLowerCase().includes(q) ||
      img.url.toLowerCase().includes(q)
    );
  }
 
  clearLibrarySearch(): void {
    this.librarySearch          = '';
    this.filteredLibraryImages  = [...this.libraryImages];
  }
 
  // ── Select an image from the library ─────────────────────────────────
 
  selectLibraryImage(img: any): void {
    this.logoPreviewUrl      = img.url;
    this.selectedLibraryName = img.name;
    // Keep logo_url form control in sync so it gets submitted
    // this.partyForm.get('logo_url')?.setValue(img.url);
  }
 
  // ── Handle broken thumbnails ──────────────────────────────────────────
 
  onLibThumbError(img: any): void {
    img.broken = true;
  }
 
  // ── TrackBy for *ngFor performance ───────────────────────────────────
 
  trackByUrl(_: number, img: any): string {
    return img.url;
  }
}