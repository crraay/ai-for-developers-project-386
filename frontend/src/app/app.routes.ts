import { Routes } from '@angular/router';
import { BookFormPage } from './pages/book-form-page/book-form-page';
import { BookPage } from './pages/book-page/book-page';
import { BookingPage } from './pages/booking-page/booking-page';
import { HomePage } from './pages/home-page/home-page';
import { HostBookingTypesPage } from './pages/host-booking-types-page/host-booking-types-page';
import { HostPage } from './pages/host-page/host-page';

export const routes: Routes = [
  { path: '', component: HomePage, title: 'Call Calendar' },
  { path: 'book', component: BookPage, title: 'Available times' },
  { path: 'book/:start', component: BookFormPage, title: 'Book a call' },
  { path: 'booking/:token', component: BookingPage, title: 'Your booking' },
  { path: 'host', component: HostPage, title: 'Host — Upcoming bookings' },
  { path: 'host/booking-types', component: HostBookingTypesPage, title: 'Host — Booking types' },
  { path: '**', redirectTo: '' },
];
