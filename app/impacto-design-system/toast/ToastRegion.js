import { useTranslation } from 'next-i18next';
import { useEffect, useRef, useState } from 'react';

import styles from './css/toast.module.css';
import Toast from './index';
import { dismiss, subscribe } from './notify';

// Long enough to read a sentence twice at a slow pace. Errors never time out.
const AUTO_DISMISS_MS = 8000;

/**
 * A single queued toast. Non-error toasts dismiss themselves, but the clock
 * stops while the pointer is over the toast or focus is inside it, so a reader
 * is never cut off mid-sentence (WCAG 2.2.1). Errors stay until dismissed.
 */
function QueuedToast({ item }) {
  const [paused, setPaused] = useState(false);
  const remaining = useRef(AUTO_DISMISS_MS);
  const startedAt = useRef(0);
  const ref = useRef(null);

  // Pause while hovered or while focus is inside. Bound as plain listeners:
  // they only stop a timer and don't make the list item a control, so they
  // don't belong in JSX event props (where jsx-a11y reads them as one).
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    // mouseover/out and focusin/out bubble from the toast's children; leaving
    // counts only when the pointer or focus goes somewhere outside the toast.
    const pause = () => setPaused(true);
    const resumeIfLeft = (event) => { if (!el.contains(event.relatedTarget)) setPaused(false); };
    el.addEventListener('mouseover', pause);
    el.addEventListener('mouseout', resumeIfLeft);
    el.addEventListener('focusin', pause);
    el.addEventListener('focusout', resumeIfLeft);
    return () => {
      el.removeEventListener('mouseover', pause);
      el.removeEventListener('mouseout', resumeIfLeft);
      el.removeEventListener('focusin', pause);
      el.removeEventListener('focusout', resumeIfLeft);
    };
  }, []);

  useEffect(() => {
    if (item.isError || paused) return undefined;
    startedAt.current = Date.now();
    const timer = setTimeout(() => dismiss(item.id), remaining.current);
    return () => {
      clearTimeout(timer);
      remaining.current -= Date.now() - startedAt.current;
    };
  }, [item.id, item.isError, paused]);

  return (
    <div ref={ref} className={styles.item}>
      <Toast
        text={item.text}
        isError={item.isError}
        isWarning={item.isWarning}
        isSuccess={item.isSuccess}
        closeToast={() => dismiss(item.id)}
        isQueued
      />
    </div>
  );
}

/**
 * Where toast() messages appear, mounted once for the whole app. Two live
 * regions that exist from page load, so what is added to them is announced:
 * a polite status region for confirmations, an assertive alert region for
 * errors (WCAG 4.1.3). Bottom of the screen, full width on a phone.
 */
export default function ToastRegion() {
  const { t } = useTranslation('common');
  const [items, setItems] = useState([]);
  useEffect(() => subscribe(setItems), []);

  const errors = items.filter((i) => i.isError);
  const others = items.filter((i) => !i.isError);

  return (
    <section className={styles.region} aria-label={t('notifications_label')}>
      <div className={styles.list} role="status" aria-live="polite">
        {others.map((item) => <QueuedToast key={item.id} item={item} />)}
      </div>
      <div className={styles.list} role="alert" aria-live="assertive">
        {errors.map((item) => <QueuedToast key={item.id} item={item} />)}
      </div>
    </section>
  );
}
