import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { SharedModule } from '../../shared/shared.module';
import { PartyService } from '../../shared/services/party.service';
import { PartyDialogComponent } from './party-dialog/party-dialog.component';
import { Observable } from 'rxjs';
import { Party } from '../../shared/models/survey.model';
import { AuthService } from '../../auth/auth.service';

@Component({
  selector: 'app-party',
  templateUrl: './party.component.html',
  styleUrls: ['./party.component.scss'],
  imports: [SharedModule]
})
export class PartyComponent implements OnInit {
  parties: Party[] = [];
  parties$!: Observable<Party[]>;
  filteredParties$!: Observable<Party[]>;
  isLoading = false;
  searchTerm = '';
  displayedColumns: string[] = ['name', 'leader_name', 'color', 'actions'];

  constructor(
    private partyService: PartyService,
    private authService: AuthService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private cd: ChangeDetectorRef
  ) {}

    ngOnInit(): void {
        //this.parties$ = this.partyService.parties$;
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
            if(this.parties.length > 0) {
                this.cd.detectChanges();
            }
        });
    }

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
      data: party || null
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        result.createdBy = this.authService.currentUserValue?.id.toString() || '';
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
}
