import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { provideApiConfiguration } from '../../api/api-configuration';
import { BookFormPage } from './book-form-page';

const START = '2026-11-03T08:00:00Z';
const TOKEN = 'test-cancellation-token-000000';

function activatedRouteStub(): ActivatedRoute {
  return {
    snapshot: {
      paramMap: convertToParamMap({ start: START }),
      queryParamMap: convertToParamMap({ durationMinutes: '30' }),
    },
  } as unknown as ActivatedRoute;
}

describe('BookFormPage', () => {
  let httpTesting: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BookFormPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: ActivatedRoute, useFactory: activatedRouteStub },
        provideApiConfiguration('http://localhost:8080'),
      ],
    }).compileComponents();
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  // NgModel wires up its value-accessor listener and propagates view->model
  // updates on microtasks, so both before and after the event need a flush.
  async function fillField(
    fixture: ComponentFixture<BookFormPage>,
    name: string,
    value: string,
  ): Promise<void> {
    await fixture.whenStable();
    const input = fixture.nativeElement.querySelector(`input[name="${name}"]`) as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await fixture.whenStable();
  }

  function submit(root: HTMLElement): void {
    const form = root.querySelector('form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  }

  async function fillAndSubmit(fixture: ComponentFixture<BookFormPage>): Promise<HTMLElement> {
    await fillField(fixture, 'guestName', 'Ada Lovelace');
    await fillField(fixture, 'guestEmail', 'ada@example.com');
    const compiled = fixture.nativeElement as HTMLElement;
    submit(compiled);
    return compiled;
  }

  it('shows the chosen slot before booking', () => {
    const fixture = TestBed.createComponent(BookFormPage);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('30 minutes');
    expect(compiled.textContent).toContain('Confirm booking');
  });

  it('books the slot and navigates to the secret link', async () => {
    const fixture = TestBed.createComponent(BookFormPage);
    fixture.detectChanges();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate');

    await fillAndSubmit(fixture);

    const request = httpTesting.expectOne('http://localhost:8080/api/bookings');
    expect(request.request.body).toEqual({
      start: START,
      durationMinutes: 30,
      guestName: 'Ada Lovelace',
      guestEmail: 'ada@example.com',
    });
    request.flush({
      guestName: 'Ada Lovelace',
      guestEmail: 'ada@example.com',
      start: START,
      end: '2026-11-03T08:30:00Z',
      state: 'active',
      cancellationToken: TOKEN,
    });

    expect(navigate).toHaveBeenCalledWith(['/booking', TOKEN]);
  });

  it('shows the problem detail when the slot is gone', async () => {
    const fixture = TestBed.createComponent(BookFormPage);
    fixture.detectChanges();

    await fillAndSubmit(fixture);

    httpTesting.expectOne('http://localhost:8080/api/bookings').flush(
      {
        type: 'about:blank',
        title: 'Slot no longer available',
        status: 409,
        detail: 'slot no longer available',
      },
      { status: 409, statusText: 'Conflict' },
    );
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('no longer available');
  });
});
