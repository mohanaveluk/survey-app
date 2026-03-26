import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export function mobileNumberValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;

    if (!value) {
      return null; // Empty is allowed
    }

    const phoneRegex = /^\+?\d{7,15}$/; // Allows "+" at start and 7 to 15 digits

    return phoneRegex.test(value)
      ? null
      : { invalidPhone: 'Invalid phone number format' };
  };
}