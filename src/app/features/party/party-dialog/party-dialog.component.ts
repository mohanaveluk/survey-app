import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { SharedModule } from '../../../shared/shared.module';
import { Party } from '../../../shared/models/survey.model';

@Component({
  selector: 'app-party-dialog',
  templateUrl: './party-dialog.component.html',
  styleUrls: ['./party-dialog.component.scss'],
  imports: [SharedModule]
})
export class PartyDialogComponent implements OnInit {
  partyForm: FormGroup;
  isEditMode = false;
  selectedColor = '#1976d2';
  presetColors = [
    '#1976d2', '#d32f2f', '#388e3c', '#f57c00', '#7b1fa2',
    '#c2185b', '#5d4037', '#455a64', '#00796b', '#0097a7'
  ];

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<PartyDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: Party | null
  ) {
    this.partyForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      leader_name: [''],
      color: ['#1976d2'],
      logo_url: ['']
    });
  }

  ngOnInit(): void {
    if (this.data) {
      this.isEditMode = true;
      this.partyForm.patchValue(this.data);
      this.selectedColor = this.data.color || '#1976d2';
    }
  }

  selectColor(color: string): void {
    this.selectedColor = color;
    this.partyForm.patchValue({ color });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSubmit(): void {
    if (this.partyForm.valid) {
      this.dialogRef.close(this.partyForm.value);
    }
  }
}
