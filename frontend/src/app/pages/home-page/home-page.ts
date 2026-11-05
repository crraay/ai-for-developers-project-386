import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/** Introduction page: presents the service and routes guests into the booking flow. */
@Component({
  selector: 'app-home-page',
  imports: [RouterLink],
  styleUrl: './home-page.scss',
  templateUrl: './home-page.html',
})
export class HomePage {}
