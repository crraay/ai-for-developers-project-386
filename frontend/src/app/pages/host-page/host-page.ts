import { Component, ElementRef, ViewChild, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Api } from '../../api/api';
import { errorMessage } from '../../api-errors';
import { listBookings } from '../../api/fn/booking/list-bookings';
import { listAllBookingTypes } from '../../api/fn/booking-types/list-all-booking-types';
import { cancelBookingById } from '../../api/fn/host-bookings/cancel-booking-by-id';
import { getHostSettings } from '../../api/fn/host-settings/get-host-settings';
import type { BookingTypeResponse } from '../../api/models/booking-type-response';
import type { HostBookingResponse } from '../../api/models/host-booking-response';
import { durationLabel, formatInTimeZone } from '../../time';

type Filter = 'all' | 'active' | 'cancelled';

/** UC-5 + UC-6: the host's view of upcoming bookings, with cancellation by id. */
@Component({
  selector: 'app-host-page',
  imports: [RouterLink],
  styleUrl: './host-page.scss',
  templateUrl: './host-page.html',
})
export class HostPage {
  private readonly api = inject(Api);

  /** null = not loaded yet; an array (possibly empty) = loaded. */
  private readonly bookings = signal<HostBookingResponse[] | null>(null);
  private readonly loadError = signal<string | null>(null);
  private readonly nowMs = signal<number>(Date.now());
  private readonly timeZone = signal<string | null>(null);
  private readonly filter = signal<Filter>('all');
  private readonly confirmingId = signal<number | null>(null);
  private readonly cancellingId = signal<number | null>(null);
  private readonly dialogError = signal<string | null>(null);
  /** id → type, used to render each row's title. */
  private readonly types = signal<Map<number, BookingTypeResponse>>(new Map());

  @ViewChild('confirmDialog') private confirmDialog?: ElementRef<HTMLDialogElement>;

  protected readonly isLoading = computed(
    () => this.bookings() === null && this.loadError() === null,
  );

  protected readonly ongoingBooking = computed<HostBookingResponse | null>(() => {
    const list = this.bookings();
    if (list === null) return null;
    const now = this.nowMs();
    return list.find((b) => Date.parse(b.start) <= now && now < Date.parse(b.end)) ?? null;
  });

  protected readonly upcoming = computed<HostBookingResponse[]>(() => {
    const list = this.bookings();
    if (list === null) return [];
    const now = this.nowMs();
    return list.filter((b) => Date.parse(b.start) > now && this.matchesFilter(b));
  });

  protected readonly confirmingBooking = computed<HostBookingResponse | null>(() => {
    const id = this.confirmingId();
    if (id === null) return null;
    return this.bookings()?.find((b) => b.id === id) ?? null;
  });

  protected readonly zone = computed(() => this.timeZone() ?? 'UTC');

  protected readonly emptyMessage = computed(() => {
    switch (this.filter()) {
      case 'active':
        return 'No active bookings.';
      case 'cancelled':
        return 'No cancelled bookings.';
      default:
        return 'No upcoming bookings.';
    }
  });

  constructor() {
    this.refresh();
  }

  protected refresh(): void {
    this.bookings.set(null);
    this.loadError.set(null);
    this.api.invoke(getHostSettings, {}).subscribe({
      next: ({ timezone }) => this.timeZone.set(timezone),
      error: () => this.timeZone.set('UTC'),
    });
    this.api.invoke(listAllBookingTypes).subscribe({
      // Best-effort: types are a UI nicety, so a failure here must not stop
      // the bookings list from rendering.
      next: (list) => this.types.set(new Map(list.map((t) => [t.id, t]))),
      error: () => this.types.set(new Map()),
    });
    this.api.invoke(listBookings, {}).subscribe({
      next: (list) => this.bookings.set(list),
      error: (err: unknown) => this.loadError.set(errorMessage(err, 'Could not load bookings.')),
    });
  }

  protected setFilter(value: Filter): void {
    this.filter.set(value);
  }

  protected canCancelRow(b: HostBookingResponse): boolean {
    return b.state === 'active' && Date.parse(b.start) > this.nowMs();
  }

  protected formatDate(iso: string): string {
    return formatInTimeZone(iso, this.zone(), {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  protected formatTimeRange(start: string, end: string): string {
    const opts: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' };
    return `${formatInTimeZone(start, this.zone(), opts)}–${formatInTimeZone(
      end,
      this.zone(),
      opts,
    )}`;
  }

  protected formatDuration(start: string, end: string): string {
    return durationLabel(start, end);
  }

  protected typeTitle(bookingTypeId: number): string {
    return this.types().get(bookingTypeId)?.title ?? '—';
  }

  protected openCancelDialog(b: HostBookingResponse): void {
    this.confirmingId.set(b.id);
    this.dialogError.set(null);
    this.confirmDialog?.nativeElement.showModal();
  }

  protected closeCancelDialog(): void {
    this.confirmDialog?.nativeElement.close();
    this.confirmingId.set(null);
    this.dialogError.set(null);
  }

  protected confirmCancel(): void {
    const id = this.confirmingId();
    if (id === null) return;
    this.cancellingId.set(id);
    this.dialogError.set(null);
    this.api.invoke(cancelBookingById, { id }).subscribe({
      next: (updated) => {
        this.bookings.update(
          (list) => list?.map((b) => (b.id === updated.id ? updated : b)) ?? null,
        );
        this.cancellingId.set(null);
        this.closeCancelDialog();
      },
      error: (err: unknown) => {
        this.cancellingId.set(null);
        this.dialogError.set(errorMessage(err, 'Cancellation failed.'));
      },
    });
  }

  protected isConfirming(b: HostBookingResponse): boolean {
    return this.confirmingId() === b.id;
  }

  protected isCancelling(id: number): boolean {
    return this.cancellingId() === id;
  }

  private matchesFilter(b: HostBookingResponse): boolean {
    switch (this.filter()) {
      case 'active':
        return b.state === 'active';
      case 'cancelled':
        return b.state === 'cancelled';
      default:
        return true;
    }
  }
}
