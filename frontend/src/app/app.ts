import { Component, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { RouterOutlet } from '@angular/router';

@Component({
  imports: [RouterOutlet],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {
  private readonly http = inject(HttpClient);
  protected readonly ping = signal('…');

  constructor() {
    this.http
      .get('http://localhost:8080/api/ping', { responseType: 'text' })
      .subscribe({
        next: (body) => this.ping.set(body),
        error: () => this.ping.set('backend unreachable'),
      });
  }
}
