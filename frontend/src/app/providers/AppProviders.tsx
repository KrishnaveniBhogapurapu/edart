import { ReactNode, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';

export function AppProviders({ children }: { children: ReactNode }) {
  const init = useAuthStore((state) => state.init);

  useEffect(() => {
    void init();
  }, [init]);

  return children;
}
