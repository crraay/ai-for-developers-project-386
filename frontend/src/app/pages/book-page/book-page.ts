import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { Api } from '../../api/api';
import { listActiveBookingTypes } from '../../api/fn/booking-types/list-active-booking-types';
import { getHostSettings } from '../../api/fn/host-settings/get-host-settings';
import { getSlots } from '../../api/fn/slots/get-slots';
import type { BookingTypeResponse } from '../../api/models/booking-type-response';
import {
  addDaysToDateString,
  dateInTimeZone,
  defaultBookingDate,
  formatLocalTime,
  localTimeZone,
} from '../../time';

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
  protected readonly minDate = signal<string | null>(null);
  protected readonly maxDate = signal<string | null>(null);
  protected readonly date = signal<string>('');
  protected readonly types = signal<BookingTypeResponse[]>([]);
  protected readonly bookingTypeId = signal<number | null>(null);
  protected readonly slots = signal<string[]>([]);
  protected readonly error = signal<string | null>(null);
  protected readonly formatTime = formatLocalTime;

  constructor() {
    forkJoin({
      settings: this.api.invoke(getHostSettings),
      types: this.api.invoke(listActiveBookingTypes),
    }).subscribe({
      next: ({ settings, types }) => {
        const hostZone = settings.timezone;
        const today = dateInTimeZone(hostZone);
        // bookingHorizonDays counts today, so the last selectable date is today + (days - 1).
        const horizonDate = addDaysToDateString(today, settings.bookingHorizonDays - 1, hostZone);
        this.minDate.set(today);
        this.maxDate.set(horizonDate);
        // Issue #1: the bounds stay the host's 14-day window, but the day the guest books is
        // their own — open on their today when it lies inside the window.
        this.date.set(defaultBookingDate(today, horizonDate, dateInTimeZone(this.timeZone)));
        this.types.set(types);
        this.bookingTypeId.set(types[0]?.id ?? null);
        this.loadSlots();
      },
      error: () => this.error.set('Could not load booking settings.'),
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
    // The server must read the picked date in the guest's own calendar (UC-2, issue #1).
    this.api
      .invoke(getSlots, { date: this.date(), bookingTypeId: id, timeZone: this.timeZone })
      .subscribe({
        next: (starts) => this.slots.set(starts),
        error: () => {
          this.slots.set([]);
          this.error.set('Could not load slots.');
        },
      });
  }
}
