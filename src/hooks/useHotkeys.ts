import { useEffect } from 'react';

export function useHotkeys(
  handlers: Record<string, (e: KeyboardEvent) => void>,
  deps: React.DependencyList = []
) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const key = [
        e.metaKey || e.ctrlKey ? 'Cmd' : '',
        e.key,
      ]
        .filter(Boolean)
        .join('+');

      const handler = handlers[key] ?? handlers[e.key];
      if (handler) {
        e.preventDefault();
        handler(e);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
