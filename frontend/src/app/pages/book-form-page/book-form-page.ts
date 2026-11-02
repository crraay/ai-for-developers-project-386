import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Api } from '../../api/api';
import { errorMessage } from '../../api-errors';
import { createBooking } from '../../api/fn/booking/create-booking';
import { formatLocalDateTime } from '../../time';

/** UC-3: name + email form for a chosen slot; on success opens the secret link. */
@Component({
  selector: 'app-book-form-page',
  imports: [FormsModule, RouterLink],
  styleUrl: './book-form-page.scss',
  templateUrl: './book-form-page.html',
})
export class BookFormPage {
  private readonly api = inject(Api);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly start: string = this.route.snapshot.paramMap.get('start') ?? '';
  protected readonly durationMinutes: number = this.parseDuration();
  protected readonly formatDateTime = formatLocalDateTime;
  protected readonly submitting = signal(false);
  protected readonly error = signal<string | null>(null);

  guestName = '';
  guestEmail = '';

  protected submit(): void {
    if (this.submitting() || this.guestName.trim() === '' || this.guestEmail.trim() === '') {
      return;
    }
    this.submitting.set(true);
    this.error.set(null);
    this.api
      .invoke(createBooking, {
        body: {
          start: this.start,
          durationMinutes: this.durationMinutes,
          guestName: this.guestName,
          guestEmail: this.guestEmail,
        },
      })
      .subscribe({
        next: (booking) => void this.router.navigate(['/booking', booking.cancellationToken]),
        error: (error: unknown) => {
          this.submitting.set(false);
          this.error.set(errorMessage(error, 'Booking failed — is the backend running?'));
        },
      });
  }

  private parseDuration(): number {
    const raw = Number(this.route.snapshot.queryParamMap.get('durationMinutes'));
    return Number.isFinite(raw) && raw > 0 ? raw : 30;
  }
}
