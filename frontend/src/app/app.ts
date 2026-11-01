import { Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Api } from './api/api';
import { ping as pingOperation } from './api/fn/ping/ping';

@Component({
  imports: [RouterOutlet],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {
  private readonly api = inject(Api);
  protected readonly ping = signal('…');

  constructor() {
    this.api.invoke(pingOperation).subscribe({
      next: (body) => this.ping.set(body),
      error: () => this.ping.set('backend unreachable'),
    });
  }
}
