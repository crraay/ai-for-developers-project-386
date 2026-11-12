import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideApiConfiguration } from '../../api/api-configuration';
import { HostPage } from './host-page';

const TIMEZONE = 'Europe/Berlin';

function asHostBooking(
  overrides: Partial<{
    id: number;
    guestName: string;
    guestEmail: string;
    start: string;
    end: string;
    state: 'active' | 'cancelled';
    bookingTypeId: number;
  }> = {},
) {
  const start = new Date(Date.now() + 3 * 3_600_000);
  const end = new Date(start.getTime() + 30 * 60_000);
  return {
    id: 1,
    guestName: 'Ada Lovelace',
    guestEmail: 'ada@example.com',
    start: start.toISOString(),
    end: end.toISOString(),
    state: 'active' as const,
    bookingTypeId: 1,
    ...overrides,
  };
}

const TYPES_RESPONSE = [
  { id: 1, title: 'Quick chat', description: '', durationMinutes: 30, sortOrder: 10, active: true },
  { id: 2, title: 'Deep dive', description: '', durationMinutes: 60, sortOrder: 20, active: true },
];

describe('HostPage', () => {
  let httpTesting: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideApiConfiguration('http://localhost:8080'),
      ],
    }).compileComponents();
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('renders upcoming bookings with the configured timezone', () => {
    const fixture = TestBed.createComponent(HostPage);
    fixture.detectChanges();

    httpTesting.expectOne('http://localhost:8080/api/host-settings').flush({ timezone: TIMEZONE });
    httpTesting.expectOne('http://localhost:8080/api/host/booking-types').flush(TYPES_RESPONSE);
    httpTesting
      .expectOne('http://localhost:8080/api/bookings')
      .flush([asHostBooking({ id: 42, guestName: 'Ada Lovelace' })]);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Upcoming bookings');
    expect(compiled.textContent).toContain('Ada Lovelace');
    expect(compiled.textContent).toContain('ada@example.com');
    expect(compiled.textContent).toContain(TIMEZONE);
    expect(compiled.textContent).toContain('30 min');
    expect(compiled.textContent).toContain('Quick chat');
    // At least one cancel button per row.
    expect(compiled.querySelectorAll('.bookings button.danger').length).toBeGreaterThan(0);
  });

  it('hides the cancel button on already-cancelled bookings', () => {
    const fixture = TestBed.createComponent(HostPage);
    fixture.detectChanges();

    httpTesting.expectOne('http://localhost:8080/api/host-settings').flush({ timezone: TIMEZONE });
    httpTesting.expectOne('http://localhost:8080/api/host/booking-types').flush(TYPES_RESPONSE);
    httpTesting
      .expectOne('http://localhost:8080/api/bookings')
      .flush([asHostBooking({ id: 7, state: 'cancelled' })]);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.bookings button.danger')).toBeNull();
    expect(compiled.textContent).toContain('Cancelled');
  });

  it('promotes the only ongoing booking to the Happening now section', () => {
    const fixture = TestBed.createComponent(HostPage);
    const now = new Date();
    const started = new Date(now.getTime() - 15 * 60_000);
    const ended = new Date(now.getTime() + 15 * 60_000);
    fixture.detectChanges();

    httpTesting.expectOne('http://localhost:8080/api/host-settings').flush({ timezone: TIMEZONE });
    httpTesting.expectOne('http://localhost:8080/api/host/booking-types').flush(TYPES_RESPONSE);
    httpTesting.expectOne('http://localhost:8080/api/bookings').flush([
      asHostBooking({
        id: 9,
        guestName: 'Ongoing Agora',
        start: started.toISOString(),
        end: ended.toISOString(),
      }),
    ]);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.ongoing')?.textContent).toContain('Happening now');
    expect(compiled.textContent).toContain('Ongoing Agora');
    // Ongoing bookings are frozen; the table row shows the booking but no cancel button.
    expect(compiled.querySelector('.bookings button.danger')).toBeNull();
  });

  it('filters by Active and Cancelled bubbles', () => {
    const fixture = TestBed.createComponent(HostPage);
    fixture.detectChanges();

    httpTesting.expectOne('http://localhost:8080/api/host-settings').flush({ timezone: TIMEZONE });
    httpTesting.expectOne('http://localhost:8080/api/host/booking-types').flush(TYPES_RESPONSE);
    httpTesting
      .expectOne('http://localhost:8080/api/bookings')
      .flush([
        asHostBooking({ id: 1, guestName: 'Active Ada', state: 'active' }),
        asHostBooking({ id: 2, guestName: 'Cancelled Cassin', state: 'cancelled' }),
      ]);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const buttons: HTMLButtonElement[] = Array.from(root.querySelectorAll('.filters button'));
    expect(buttons.map((b) => b.textContent?.trim())).toEqual(['All', 'Active', 'Cancelled']);

    buttons[1].click(); // Active
    fixture.detectChanges();
    let compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Active Ada');
    expect(compiled.textContent).not.toContain('Cancelled Cassin');

    buttons[2].click(); // Cancelled
    fixture.detectChanges();
    compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Cancelled Cassin');
    expect(compiled.textContent).not.toContain('Active Ada');
  });

  it('shows the friendly error and retry button when the list fails', () => {
    const fixture = TestBed.createComponent(HostPage);
    fixture.detectChanges();

    httpTesting.expectOne('http://localhost:8080/api/host-settings').flush({ timezone: TIMEZONE });
    httpTesting.expectOne('http://localhost:8080/api/host/booking-types').flush(TYPES_RESPONSE);
    httpTesting
      .expectOne('http://localhost:8080/api/bookings')
      .flush(
        { type: 'about:blank', title: 'Server error', status: 500, detail: 'boom' },
        { status: 500, statusText: 'Server Error' },
      );
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('boom');
    expect(
      compiled.querySelector<HTMLButtonElement>('button[type="button"]')?.textContent,
    ).toContain('Retry');
  });
});
