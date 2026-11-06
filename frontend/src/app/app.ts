import { Component, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterLink, RouterOutlet],
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {
  private readonly router = inject(Router);
  private readonly currentUrl = signal(this.router.url);

  /**
   * Host mode is a client-side label, not an authentication check (docs/product.md line 15:
   * "deliberate, documented v1 risk"). The header switch is route-based: every URL outside
   * `/host` lights up "Guest"; `/host` lights up "Host".
   */
  protected readonly mode = computed(() =>
    this.currentUrl().startsWith('/host') ? 'host' : 'guest',
  );

  constructor() {
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.currentUrl.set(event.urlAfterRedirects);
      }
    });
  }
}
