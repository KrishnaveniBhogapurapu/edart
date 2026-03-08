import { ReactNode } from 'react';

export function AppShell({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-background p-4">{children}</div>;
}
