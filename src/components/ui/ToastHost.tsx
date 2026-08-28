import { lazy, Suspense, useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";

const Toaster = lazy(() =>
  import("@/components/ui/toaster").then((mod) => ({ default: mod.Toaster })),
);

/**
 * Radix toast primitives are unused on first paint. Subscribe to the
 * lightweight in-memory toast store and import the UI only when a toast
 * is actually queued.
 */
export function ToastHost() {
  const { toasts } = useToast();
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (toasts.length > 0) setEnabled(true);
  }, [toasts.length]);

  if (!enabled) return null;

  return (
    <Suspense fallback={null}>
      <Toaster />
    </Suspense>
  );
}
