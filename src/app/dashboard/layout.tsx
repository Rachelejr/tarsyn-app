import type { ReactNode } from 'react';
import TrialGuard from '@/components/TrialGuard';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <TrialGuard>{children}</TrialGuard>;
}