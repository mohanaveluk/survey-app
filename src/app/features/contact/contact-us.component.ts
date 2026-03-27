import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { SharedModule } from '../../shared/shared.module';
import { environment } from '../../../environments/environment';
import { ContactUsService } from './contact-us.service';

@Component({
  selector: 'app-contact-us',
  templateUrl: './contact-us.component.html',
  styleUrls: ['./contact-us.component.scss'],
  imports: [SharedModule],
})
export class ContactUsComponent implements OnInit {

  contactForm!: FormGroup;

  isSubmitting = false;
  submitted    = false;
  errorMessage = '';

  // Stored after submit to display in the thank-you card
  sentName  = '';
  sentEmail = '';

  constructor(
    private fb:   FormBuilder,
    private contactService: ContactUsService,
    private cd: ChangeDetectorRef

  ) {}

  ngOnInit(): void {
    this.buildForm();
  }

  // ── Form ──────────────────────────────────────────────────────────────────

  private buildForm(): void {
    this.contactForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName:  ['', Validators.required],
      email:     ['', [Validators.required, Validators.email]],
      phone:     ['', Validators.pattern(/^[+\d\s\-().]{7,20}$/)],
      subject:   ['', Validators.required],
      message:   [
        '',
        [
          Validators.required,
          Validators.minLength(10),
          Validators.maxLength(1000),
        ],
      ],
    });
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  onSubmit(): void {
    if (this.contactForm.invalid || this.isSubmitting) return;

    this.isSubmitting = true;
    this.errorMessage = '';

    const { firstName, lastName, email, phone, subject, message } =
      this.contactForm.value;

    const payload = {
      firstName: firstName,
      lastName:  lastName,
      email,
      mobile:      phone || undefined,
      subject,
      message,
    };

    this.contactService.submitContactForm(payload).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.sentName     = `${firstName} ${lastName}`;
        this.sentEmail    = email;
        this.submitted    = true;
        this.cd.detectChanges();
      },
      error: (err) => {
        this.isSubmitting = false;
        this.errorMessage =
          err?.error?.message ??
          'Failed to send your message. Please try again.';
        this.cd.detectChanges();
      },
    });
  }

  // ── Reset — allow another message ─────────────────────────────────────────

  resetForm(): void {
    this.submitted    = false;
    this.sentName     = '';
    this.sentEmail    = '';
    this.errorMessage = '';
    this.contactForm.reset();
  }
}