import { Routes } from '@angular/router';
import { BookFormPage } from './pages/book-form-page/book-form-page';
import { BookPage } from './pages/book-page/book-page';
import { BookingPage } from './pages/booking-page/booking-page';
import { HomePage } from './pages/home-page/home-page';

export const routes: Routes = [
  { path: '', component: HomePage, title: 'Call Calendar' },
  { path: 'book', component: BookPage, title: 'Available times' },
  { path: 'book/:start', component: BookFormPage, title: 'Book a call' },
  { path: 'booking/:token', component: BookingPage, title: 'Your booking' },
  { path: '**', redirectTo: '' },
];
