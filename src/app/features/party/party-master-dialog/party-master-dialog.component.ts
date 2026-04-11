// party-master-dialog.component.ts

import {
  Component, OnInit, OnDestroy, Inject, ChangeDetectorRef
} from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Subject, from, concatMap, takeUntil, finalize } from 'rxjs';
import { SharedModule } from '../../../shared/shared.module';
import { PartyService } from '../../../shared/services/party.service';
import { PartyMaster } from '../../../shared/models/party.models';
import { AuthService } from '../../../auth/auth.service';


// ─────────────────────────────────────────────────────────
//  Interfaces
// ─────────────────────────────────────────────────────────

/** Shape of a party returned from GET /party_master */
export interface MasterParty {
  id:               string;
  name:             string;
  leader_name?:     string;
  contestant_name?: string;
  color?:           string;
  logo_url?:        string;
  // UI state (not from API)
  checked:          boolean;
  alreadyAdded:     boolean;
  logoError:        boolean;
}

/** Data passed when opening this dialog from PartyComponent */
export interface PartyMasterDialogData {
  /** IDs of parties the user already owns — used to mark rows as "Added" */
  existingPartyNames: string[];
}

/** Emitted back to PartyComponent when the dialog closes successfully */
export interface PartyMasterDialogResult {
  added: number;   // how many new parties were saved
}

// ─────────────────────────────────────────────────────────
//  Component
// ─────────────────────────────────────────────────────────

@Component({
  selector:    'app-party-master-dialog',
  templateUrl: './party-master-dialog.component.html',
  styleUrls:   ['./party-master-dialog.component.scss'],
  imports:     [SharedModule],
})
export class PartyMasterDialogComponent implements OnInit, OnDestroy {

  private destroy$ = new Subject<void>();

  // ── Data ──────────────────────────────────────────────
  allParties:      PartyMaster[] = [];
  filteredParties: PartyMaster[] = [];

  // ── UI state ──────────────────────────────────────────
  loading       = true;
  loadError     = '';
  searchQuery   = '';
  searchFocused = false;

  // ── Save progress ─────────────────────────────────────
  saving       = false;
  saveProgress = 0;   // current item being saved
  saveTotal    = 0;   // total to save
  saveErrors:  string[] = [];

  constructor(
    private dialogRef:    MatDialogRef<PartyMasterDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: PartyMasterDialogData,
    private partyService: PartyService,
    private authService: AuthService,
    private cd:           ChangeDetectorRef,
  ) {}

  // ─────────────────────────────────────────────────────
  //  Lifecycle
  // ─────────────────────────────────────────────────────

  ngOnInit(): void {
    this.loadMasterParties();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ─────────────────────────────────────────────────────
  //  Computed helpers
  // ─────────────────────────────────────────────────────

  get selectedCount(): number {
    return this.filteredParties.filter(p => p.checked && !p.alreadyAdded).length;
  }

  get isAllSelected(): boolean {
    const selectable = this.filteredParties.filter(p => !p.alreadyAdded);
    return selectable.length > 0 && selectable.every(p => p.checked);
  }

  get isIndeterminate(): boolean {
    const selectable = this.filteredParties.filter(p => !p.alreadyAdded);
    const checked    = selectable.filter(p => p.checked).length;
    return checked > 0 && checked < selectable.length;
  }

  get savePercent(): number {
    if (this.saveTotal === 0) return 0;
    return Math.round((this.saveProgress / this.saveTotal) * 100);
  }

  // ─────────────────────────────────────────────────────
  //  Load master parties — GET /party_master
  // ─────────────────────────────────────────────────────

  loadMasterParties(): void {
    this.loading   = true;
    this.loadError = '';

    this.partyService.getMasterParties()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (parties) => {
          // Mark rows that the user already owns (by name match)
          const existingNames = new Set(
            (this.data?.existingPartyNames ?? []).map(n => n.toLowerCase().trim())
          );

          this.allParties = parties
            .map(p => ({
              ...p,
              checked:      false,
              alreadyAdded: existingNames.has(p.name.toLowerCase().trim()),
              logoError:    false,
            }))
            // Sort alphabetically (API may already do this, but ensures it)
            .sort((a, b) => a.name.localeCompare(b.name));

          this.filteredParties = [...this.allParties];
          this.loading = false;
          this.cd.detectChanges();
        },
        error: (err) => {
          this.loadError = err?.error?.message ?? 'Failed to load the party master list. Please retry.';
          this.loading   = false;
          this.cd.detectChanges();
        },
      });
  }

  // ─────────────────────────────────────────────────────
  //  Search / filter
  // ─────────────────────────────────────────────────────

  applyFilter(): void {
    const q = (this.searchQuery ?? '').toLowerCase().trim();

    if (!q) {
      this.filteredParties = [...this.allParties];
      return;
    }

    this.filteredParties = this.allParties.filter(p =>
      p.name.toLowerCase().includes(q)                             ||
      (p.leader_name     ?? '').toLowerCase().includes(q)          ||
      (p.contestant_name ?? '').toLowerCase().includes(q)
    );
  }

  clearSearch(): void {
    this.searchQuery     = '';
    this.filteredParties = [...this.allParties];
  }

  // ─────────────────────────────────────────────────────
  //  Checkbox logic
  // ─────────────────────────────────────────────────────

  toggleRow(party: PartyMaster): void {
    if (party.alreadyAdded) return;
    party.checked = !party.checked;
  }

  toggleAll(): void {
    const selectable  = this.filteredParties.filter(p => !p.alreadyAdded);
    const shouldCheck = !this.isAllSelected;
    selectable.forEach(p => (p.checked = shouldCheck));
  }

  // ─────────────────────────────────────────────────────
  //  Add selected parties — POST /party (one by one)
  // ─────────────────────────────────────────────────────

  addSelected(): void {
    const toAdd = this.allParties.filter(p => p.checked && !p.alreadyAdded);
    if (toAdd.length === 0) return;

    this.saving      = true;
    this.saveProgress = 0;
    this.saveTotal    = toAdd.length;
    this.saveErrors   = [];

    let addedCount = 0;

    // concatMap processes each party sequentially (one by one)
    // so the backend is never overwhelmed and progress is accurate.
    from(toAdd)
      .pipe(
        concatMap(party =>
          new Promise<void>(resolve => {
            this.partyService.createParty({
              name:             party.name,
              leader_name:      party.leader_name,
              contestant_name:  party.contestant_name,
              color:            party.color,
              countryId:        party.country?.id ?? null,
              createdBy:        this.authService.currentUserValue?.id.toString() || '',  // backend will fill this in based on auth token
              logo_url:         party.logo_url} ).subscribe({
              next: () => {
                addedCount++;
                this.saveProgress++;
                // Mark row as added so the UI updates live
                party.alreadyAdded = true;
                party.checked      = false;
                this.cd.detectChanges();
                resolve();
              },
              error: (err) => {
                this.saveErrors.push(
                  err?.error?.message ?? `Failed to add "${party.name}". ${err?.error?.message}`
                );
                this.saveProgress++;
                this.cd.detectChanges();
                resolve();  // continue to next even on error
              },
            });
          })
        ),
        takeUntil(this.destroy$),
        finalize(() => {
          this.saving = false;
          this.cd.detectChanges();

          // Close dialog and pass result back if at least 1 party was saved
          if (addedCount > 0) {
            // Short delay so the user sees the completed progress bar
            setTimeout(() => {
              this.dialogRef.close({ added: addedCount } as PartyMasterDialogResult);
            }, 600);
          }
        }),
      )
      .subscribe();
  }

  // ─────────────────────────────────────────────────────
  //  Cancel
  // ─────────────────────────────────────────────────────

  onCancel(): void {
    if (this.saving) return;
    this.dialogRef.close(null);
  }

  // ─────────────────────────────────────────────────────
  //  TrackBy
  // ─────────────────────────────────────────────────────

  trackById(_: number, p: PartyMaster): string {
    return p.id;
  }
}