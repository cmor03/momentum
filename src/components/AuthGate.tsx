'use client';

import SignIn from './SignIn';
import { useAppStore } from '@/store/useAppStore';

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const status = useAppStore((s) => s.status);

  if (status === 'booting') {
    return <div className="min-h-dvh bg-bg" aria-hidden />;
  }
  if (status === 'signedOut') {
    return <SignIn />;
  }
  return <>{children}</>;
}
