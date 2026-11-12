import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Api } from '../../api/api';
import { errorMessage } from '../../api-errors';
import { listActiveBookingTypes } from '../../api/fn/booking-types/list-active-booking-types';
import { createBooking } from '../../api/fn/booking/create-booking';
import type { BookingTypeResponse } from '../../api/models/booking-type-response';
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
  /**
   * The id parsed from the query string. null means the link itself is bad (hand-typed,
   * stale from before Issue #28, or just malformed) — never fall back to a default id.
   */
  protected readonly bookingTypeId = signal<number | null>(this.parseBookingTypeId());
  protected readonly type = signal<BookingTypeResponse | null>(null);
  /** Set once we know the link is missing a valid type — blocks submission. */
  protected readonly missingType = signal(false);
  protected readonly formatDateTime = formatLocalDateTime;
  protected readonly submitting = signal(false);
  protected readonly error = signal<string | null>(null);

  guestName = '';
  guestEmail = '';

  constructor() {
    const id = this.bookingTypeId();
    if (id === null) {
      this.missingType.set(true);
      return;
    }
    this.api.invoke(listActiveBookingTypes).subscribe({
      next: (types) => this.type.set(types.find((t) => t.id === id) ?? null),
      // A failed lookup keeps the parsed id; the server validates it on submit.
      error: () => this.type.set(null),
    });
  }

  protected submit(): void {
    const id = this.bookingTypeId();
    if (this.submitting() || id === null) {
      return;
    }
    if (this.guestName.trim() === '' || this.guestEmail.trim() === '') {
      return;
    }
    this.submitting.set(true);
    this.error.set(null);
    this.api
      .invoke(createBooking, {
        body: {
          start: this.start,
          bookingTypeId: id,
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

  private parseBookingTypeId(): number | null {
    const raw = Number(this.route.snapshot.queryParamMap.get('bookingTypeId'));
    return Number.isFinite(raw) && raw > 0 ? raw : null;
  }
}
