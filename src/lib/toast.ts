"use client";

/**
 * Tiny toast bus. No external dep — a single module-scoped
 * publish/subscribe hub plus three convenience helpers (`info`,
 * `error`, `demo`). Components register a listener via
 * `subscribe()`; the global mount point in `<Toaster />` is the
 * single subscriber that actually renders the queue.
 *
 * Why not `sonner` or `react-hot-toast`?
 *   - The brand aesthetic ("Jailbroken Terminal") wants
 *     monospace HUD chips, not the rounded-soft cards those
 *     libraries default to. Restyling them costs more than
 *     the 50 lines of code below.
 *   - We want zero new runtime weight on the home/marketing
 *     bundle. `<Toaster />` is mounted at the layout root but
 *     the Toast type is a `"use client"` module, so it never
 *     leaks into the marketing bundle unless something on the
 *     page imports `pushToast`.
 */

export type ToastTone = "info" | "error" | "demo" | "success";

export interface Toast {
  id: number;
  tone: ToastTone;
  title: string;
  detail?: string;
  /** ms to live before auto-dismiss. 0 = sticky. */
  ttl: number;
}

type Listener = (queue: Toast[]) => void;

let queue: Toast[] = [];
const listeners = new Set<Listener>();
let nextId = 1;

function emit() {
  for (const l of listeners) l(queue);
}

export function subscribe(l: Listener): () => void {
  listeners.add(l);
  l(queue);
  return () => {
    listeners.delete(l);
  };
}

export function dismissToast(id: number) {
  queue = queue.filter((t) => t.id !== id);
  emit();
}

export function pushToast(t: Omit<Toast, "id">): number {
  const id = nextId++;
  queue = [...queue, { ...t, id }];
  emit();
  if (t.ttl > 0) {
    setTimeout(() => dismissToast(id), t.ttl);
  }
  return id;
}

// ---------- Convenience helpers --------------------------------------------

export const toast = {
  info(title: string, detail?: string) {
    return pushToast({ tone: "info", title, detail, ttl: 4000 });
  },
  success(title: string, detail?: string) {
    return pushToast({ tone: "success", title, detail, ttl: 4000 });
  },
  error(title: string, detail?: string) {
    return pushToast({ tone: "error", title, detail, ttl: 6500 });
  },
  /**
   * Demo-mode toast — same shape as info, but visually distinct (amber)
   * and worded for the "this would have happened in prod" use-case.
   * Always carries the "demo · won't persist" subtitle by default so
   * callers don't have to repeat that message at every site.
   */
  demo(title: string, detail?: string) {
    return pushToast({
      tone: "demo",
      title,
      detail: detail ?? "Demo mode · change won't persist",
      ttl: 5000,
    });
  },
};
