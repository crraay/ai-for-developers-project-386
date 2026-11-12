import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideApiConfiguration } from '../../api/api-configuration';
import { HostBookingTypesPage } from './host-booking-types-page';

function asType(
  overrides: Partial<{
    id: number;
    title: string;
    description: string;
    durationMinutes: number;
    sortOrder: number;
    active: boolean;
  }> = {},
) {
  return {
    id: 1,
    title: 'Quick chat',
    description: 'A short sync-up.',
    durationMinutes: 30,
    sortOrder: 10,
    active: true,
    ...overrides,
  };
}

/**
 * The native `value` setter bypasses Angular's value-accessor event
 * listeners on the prototype, so direct property assignment often leaves
 * NgModel out of sync. Walking up the prototype chain to the platform
 * setter and dispatching the matching event keeps NgModel-style bindings
 * in step with the DOM.
 */
function setInputValue(element: HTMLInputElement | HTMLTextAreaElement, value: string): void {
  const proto =
    element instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
  setter?.call(element, value);
  element.dispatchEvent(new Event('input', { bubbles: true }));
}

describe('HostBookingTypesPage', () => {
  let httpTesting: HttpTestingController;
  let fixture: ComponentFixture<HostBookingTypesPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostBookingTypesPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideApiConfiguration('http://localhost:8080'),
      ],
    }).compileComponents();
    httpTesting = TestBed.inject(HttpTestingController);

    fixture = TestBed.createComponent(HostBookingTypesPage);
    fixture.detectChanges();
  });

  afterEach(() => httpTesting.verify());

  function loadInitial(list: ReturnType<typeof asType>[]): void {
    httpTesting.expectOne('http://localhost:8080/api/host/booking-types').flush(list);
    fixture.detectChanges();
  }

  it('lists the loaded booking types', () => {
    loadInitial([
      asType({ id: 1, title: 'Quick chat', sortOrder: 10 }),
      asType({
        id: 2,
        title: 'Deep dive',
        description: 'Long-form working session.',
        durationMinutes: 60,
        sortOrder: 20,
      }),
    ]);

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Quick chat');
    expect(compiled.textContent).toContain('Deep dive');
    expect(compiled.textContent).toContain('30 min');
    expect(compiled.textContent).toContain('60 min');
  });

  it('opens the editor with a blank draft when creating', () => {
    loadInitial([asType({ id: 1 })]);

    (fixture.nativeElement as HTMLElement)
      .querySelector('button.new-type')!
      .dispatchEvent(new Event('click', { bubbles: true }));
    fixture.detectChanges();

    const editor = fixture.nativeElement.querySelector('.editor') as HTMLElement;
    expect(editor).not.toBeNull();
    expect((editor.querySelector('input[name="title"]') as HTMLInputElement).value).toBe('');
    expect(
      (editor.querySelector('textarea[name="description"]') as HTMLTextAreaElement).value,
    ).toBe('');
  });

  it('POSTs the new booking type when Create is clicked', () => {
    loadInitial([asType({ id: 1 })]);

    const host = fixture.nativeElement as HTMLElement;
    host.querySelector('button.new-type')!.dispatchEvent(new Event('click', { bubbles: true }));
    fixture.detectChanges();

    const editor = host.querySelector('.editor') as HTMLElement;
    setInputValue(editor.querySelector('input[name="title"]') as HTMLInputElement, 'Coffee');
    fixture.detectChanges();

    editor
      .querySelector('.dialog-actions button.primary')!
      .dispatchEvent(new Event('click', { bubbles: true }));
    fixture.detectChanges();

    const request = httpTesting.expectOne(
      (req) => req.method === 'POST' && req.url === 'http://localhost:8080/api/host/booking-types',
    );
    expect(request.request.body).toEqual({
      title: 'Coffee',
      description: '',
      durationMinutes: 30,
    });
    request.flush(asType({ id: 3, title: 'Coffee' }));

    httpTesting
      .expectOne('http://localhost:8080/api/host/booking-types')
      .flush([asType({ id: 1 }), asType({ id: 3, title: 'Coffee' })]);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Coffee');
  });

  it('PUTs the edited booking type when Save is clicked', () => {
    loadInitial([asType({ id: 1, title: 'Quick chat' })]);

    const host = fixture.nativeElement as HTMLElement;
    const rowActions = host.querySelector('.row-actions') as HTMLElement;
    (rowActions.querySelector('button:not(.danger)') as HTMLButtonElement).click();
    fixture.detectChanges();

    const editor = host.querySelector('.editor') as HTMLElement;
    setInputValue(editor.querySelector('input[name="title"]') as HTMLInputElement, 'Quick sync');
    fixture.detectChanges();

    editor
      .querySelector('.dialog-actions button.primary')!
      .dispatchEvent(new Event('click', { bubbles: true }));
    fixture.detectChanges();

    const request = httpTesting.expectOne(
      (req) => req.method === 'PUT' && req.url === 'http://localhost:8080/api/host/booking-types/1',
    );
    expect(request.request.body).toEqual({
      title: 'Quick sync',
      description: 'A short sync-up.',
      durationMinutes: 30,
      sortOrder: 10,
      active: true,
    });
    request.flush(asType({ id: 1, title: 'Quick sync' }));

    httpTesting
      .expectOne('http://localhost:8080/api/host/booking-types')
      .flush([asType({ id: 1, title: 'Quick sync' })]);
    fixture.detectChanges();

    const refreshed = fixture.nativeElement as HTMLElement;
    expect(refreshed.textContent).not.toContain('Quick chat');
    expect(refreshed.textContent).toContain('Quick sync');
  });

  it('removes the booking type after the confirmation dialog', () => {
    loadInitial([asType({ id: 1 })]);

    const host = fixture.nativeElement as HTMLElement;
    (host.querySelector('.row-actions button.danger') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(host.textContent).toContain('Delete this booking type?');

    const buttons: HTMLButtonElement[] = Array.from(host.querySelectorAll('.delete-dialog button'));
    const deleteButton = buttons.find((b) => b.textContent?.trim() === 'Delete');
    expect(deleteButton).toBeDefined();
    deleteButton!.click();
    fixture.detectChanges();

    httpTesting
      .expectOne(
        (req) =>
          req.method === 'DELETE' && req.url === 'http://localhost:8080/api/host/booking-types/1',
      )
      .flush(null);

    httpTesting.expectOne('http://localhost:8080/api/host/booking-types').flush([]);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('No booking types yet');
  });

  it('surfaces the server message when loading fails', () => {
    httpTesting
      .expectOne('http://localhost:8080/api/host/booking-types')
      .flush(
        { title: 'Server error', status: 500, detail: 'boom' },
        { status: 500, statusText: 'Server Error' },
      );
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('boom');
  });
});
