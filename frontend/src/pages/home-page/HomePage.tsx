import { Link } from 'react-router';

import { useDocumentTitle } from '../../lib/use-document-title';
import styles from './home-page.module.scss';

/** Introduction page: presents the service and routes guests into the booking flow. */
function HomePage() {
  useDocumentTitle('Call Calendar');

  return (
    <section className={styles.landing}>
      <div className={styles.hero}>
        <h2 className={styles.heroTitle}>Book a call, no account needed</h2>
        <p className={styles.heroSub}>
          Choose an available slot, add your name and email, and your booking is confirmed on the
          spot — with a private link to check or cancel anytime.
        </p>
        <Link className={styles.cta} to="/book">
          Book a call
        </Link>
      </div>

      <div className={styles.steps}>
        <h2>How it works</h2>
        <ol className={styles.stepList}>
          <li className={styles.step}>
            <h3 className={styles.stepTitle}>Choose a slot</h3>
            <p>
              Browse the times your host has opened up, shown in your own timezone, and pick the one
              that works.
            </p>
          </li>
          <li className={styles.step}>
            <h3 className={styles.stepTitle}>Add your details</h3>
            <p>Enter your name and email so your host knows who&apos;s calling.</p>
          </li>
          <li className={styles.step}>
            <h3 className={styles.stepTitle}>Keep your link</h3>
            <p>
              You&apos;ll get a private link to your booking — open it anytime to see the details or
              cancel.
            </p>
          </li>
        </ol>
      </div>
    </section>
  );
}

export default HomePage;
