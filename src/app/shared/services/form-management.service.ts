import { Injectable } from '@angular/core';
import { FormGroup, FormArray, FormControl } from '@angular/forms';

@Injectable({
    providedIn: 'root'
})
export class FormManagementService {
    resetFormCompletely(form: FormGroup): void {
        // Reset all form values
        form.reset();

        // Reset validation states
        Object.keys(form.controls).forEach(key => {
            const control = form.get(key);
            if (control instanceof FormControl) {
                control.markAsPristine();
                control.markAsUntouched();
                control.setErrors(null);
            } else if (control instanceof FormArray) {
                control.controls.forEach(arrayControl => {
                    arrayControl.markAsPristine();
                    arrayControl.markAsUntouched();
                    arrayControl.setErrors(null);
                });
            }
        });

        // Update validity
        form.updateValueAndValidity();
    }
}