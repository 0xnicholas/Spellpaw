import { useEffect } from 'react';

function isInputTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select' || target.isContentEditable;
}

export function useHotkeys(
  handlers: Record<string, (e: KeyboardEvent) => void>,
  deps: React.DependencyList = []
) {
  if (import.meta.env.DEV) {
    if (typeof handlers !== 'object' || handlers === null || Array.isArray(handlers)) {
      throw new TypeError(
        `useHotkeys expects an object mapping keys to handlers, received ${typeof handlers}`
      );
    }
  }

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Ignore typing inside form fields so shortcuts don't steal from inputs.
      if (isInputTarget(e.target)) return;

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
