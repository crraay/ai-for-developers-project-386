import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { Link } from 'react-router';

import {
  createBookingTypeMutation,
  deleteBookingTypeMutation,
  listAllBookingTypesOptions,
  listAllBookingTypesQueryKey,
  updateBookingTypeMutation,
} from '../../api/@tanstack/react-query.gen';
import type { BookingTypeResponse } from '../../api/types.gen';
import { errorMessage } from '../../lib/api-errors';
import { useDocumentTitle } from '../../lib/use-document-title';
import styles from './host-booking-types-page.module.scss';

/** Bounds enforced both by the server and the UI to keep invalid input off the wire. */
const EDITABLE_DURATIONS: readonly number[] = [15, 30, 45, 60, 90];

type EditState =
  { mode: 'closed' } | { mode: 'create' } | { mode: 'edit'; original: BookingTypeResponse };

interface Draft {
  title: string;
  description: string;
  durationMinutes: number;
  sortOrder: number;
  active: boolean;
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

/** UC-7: the host manages the booking types the guest can pick from. */
function HostBookingTypesPage() {
  useDocumentTitle('Host — Booking types');

  const queryClient = useQueryClient();
  const dialogRef = useRef<HTMLDialogElement>(null);

  const [edit, setEdit] = useState<EditState>({ mode: 'closed' });
  const [draft, setDraft] = useState<Draft>(blankDraft);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const types = useQuery(listAllBookingTypesOptions());

  function closeEditor(): void {
    setEdit({ mode: 'closed' });
    setDraft(blankDraft());
    setFormError(null);
  }

  function onSaved(): void {
    closeEditor();
    void queryClient.invalidateQueries({ queryKey: listAllBookingTypesQueryKey() });
  }

  const create = useMutation({
    ...createBookingTypeMutation(),
    onSuccess: onSaved,
    onError: (error) => setFormError(errorMessage(error, 'Saving the booking type failed.')),
  });

  const update = useMutation({
    ...updateBookingTypeMutation(),
    onSuccess: onSaved,
    onError: (error) => setFormError(errorMessage(error, 'Saving the booking type failed.')),
  });

  const remove = useMutation({
    ...deleteBookingTypeMutation(),
    onSuccess: () => {
      setConfirmingDeleteId(null);
      setDeleteError(null);
      void queryClient.invalidateQueries({ queryKey: listAllBookingTypesQueryKey() });
    },
    onError: (error) => setDeleteError(errorMessage(error, 'Deleting the booking type failed.')),
  });

  const submitting = create.isPending || update.isPending;
  const editing = edit.mode !== 'closed';
  const list = [...(types.data ?? [])].sort((a, b) => a.sortOrder - b.sortOrder);
  const loadError = types.isError
    ? errorMessage(types.error, 'Could not load booking types.')
    : null;

  function beginCreate(): void {
    setEdit({ mode: 'create' });
    setDraft(blankDraft());
    setFormError(null);
  }

  function beginEdit(type: BookingTypeResponse): void {
    setEdit({ mode: 'edit', original: type });
    setDraft(draftFrom(type));
    setFormError(null);
  }

  function submit(): void {
    if (submitting || edit.mode === 'closed') {
      return;
    }
    const validation = validateDraft(draft);
    if (validation !== null) {
      setFormError(validation);
      return;
    }
    setFormError(null);
    if (edit.mode === 'create') {
      create.mutate({
        body: {
          title: draft.title.trim(),
          description: draft.description,
          durationMinutes: draft.durationMinutes,
        },
      });
      return;
    }
    update.mutate({
      path: { id: edit.original.id },
      body: {
        title: draft.title.trim(),
        description: draft.description,
        durationMinutes: draft.durationMinutes,
        sortOrder: draft.sortOrder,
        active: draft.active,
      },
    });
  }

  function openDelete(type: BookingTypeResponse): void {
    setConfirmingDeleteId(type.id);
    setDeleteError(null);
    remove.reset();
    // `<dialog>.showModal()` isn't implemented in jsdom, so guard the call.
    dialogRef.current?.showModal?.();
  }

  function closeDelete(): void {
    dialogRef.current?.close?.();
    setConfirmingDeleteId(null);
    setDeleteError(null);
    remove.reset();
  }

  return (
    <section className="page">
      <h2>Booking types</h2>
      <p>
        <Link to="/host">Back to bookings</Link>
      </p>
      <p className={styles.hint}>
        Each booking type is what the guest picks from. Their choice sets the call&apos;s duration.
      </p>

      {types.isPending ? (
        <p className={styles.hint}>Loading…</p>
      ) : loadError !== null ? (
        <>
          <p className={styles.error} role="alert">
            {loadError}
          </p>
          <button type="button" onClick={() => void types.refetch()}>
            Retry
          </button>
        </>
      ) : (
        <>
          <button
            type="button"
            className={`${styles.primary} ${styles.newType}`}
            disabled={editing}
            onClick={beginCreate}
          >
            New booking type
          </button>

          {list.length === 0 ? (
            <p className={styles.hint}>No booking types yet — create your first one.</p>
          ) : (
            <div
              className={styles.tableScroll}
              role="region"
              aria-label="Booking types"
              tabIndex={0}
            >
              <table className={styles.types}>
                <thead>
                  <tr>
                    <th scope="col">Order</th>
                    <th scope="col">Title</th>
                    <th scope="col">Duration</th>
                    <th scope="col">Active</th>
                    <th scope="col">
                      <span className={styles.visuallyHidden}>Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((type) => (
                    <tr key={type.id} className={type.active ? undefined : styles.inactive}>
                      <td>{type.sortOrder}</td>
                      <td>
                        <strong>{type.title}</strong>
                        {type.description !== '' && (
                          <p className={styles.hint}>{type.description}</p>
                        )}
                      </td>
                      <td>{type.durationMinutes} min</td>
                      <td>
                        <span
                          className={`${styles.badge} ${type.active ? '' : styles.badgeOff}`.trim()}
                        >
                          {type.active ? 'Visible' : 'Hidden'}
                        </span>
                      </td>
                      <td className={styles.rowActions}>
                        <button type="button" disabled={editing} onClick={() => beginEdit(type)}>
                          Edit
                        </button>
                        <button
                          type="button"
                          className={styles.danger}
                          onClick={() => openDelete(type)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {editing && (
            <section className={styles.editor} aria-label="Booking type editor">
              <h3>{edit.mode === 'create' ? 'New booking type' : 'Edit booking type'}</h3>

              <label className={styles.field}>
                <span className={styles.fieldLabel}>Title</span>
                <input
                  type="text"
                  name="title"
                  value={draft.title}
                  onChange={(event) => setDraft({ ...draft, title: event.target.value })}
                  maxLength={80}
                  required
                />
              </label>

              <label className={styles.field}>
                <span className={styles.fieldLabel}>Description</span>
                <textarea
                  name="description"
                  value={draft.description}
                  onChange={(event) => setDraft({ ...draft, description: event.target.value })}
                  maxLength={280}
                  rows={3}
                />
              </label>

              <label className={styles.field}>
                <span className={styles.fieldLabel}>Duration (minutes)</span>
                <select
                  name="durationMinutes"
                  value={draft.durationMinutes}
                  onChange={(event) =>
                    setDraft({ ...draft, durationMinutes: Number(event.target.value) })
                  }
                  required
                >
                  {EDITABLE_DURATIONS.map((minutes) => (
                    <option key={minutes} value={minutes}>
                      {minutes} minutes
                    </option>
                  ))}
                </select>
              </label>

              {edit.mode === 'edit' && (
                <>
                  <label className={styles.field}>
                    <span className={styles.fieldLabel}>Sort order</span>
                    <input
                      type="number"
                      name="sortOrder"
                      value={draft.sortOrder}
                      onChange={(event) =>
                        setDraft({ ...draft, sortOrder: Number(event.target.value) })
                      }
                    />
                  </label>
                  <label className={`${styles.field} ${styles.check}`}>
                    <input
                      type="checkbox"
                      name="active"
                      checked={draft.active}
                      onChange={(event) => setDraft({ ...draft, active: event.target.checked })}
                    />
                    <span>Visible to guests (uncheck to hide without deleting)</span>
                  </label>
                </>
              )}

              {formError !== null && (
                <p className={styles.error} role="alert">
                  {formError}
                </p>
              )}

              <div className={styles.dialogActions}>
                <button
                  type="button"
                  className={styles.primary}
                  disabled={submitting}
                  onClick={submit}
                >
                  {edit.mode === 'create' ? 'Create' : 'Save'}
                </button>
                <button type="button" disabled={submitting} onClick={closeEditor}>
                  Cancel
                </button>
              </div>
            </section>
          )}
        </>
      )}

      <dialog ref={dialogRef} className={styles.deleteDialog}>
        {confirmingDeleteId !== null && (
          <form
            method="dialog"
            className={styles.dialogBody}
            onSubmit={(event) => event.preventDefault()}
          >
            <h3>Delete this booking type?</h3>
            <p className={styles.hint}>
              Existing bookings keep their type label. If any booking uses this type, it is hidden
              instead of removed so those bookings keep their label.
            </p>
            {deleteError !== null && (
              <p className={styles.error} role="alert">
                {deleteError}
              </p>
            )}
            <div className={styles.dialogActions}>
              <button
                type="button"
                className={styles.danger}
                disabled={remove.isPending}
                onClick={() => remove.mutate({ path: { id: confirmingDeleteId } })}
              >
                Delete
              </button>
              <button type="button" disabled={remove.isPending} onClick={closeDelete}>
                Keep it
              </button>
            </div>
          </form>
        )}
      </dialog>
    </section>
  );
}

export default HostBookingTypesPage;
