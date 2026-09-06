﻿import type { ReactNode } from 'react';
import TrialGuard from '@/components/TrialGuard';
import AccessFeeGuard from '@/components/AccessFeeGuard';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <TrialGuard><AccessFeeGuard>{children}</AccessFeeGuard></TrialGuard>;
}
