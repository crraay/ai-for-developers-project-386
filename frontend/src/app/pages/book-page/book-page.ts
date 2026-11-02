import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Api } from '../../api/api';
import { getHostSettings } from '../../api/fn/host-settings/get-host-settings';
import { getSlots } from '../../api/fn/slots/get-slots';
import { addDays, formatLocalTime, localTimeZone, toDateString } from '../../time';

/** UC-2: pick a day and duration, browse available start times. */
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
  protected readonly maxDate = toDateString(addDays(new Date(), 90));
  protected readonly date = signal(this.minDate);
  protected readonly durations = signal<number[]>([]);
  protected readonly duration = signal<number | null>(null);
  protected readonly slots = signal<string[]>([]);
  protected readonly error = signal<string | null>(null);
  protected readonly formatTime = formatLocalTime;

  constructor() {
    this.api.invoke(getHostSettings).subscribe({
      next: (settings) => {
        this.durations.set(settings.allowedDurations);
        this.duration.set(settings.allowedDurations[0] ?? null);
        this.loadSlots();
      },
      error: () => this.error.set('Could not load host settings.'),
    });
  }

  protected onDateChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.date.set(value);
    this.loadSlots();
  }

  protected onDurationChange(event: Event): void {
    const value = Number((event.target as HTMLSelectElement).value);
    this.duration.set(value);
    this.loadSlots();
  }

  private loadSlots(): void {
    const duration = this.duration();
    if (duration === null) {
      return;
    }
    this.error.set(null);
    this.api.invoke(getSlots, { date: this.date(), durationMinutes: duration }).subscribe({
      next: (starts) => this.slots.set(starts),
      error: () => {
        this.slots.set([]);
        this.error.set('Could not load slots.');
      },
    });
  }
}
