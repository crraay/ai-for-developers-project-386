import { Link, Navigate, Route, Routes, useLocation } from 'react-router';

import styles from './app.module.scss';
import BookFormPage from './pages/book-form-page/BookFormPage';
import BookPage from './pages/book-page/BookPage';
import BookingPage from './pages/booking-page/BookingPage';
import HomePage from './pages/home-page/HomePage';
import HostBookingTypesPage from './pages/host-booking-types-page/HostBookingTypesPage';
import HostPage from './pages/host-page/HostPage';

/**
 * Host mode is a client-side label, not an authentication check (docs/product.md line 15:
 * "deliberate, documented v1 risk"). The header switch is route-based: every URL outside
 * `/host` lights up "Guest"; `/host` lights up "Host".
 */
function App() {
  const { pathname } = useLocation();
  const mode = pathname.startsWith('/host') ? 'host' : 'guest';

  return (
    <>
      <header className={styles.header}>
        <h1 className={styles.title}>
          <Link className={styles.titleLink} to="/">
            Call Calendar
          </Link>
        </h1>
        <nav className={styles.modeSwitch} aria-label="Mode">
          <Link
            to="/"
            className={mode === 'guest' ? styles.active : undefined}
            aria-current={mode === 'guest' ? 'page' : undefined}
          >
            Guest
          </Link>
          <Link
            to="/host"
            className={mode === 'host' ? styles.active : undefined}
            aria-current={mode === 'host' ? 'page' : undefined}
          >
            Host
          </Link>
        </nav>
      </header>
      <main className={styles.main}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/book" element={<BookPage />} />
          <Route path="/book/:start" element={<BookFormPage />} />
          <Route path="/booking/:token" element={<BookingPage />} />
          <Route path="/host" element={<HostPage />} />
          <Route path="/host/booking-types" element={<HostBookingTypesPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </>
  );
}

export default App;
