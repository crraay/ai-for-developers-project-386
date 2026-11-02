import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideApiConfiguration } from '../../api/api-configuration';
import { BookPage } from './book-page';
import { formatLocalTime, localTimeZone } from '../../time';

describe('BookPage', () => {
  let httpTesting: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BookPage],
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

  const settings = { timezone: 'Europe/Berlin', allowedDurations: [30] };

  function loadSlots(slots: string[]): void {
    httpTesting.expectOne('http://localhost:8080/api/host-settings').flush(settings);
    const request = httpTesting.expectOne((req) => req.urlWithParams.includes('/api/slots'));
    request.flush(slots);
  }

  it('lists slots labeled in the browser timezone', () => {
    const fixture = TestBed.createComponent(BookPage);
    fixture.detectChanges();
    loadSlots(['2026-11-03T08:00:00Z', '2026-11-03T08:15:00Z']);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelectorAll('.slot-link')).toHaveLength(2);
    expect(compiled.textContent).toContain(formatLocalTime('2026-11-03T08:00:00Z'));
    expect(compiled.textContent).toContain(localTimeZone());
  });

  it('reloads slots when the day changes', async () => {
    const fixture = TestBed.createComponent(BookPage);
    fixture.detectChanges();
    loadSlots(['2026-11-03T08:00:00Z']);
    fixture.detectChanges();

    const dateInput = (fixture.nativeElement as HTMLElement).querySelector(
      'input[type="date"]',
    ) as HTMLInputElement;
    await fixture.whenStable();
    dateInput.value = '2026-11-04';
    dateInput.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    fixture.detectChanges();

    const request = httpTesting.expectOne((req) => req.urlWithParams.includes('date=2026-11-04'));
    request.flush([]);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('No available slots');
    expect(compiled.querySelectorAll('.slot-link')).toHaveLength(0);
  });

  it('shows an error when slots cannot be loaded', () => {
    const fixture = TestBed.createComponent(BookPage);
    fixture.detectChanges();
    httpTesting.expectOne('http://localhost:8080/api/host-settings').flush(settings);
    httpTesting
      .expectOne((req) => req.urlWithParams.includes('/api/slots'))
      .flush('boom', { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Could not load slots');
  });
});
