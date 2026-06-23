import { useEffect, useRef, useState } from 'react';

/**
 * BootstrapShell — runs an async `bootstrap` function once before
 * rendering children.
 *
 * Use for app-level lazy initialization that shouldn't block the
 * global main.tsx (e.g. Portal must not wait on Drama's IndexedDB
 * migration). The bootstrap itself should be idempotent — re-mounting
 * this shell on route changes is a no-op.
 *
 * Renders nothing while bootstrapping; the caller can pass a fallback
 * (loading spinner, skeleton, etc.) if the gap would be noticeable.
 */
interface BootstrapShellProps {
  bootstrap: () => Promise<void>;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function BootstrapShell({ bootstrap, children, fallback = null }: BootstrapShellProps) {
  const [ready, setReady] = useState(false);
  // Keep the latest `bootstrap` in a ref so the mount-only effect below
  // always reads the freshest closure without retriggering on prop changes.
  const bootstrapRef = useRef(bootstrap);
  useEffect(() => {
    bootstrapRef.current = bootstrap;
  });

  useEffect(() => {
    let cancelled = false;
    bootstrapRef.current().finally(() => {
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!ready) return <>{fallback}</>;
  return <>{children}</>;
}