import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { HomePage } from './home-page';

describe('HomePage', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomePage],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  function render(): HTMLElement {
    const fixture = TestBed.createComponent(HomePage);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('presents the service and links into the booking flow', () => {
    const compiled = render();

    expect(compiled.textContent).toContain('Book a call, no account needed');
    const cta = compiled.querySelector<HTMLAnchorElement>('.cta');
    expect(cta?.textContent?.trim()).toBe('Book a call');
    expect(cta?.getAttribute('href')).toBe('/book');
  });

  it('explains the booking flow in three steps', () => {
    const compiled = render();

    const titles = Array.from(compiled.querySelectorAll('.step-title'), (el) =>
      el.textContent?.trim(),
    );
    expect(titles).toEqual(['Choose a slot', 'Add your details', 'Keep your link']);
  });
});
