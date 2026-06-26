'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ChatRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/dashboard');
  }, [router]);
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#FAF0E6' }}>
      <p style={{ color: '#6B2D4E', fontSize: '15px', fontWeight: 600 }}>Opening your chats...</p>
    </div>
  );
}
