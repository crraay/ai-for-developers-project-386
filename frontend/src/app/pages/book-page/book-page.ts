import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Api } from '../../api/api';
import { listActiveBookingTypes } from '../../api/fn/booking-types/list-active-booking-types';
import { getSlots } from '../../api/fn/slots/get-slots';
import type { BookingTypeResponse } from '../../api/models/booking-type-response';
import { addDays, formatLocalTime, localTimeZone, toDateString } from '../../time';

/** UC-2: pick a day and booking type, browse available start times. */
@Component({
  selector: 'app-book-page',
  imports: [FormsModule, RouterLink],
  styleUrl: './book-page.scss',
  templateUrl: './book-page.html',
})
export class BookPage {
  private readonly api = inject(Api);

  protected readonly timeZone = localTimeZone();
  protected readonly minDate = toDateString(new Date());
  protected readonly maxDate = toDateString(addDays(new Date(), 14));
  protected readonly date = signal(this.minDate);
  protected readonly types = signal<BookingTypeResponse[]>([]);
  protected readonly bookingTypeId = signal<number | null>(null);
  protected readonly slots = signal<string[]>([]);
  protected readonly error = signal<string | null>(null);
  protected readonly formatTime = formatLocalTime;

  constructor() {
    this.api.invoke(listActiveBookingTypes).subscribe({
      next: (types) => {
        this.types.set(types);
        this.bookingTypeId.set(types[0]?.id ?? null);
        this.loadSlots();
      },
      error: () => this.error.set('Could not load booking types.'),
    });
  }

  protected onDateChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.date.set(value);
    this.loadSlots();
  }

  protected onTypeChange(event: Event): void {
    const value = Number((event.target as HTMLSelectElement).value);
    this.bookingTypeId.set(value);
    this.loadSlots();
  }

  private loadSlots(): void {
    const id = this.bookingTypeId();
    if (id === null) {
      return;
    }
    this.error.set(null);
    this.api.invoke(getSlots, { date: this.date(), bookingTypeId: id }).subscribe({
      next: (starts) => this.slots.set(starts),
      error: () => {
        this.slots.set([]);
        this.error.set('Could not load slots.');
      },
    });
  }
}
