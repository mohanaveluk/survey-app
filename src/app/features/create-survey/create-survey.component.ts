import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SurveyService } from '../../shared/services/survey.service';
import { AuthService } from '../../auth/auth.service';
import { Party, Survey } from '../../shared/models/survey.model';
import { SharedModule } from '../../shared/shared.module';
import { PartyService } from '../../shared/services/party.service';
import { User } from '../../shared/models/auth.model';

@Component({
  selector: 'app-create-survey',
  templateUrl: './create-survey.component.html',
  styleUrls: ['./create-survey.component.scss'],
   imports: [
      SharedModule
    ],
})
export class CreateSurveyComponent implements OnInit {
  surveyForm: FormGroup;
  availableParties: Party[] = [];
  selectedParties: Party[] = [];
  isCreating = false;
  isEditMode = false;
  editingSurveyId: string | null = null;
  pageTitle = 'Create New Election Survey';
  currentUser: User | null = null;

  constructor(
    private fb: FormBuilder,
    private surveyService: SurveyService,
    private partyService: PartyService,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar,
    private cd: ChangeDetectorRef
  ) {

    const today = new Date();
    const fifteenDaysLater = new Date(today);
    fifteenDaysLater.setDate(fifteenDaysLater.getDate() + 15);

    this.surveyForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      description: [''],
      selectedPartyIds: [[], [Validators.required, Validators.minLength(2)]],
      startDate: [today, Validators.required],
      endDate: [fifteenDaysLater, Validators.required],
      isAnonymous: [true]
    }, { validators: this.endDateValidator });
  }

  endDateValidator(group: FormGroup): { [key: string]: any } | null {
    const startDate = group.get('startDate')?.value;
    const endDate = group.get('endDate')?.value;

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (end <= start) {
        return { endDateInvalid: true };
      }
    }
    return null;
  }

  ngOnInit(): void {
    this.currentUser = this.authService.currentUserValue;
    this.loadAvailableParties();
    const surveyId = this.route.snapshot.paramMap.get('id');
    if (surveyId) {
      this.isEditMode = true;
      this.editingSurveyId = surveyId;
      this.pageTitle = 'Edit Survey';
      this.loadSurveyForEditing(surveyId);
    }
  }

  private loadSurveyForEditing(surveyId: string): void {
    this.surveyService.getSurveyById(surveyId).subscribe({
      next: (survey) => {
        if (survey && survey.data?.status === 'draft') {
          this.populateFormWithSurvey(survey.data);
        } else {
          this.snackBar.open('Survey cannot be edited', 'Close', { duration: 3000 });
          this.router.navigate(['/dashboard']);
        }
      },
      error: (error) => {
        console.error('Failed to load survey:', error);
        this.snackBar.open('Failed to load survey', 'Close', { duration: 3000 });
        this.router.navigate(['/dashboard']);
      }
    });
  }

  private populateFormWithSurvey(survey: Survey): void {
    this.selectedParties = survey.surveyParties ? survey.surveyParties.map(sp => sp.party) : [];
    const partyIds = this.selectedParties.map(p => p.id);
    this.surveyForm.patchValue({
      name: survey.name,
      description: survey.description,
      selectedPartyIds: partyIds,
      startDate: new Date(survey.startDate),
      endDate: new Date(survey.endDate),
      isAnonymous: survey.isAnonymous
    });
  }

  private loadAvailableParties(): void {
    this.partyService.parties$.subscribe(parties => {
      this.availableParties = parties;
      this.cd.detectChanges();
    });
    this.partyService.loadParties(this.currentUser?.id.toString() || '');
  }

  onPartyToggle(party: Party): void {
    const index = this.selectedParties.findIndex(p => p.id === party.id);
    if (index > -1) {
      this.selectedParties.splice(index, 1);
    } else {
      this.selectedParties.push(party);
    }
    
    const selectedIds = this.selectedParties.map(p => p.id);
    this.surveyForm.patchValue({ selectedPartyIds: selectedIds });
  }

  isPartySelected(party: Party): boolean {
    return this.selectedParties.some(p => p.id === party.id);
  }

  onSubmit1(): void {
    if (this.surveyForm.valid && !this.isCreating) {
      this.isCreating = true;
      const currentUser = this.authService.getUser();
      
      if (!currentUser) {
        this.snackBar.open('Please log in to create a survey', 'Close', { duration: 3000 });
        this.router.navigate(['/login']);
        return;
      }

      const formValue = this.surveyForm.value;
      this.surveyService.createSurvey(formValue, currentUser.id).subscribe({
        next: (survey) => {
          this.snackBar.open('Survey created successfully!', 'Close', { duration: 3000 });
          this.router.navigate(['/survey/manage', survey?.data?.id]);
        },
        error: (error) => {
          console.error('Failed to create survey:', error);
          this.snackBar.open('Failed to create survey', 'Close', { duration: 3000 });
          this.isCreating = false;
        }
      });
    }
  }

  onSubmit(): void {
    if (this.surveyForm.valid && !this.isCreating) {
      this.isCreating = true;
      const currentUser = this.authService.currentUserValue;

      if (!currentUser) {
        this.snackBar.open('Please log in to create a survey', 'Close', { duration: 3000 });
        this.router.navigate(['/login']);
        return;
      }

      const formValue = this.surveyForm.value;

      if (this.isEditMode && this.editingSurveyId) {
        this.surveyService.updateSurvey(this.editingSurveyId, formValue, currentUser.id).subscribe({
          next: (survey) => {
            this.snackBar.open('Survey updated successfully!', 'Close', { duration: 3000 });
            this.router.navigate(['/survey/manage', this.editingSurveyId]);
            this.isCreating = false;
          },
          error: (error) => {
            console.error('Failed to update survey:', error);
            this.snackBar.open('Failed to update survey', 'Close', { duration: 3000 });
            this.isCreating = false;
          }
        });
      } else {
        this.surveyService.createSurvey(formValue, currentUser.id).subscribe({
          next: (survey) => {
            this.snackBar.open('Survey created successfully!', 'Close', { duration: 3000 });
            this.router.navigate(['/survey/manage', survey?.data?.id]);
            this.isCreating = false;
          },
          error: (error) => {
            console.error('Failed to create survey:', error);
            this.snackBar.open('Failed to create survey', 'Close', { duration: 3000 });
            this.isCreating = false;
          }
        });
      }
    }
  }
  
  onCancel(): void {
    this.router.navigate(['/dashboard']);
  }
}