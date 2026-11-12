import { Component, ElementRef, ViewChild, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Api } from '../../api/api';
import { errorMessage } from '../../api-errors';
import { createBookingType } from '../../api/fn/booking-types/create-booking-type';
import { deleteBookingType } from '../../api/fn/booking-types/delete-booking-type';
import { listAllBookingTypes } from '../../api/fn/booking-types/list-all-booking-types';
import { updateBookingType } from '../../api/fn/booking-types/update-booking-type';
import type { BookingTypeResponse } from '../../api/models/booking-type-response';

/** Bounds enforced both by the server and the UI to keep invalid input off the wire. */
const EDITABLE_DURATIONS: readonly number[] = [15, 30, 45, 60, 90];

type EditState =
  | { mode: 'create' }
  | { mode: 'edit'; original: BookingTypeResponse }
  | { mode: 'closed'; original: BookingTypeResponse };

interface Draft {
  title: string;
  description: string;
  durationMinutes: number;
  sortOrder: number;
  active: boolean;
}

/** UC-7: the host manages the booking types the guest can pick from. */
@Component({
  selector: 'app-host-booking-types-page',
  imports: [RouterLink],
  styleUrl: './host-booking-types-page.scss',
  templateUrl: './host-booking-types-page.html',
})
export class HostBookingTypesPage {
  private readonly api = inject(Api);

  protected readonly editableDurations = EDITABLE_DURATIONS;
  protected readonly types = signal<BookingTypeResponse[] | null>(null);
  protected readonly loadError = signal<string | null>(null);
  protected readonly edit = signal<EditState>({ mode: 'closed', original: blankType() });
  protected readonly draft = signal<Draft>(blankDraft());
  protected readonly submitting = signal(false);
  protected readonly formError = signal<string | null>(null);
  protected readonly confirmingDeleteId = signal<number | null>(null);
  protected readonly deleting = signal(false);
  protected readonly deleteError = signal<string | null>(null);

  protected readonly isLoading = computed(() => this.types() === null && this.loadError() === null);

  protected readonly editing = computed(() => this.edit().mode !== 'closed');

  constructor() {
    this.refresh();
  }

  protected refresh(): void {
    this.types.set(null);
    this.loadError.set(null);
    this.api.invoke(listAllBookingTypes).subscribe({
      next: (list) => this.types.set([...list].sort((a, b) => a.sortOrder - b.sortOrder)),
      error: (err: unknown) =>
        this.loadError.set(errorMessage(err, 'Could not load booking types.')),
    });
  }

  protected beginCreate(): void {
    this.edit.set({ mode: 'create' });
    this.draft.set(blankDraft());
    this.formError.set(null);
  }

  protected beginEdit(type: BookingTypeResponse): void {
    this.edit.set({ mode: 'edit', original: type });
    this.draft.set(draftFrom(type));
    this.formError.set(null);
  }

  protected cancelEdit(): void {
    if (this.edit().mode === 'closed') return;
    this.edit.set({ mode: 'closed', original: blankType() });
    this.draft.set(blankDraft());
    this.formError.set(null);
  }

  protected onTitleInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.draft.update((current) => ({ ...current, title: value }));
  }

  protected onDescriptionInput(event: Event): void {
    const value = (event.target as HTMLTextAreaElement).value;
    this.draft.update((current) => ({ ...current, description: value }));
  }

  protected onDurationChange(event: Event): void {
    const value = Number((event.target as HTMLSelectElement).value);
    this.draft.update((current) => ({ ...current, durationMinutes: value }));
  }

  protected onSortOrderInput(event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    this.draft.update((current) => ({ ...current, sortOrder: value }));
  }

  protected onActiveChange(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.draft.update((current) => ({ ...current, active: checked }));
  }

  protected submit(): void {
    if (this.submitting()) return;
    const current = this.edit();
    if (current.mode === 'closed') return;
    const draft = this.draft();
    const validation = validateDraft(draft);
    if (validation !== null) {
      this.formError.set(validation);
      return;
    }
    this.submitting.set(true);
    this.formError.set(null);
    const request$ =
      current.mode === 'create'
        ? this.api.invoke(createBookingType, {
            body: {
              title: draft.title.trim(),
              description: draft.description,
              durationMinutes: draft.durationMinutes,
            },
          })
        : this.api.invoke(updateBookingType, {
            id: current.original.id,
            body: {
              title: draft.title.trim(),
              description: draft.description,
              durationMinutes: draft.durationMinutes,
              sortOrder: draft.sortOrder,
              active: draft.active,
            },
          });
    request$.subscribe({
      next: () => {
        this.submitting.set(false);
        this.cancelEdit();
        this.refresh();
      },
      error: (err: unknown) => {
        this.submitting.set(false);
        this.formError.set(errorMessage(err, 'Saving the booking type failed.'));
      },
    });
  }

  protected openDelete(type: BookingTypeResponse): void {
    this.confirmingDeleteId.set(type.id);
    this.deleteError.set(null);
    // `<dialog>.showModal()` isn't implemented in jsdom, so guard the call.
    this.deleteDialog?.nativeElement.showModal?.();
  }

  protected closeDelete(): void {
    this.deleteDialog?.nativeElement.close?.();
    this.confirmingDeleteId.set(null);
    this.deleteError.set(null);
  }

  protected confirmDelete(): void {
    const id = this.confirmingDeleteId();
    if (id === null || this.deleting()) return;
    this.deleting.set(true);
    this.deleteError.set(null);
    this.api.invoke(deleteBookingType, { id }).subscribe({
      next: () => {
        this.deleting.set(false);
        this.confirmingDeleteId.set(null);
        this.refresh();
      },
      error: (err: unknown) => {
        this.deleting.set(false);
        this.deleteError.set(errorMessage(err, 'Deleting the booking type failed.'));
      },
    });
  }

  @ViewChild('deleteDialog') private deleteDialog?: ElementRef<HTMLDialogElement>;
}

function blankDraft(): Draft {
  return {
    title: '',
    description: '',
    durationMinutes: 30,
    sortOrder: 100,
    active: true,
  };
}

function blankType(): BookingTypeResponse {
  return {
    id: 0,
    title: '',
    description: '',
    durationMinutes: 30,
    sortOrder: 0,
    active: true,
  };
}

function draftFrom(type: BookingTypeResponse): Draft {
  return {
    title: type.title,
    description: type.description,
    durationMinutes: type.durationMinutes,
    sortOrder: type.sortOrder,
    active: type.active,
  };
}

/** Returns the first validation error message, or null if the draft is OK. */
function validateDraft(draft: Draft): string | null {
  const trimmed = draft.title.trim();
  if (trimmed.length === 0) return 'Title is required.';
  if (trimmed.length > 80) return 'Title must be 80 characters or fewer.';
  if (draft.description.length > 280) return 'Description must be 280 characters or fewer.';
  if (!Number.isInteger(draft.durationMinutes)) return 'Duration must be a whole number.';
  if (draft.durationMinutes < 5 || draft.durationMinutes > 240) {
    return 'Duration must be between 5 and 240 minutes.';
  }
  if (!Number.isInteger(draft.sortOrder)) return 'Sort order must be a whole number.';
  return null;
}
