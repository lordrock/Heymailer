'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';

export default function RootPage() {
  const router = useRouter();
  const { admin, loading } = useAuth();
  useEffect(() => {
    if (loading) return;
    if (!admin) router.replace('/login');
    else router.replace(admin.role === 'superadmin' ? '/super-admin/billing' : '/dashboard');
  }, [admin, loading, router]);
  return null;
}
