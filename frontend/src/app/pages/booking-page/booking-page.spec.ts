import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { provideApiConfiguration } from '../../api/api-configuration';
import { localTimeZone } from '../../time';
import { BookingPage } from './booking-page';

const TOKEN = 'test-cancellation-token-000000';
const FUTURE = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

function activatedRouteStub(): ActivatedRoute {
  return {
    snapshot: {
      paramMap: convertToParamMap({ token: TOKEN }),
      queryParamMap: convertToParamMap({}),
    },
  } as unknown as ActivatedRoute;
}

function activeBooking() {
  return {
    guestName: 'Ada Lovelace',
    guestEmail: 'ada@example.com',
    start: FUTURE,
    end: FUTURE,
    state: 'active',
    cancellationToken: TOKEN,
  };
}

describe('BookingPage', () => {
  let httpTesting: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BookingPage],
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

  it('shows booking details from the secret link', () => {
    const fixture = TestBed.createComponent(BookingPage);
    fixture.detectChanges();
    httpTesting.expectOne(`http://localhost:8080/api/bookings/${TOKEN}`).flush(activeBooking());
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Ada Lovelace');
    expect(compiled.textContent).toContain('Confirmed');
    // The "When" row is rendered in the guest's browser timezone, clearly labeled (docs/domain.md)
    expect(compiled.textContent).toContain(localTimeZone());
    expect(compiled.querySelector('button')?.textContent).toContain('Cancel booking');
  });

  it('cancels the booking and frees the slot', () => {
    const fixture = TestBed.createComponent(BookingPage);
    fixture.detectChanges();
    httpTesting.expectOne(`http://localhost:8080/api/bookings/${TOKEN}`).flush(activeBooking());
    fixture.detectChanges();

    (fixture.nativeElement as HTMLElement)
      .querySelector('button')
      ?.dispatchEvent(new Event('click'));

    httpTesting
      .expectOne(`http://localhost:8080/api/bookings/${TOKEN}/cancel`)
      .flush({ ...activeBooking(), state: 'cancelled' });
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Cancelled');
    expect(compiled.querySelector('button')).toBeNull();
    expect(compiled.textContent).toContain('free again');
  });

  it('reports unknown tokens', () => {
    const fixture = TestBed.createComponent(BookingPage);
    fixture.detectChanges();
    httpTesting
      .expectOne(`http://localhost:8080/api/bookings/${TOKEN}`)
      .flush(
        { title: 'Booking not found', status: 404, detail: 'booking not found' },
        { status: 404, statusText: 'Not Found' },
      );
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Booking not found');
  });
});
