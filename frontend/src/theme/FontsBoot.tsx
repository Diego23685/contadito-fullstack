// src/theme/FontsBoot.tsx
import { useEffect } from 'react';
import { loadApoka, patchGlobalFont } from './typography';

export default function FontsBoot() {
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        await loadApoka();
        if (alive) patchGlobalFont();
      } catch (e) {
        console.error('FontsBoot error:', e);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return null; // no bloquea la UI
}
