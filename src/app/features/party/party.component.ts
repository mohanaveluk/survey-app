import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { SharedModule } from '../../shared/shared.module';
import { PartyService } from '../../shared/services/party.service';
import { PartyDialogComponent } from './party-dialog/party-dialog.component';
import { Observable, Subject, takeUntil } from 'rxjs';
import { Party } from '../../shared/models/survey.model';
import { AuthService } from '../../auth/auth.service';
import { PartyMasterDialogComponent, PartyMasterDialogResult } from './party-master-dialog/party-master-dialog.component';
import { Country } from '../../shared/models/party.models';
import { CountryService } from '../../shared/services/country.service';

@Component({
  selector: 'app-party',
  templateUrl: './party.component.html',
  styleUrls: ['./party.component.scss'],
  imports: [SharedModule]
})
export class PartyComponent implements OnInit {
  private destroy$ = new Subject<void>();

  parties: Party[] = [];
  parties$!: Observable<Party[]>;
  filteredParties$!: Observable<Party[]>;
  isLoading = false;
  searchTerm = '';
  displayedColumns: string[] = ['name', 'leader_name', 'color', 'actions'];

  // ── Country data ──────────────────────────────────────────────────────────
  countries:             Country[] = [];   // full list from API
  filteredCountryOptions:Country[] = [];   // list shown inside the dropdown
  countriesLoading       = false;
  selectedCountryId      = '';             // '' means "All"
  countrySearchTerm      = '';             // search inside the dropdown

  // ── Quick-lookup maps built once after countries load ─────────────────────
  private countryNameMap = new Map<string, string>();   // id → name
  private countryIsoMap  = new Map<string, string>();   // id → isoCode

  constructor(
    private partyService: PartyService,
    private authService: AuthService,
    private countryService: CountryService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private cd: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    //this.parties$ = this.partyService.parties$;
    this.loadCountries();   // load countries FIRST — cards need them to render flags
    this.loadParties();

    // this.filteredParties$ = combineLatest([
    //     this.partyService.parties$,
    //     this.searchTerm.valueChanges
    // ]).pipe(
    //     map(([parties, search]) =>
    //         parties.filter(p =>
    //             p.name.toLowerCase().includes(search?.toLowerCase() || '') ||
    //             (p.leader_name?.toLowerCase().includes(search?.toLowerCase() || ''))
    //         )
    //     )
    // );

    this.partyService.parties$.subscribe(parties => {
      this.parties = parties;
      this.isLoading = false;
      if (this.parties.length > 0) {
        this.cd.detectChanges();
      }
    });
  }

// ─────────────────────────────────────────────────────────────────────────
  //  Country loading
  // ─────────────────────────────────────────────────────────────────────────
 
  loadCountries(): void {
    this.countriesLoading = true;
 
    this.countryService.getAll()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (list) => {
          this.countries              = list;
          this.filteredCountryOptions = [...list];
          // Build lookup maps for O(1) name/ISO resolution on each card
          list.forEach(c => {
            this.countryNameMap.set(c.id, c.name);
            this.countryIsoMap.set(c.id,  c.isoCode ?? '');
          });
          this.countriesLoading = false;
          this.cd.detectChanges();
        },
        error: () => {
          // non-fatal — country filter simply won't work
          this.countriesLoading = false;
          this.cd.detectChanges();
        },
      });
  }
 
  // ─────────────────────────────────────────────────────────────────────────
  //  Country filter helpers
  // ─────────────────────────────────────────────────────────────────────────
 
  /** Called when user types in the search box inside the dropdown */
  filterCountryOptions(): void {
    const q = (this.countrySearchTerm ?? '').toLowerCase().trim();
    this.filteredCountryOptions = q
      ? this.countries.filter(c =>
          c.name.toLowerCase().includes(q) ||
          (c.isoCode ?? '').toLowerCase().includes(q)
        )
      : [...this.countries];
  }
 
  onCountryFilterChange(): void {
    // Trigger filtered list recalculation (handled in template via getFilteredParties())
    this.cd.detectChanges();
  }
 
  clearCountryFilter(): void {
    this.selectedCountryId = '';
    this.countrySearchTerm = '';
    this.filteredCountryOptions = [...this.countries];
  }
 
  /** Resolve countryId → display name for cards and chips */
  getCountryName(countryId: string | null | undefined): string {
    if (!countryId) return '';
    return this.countryNameMap.get(countryId) ?? '';
  }
 
  /** Resolve countryId → ISO code for the card badge */
  getCountryIso(countryId: string | null | undefined): string {
    if (!countryId) return '';
    return this.countryIsoMap.get(countryId) ?? '';
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  //  Party loading
  // ─────────────────────────────────────────────────────────────────────────
   
  loadParties(): void {
    this.isLoading = true;
    const currentUser = this.authService.currentUserValue;
    this.partyService.loadParties(currentUser?.id.toString() || '');
    this.partyService.parties$.subscribe(parties => {
        this.parties = parties;
        this.isLoading = false;
        if(this.parties.length > 0) {
            this.cd.detectChanges();
        }
    });
  }

  openPartyDialog(party?: Party): void {
    const dialogRef = this.dialog.open(PartyDialogComponent, {
      width: '500px',
      data: { party: party || null, countries: this.countries },
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        result.createdBy = this.authService.currentUserValue?.id.toString() || '';
        result.party.createdBy = result.createdBy;
        result.createdAt = new Date();
        if (party) {
          this.updateParty(party.id || '', result.party, result.logoFile);
        } else {
          this.createParty(result.party, result.logoFile);
        }
        this.cd.detectChanges();
      }
    });
  }

  createParty(party: Party, logoFile: File): void {
    this.partyService.createParty(party, logoFile).subscribe({
      next: (newParty) => {
        this.snackBar.open('Party created successfully!', 'Close', { duration: 3000 });
        this.loadParties();
        this.cd.detectChanges();
      },
      error: (error) => {
        console.error('Failed to create party:', error);
        this.snackBar.open('Failed to create party', 'Close', { duration: 3000 });
      }
    });
  }

  updateParty(id: string, party: Partial<Party>, logoFile: File): void {
    this.partyService.updateParty(id, party, logoFile).subscribe({
      next: (updatedParty) => {
        this.snackBar.open('Party updated successfully!', 'Close', { duration: 3000 });
        this.loadParties();
        this.cd.detectChanges();
      },
      error: (error) => {
        console.error('Failed to update party:', error);
        this.snackBar.open('Failed to update party', 'Close', { duration: 3000 });
      }
    });
  }

  deleteParty(id: string, name: string): void {
    if (confirm(`Are you sure you want to delete "${name}"?`)) {
      this.partyService.deleteParty(id).subscribe({
        next: () => {
          this.snackBar.open('Party deleted successfully', 'Close', { duration: 3000 });
          this.loadParties();
        },
        error: (error) => {
          console.error('Failed to delete party:', error);
          this.snackBar.open('Failed to delete party', 'Close', { duration: 3000 });
        }
      });
    }
  }

  getFilteredParties(): Party[] {
    return this.parties.filter(party =>
      party.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
      (party.leader_name && party.leader_name.toLowerCase().includes(this.searchTerm.toLowerCase()))
    );
  }

  /**
   * party master list:
   * 1. Load master list of parties (name, leader, contestant) from the server (pre-seeded by us)
   * 2. Allow user to add any of those to their own party list with one click (if not already added)
   * 3. Show distinct logo images in the library tab (maybe with a "master party" badge)
   */

openPartyMaster(): void {
    // Collect names the user already owns so we can grey them out in the dialog
    const existingPartyNames = this.parties.map(p => p.name);
 
    const ref = this.dialog.open(PartyMasterDialogComponent, {
      // No maxWidth/maxHeight override — the component controls its own size
      panelClass:       'pmd-panel',          // optional global class
      disableClose:     true,                 // user must click Cancel or X
      autoFocus:        false,
      data: { existingPartyNames },
    });
 
    ref.afterClosed().subscribe((result: PartyMasterDialogResult | null) => {
      if (result && result.added > 0) {
        // Refresh the party list to show all newly added parties
        this.loadParties();
 
        // Optional: show a snackbar confirmation
        // this.snackBar.open(
        //   `${result.added} party(s) added successfully.`,
        //   'Close',
        //   { duration: 4000, panelClass: 'snack-success' }
        // );
      }
    });
  }  
}
