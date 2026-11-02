import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Api } from '../../api/api';
import { errorMessage } from '../../api-errors';
import { cancelBooking } from '../../api/fn/booking/cancel-booking';
import { getBooking } from '../../api/fn/booking/get-booking';
import type { BookingResponse } from '../../api/models/booking-response';
import { formatLocalDateTime, formatLocalTime, localTimeZone } from '../../time';

/** UC-4: the secret cancellation link — booking details plus cancel action. */
@Component({
  selector: 'app-booking-page',
  imports: [RouterLink],
  styleUrl: './booking-page.scss',
  templateUrl: './booking-page.html',
})
export class BookingPage {
  private readonly api = inject(Api);
  private readonly route = inject(ActivatedRoute);

  protected readonly token: string = this.route.snapshot.paramMap.get('token') ?? '';
  protected readonly booking = signal<BookingResponse | null>(null);
  protected readonly loadFailed = signal(false);
  protected readonly cancelling = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly formatDateTime = formatLocalDateTime;
  protected readonly formatTime = formatLocalTime;
  protected readonly timeZone = localTimeZone();

  /** Invariant #3: cancellation is allowed only before the booking starts. */
  protected readonly canCancel = computed(() => {
    const booking = this.booking();
    return (
      booking !== null &&
      booking.state === 'active' &&
      new Date(booking.start).getTime() > Date.now()
    );
  });

  constructor() {
    this.load();
  }

  protected cancel(): void {
    this.cancelling.set(true);
    this.error.set(null);
    this.api.invoke(cancelBooking, { token: this.token }).subscribe({
      next: (booking) => {
        this.booking.set(booking);
        this.cancelling.set(false);
      },
      error: (error: unknown) => {
        this.cancelling.set(false);
        this.error.set(errorMessage(error, 'Cancellation failed.'));
      },
    });
  }

  private load(): void {
    this.api.invoke(getBooking, { token: this.token }).subscribe({
      next: (booking) => this.booking.set(booking),
      error: () => this.loadFailed.set(true),
    });
  }
}
