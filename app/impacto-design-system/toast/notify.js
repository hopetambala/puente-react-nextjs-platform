/**
 * The app-wide toast queue: `toast({ text, isError })` from anywhere, shown by
 * the one <ToastRegion> mounted in pages/_app.js. Replaces react-toastify, so
 * toasts look like the design system and are announced by screen readers.
 *
 * A plain module-level store (React 17 has no useSyncExternalStore): the
 * region subscribes on mount, and toast() works even before it does.
 */
let nextId = 1;
let toasts = [];
const listeners = new Set();

const emit = () => listeners.forEach((listener) => listener(toasts));

/**
 * @param {{ text: string, isError?: boolean, isWarning?: boolean, isSuccess?: boolean }} options
 * @returns {number} the toast's id, for dismiss()
 */
export function toast({
  text, isError = false, isWarning = false, isSuccess = false,
}) {
  const id = nextId;
  nextId += 1;
  toasts = [...toasts, {
    id, text, isError, isWarning, isSuccess,
  }];
  emit();
  return id;
}

export function dismiss(id) {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

export function subscribe(listener) {
  listeners.add(listener);
  listener(toasts);
  return () => listeners.delete(listener);
}

/** Test-only: empty the queue between tests. */
export function resetToastsForTests() {
  toasts = [];
  nextId = 1;
  emit();
}
