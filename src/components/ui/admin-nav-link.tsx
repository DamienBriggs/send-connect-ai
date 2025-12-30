'use client';

import { useEffect, useState } from 'react';
import { Hub } from 'aws-amplify/utils';
import { fetchAuthSession } from 'aws-amplify/auth';
import Link from 'next/link';

/**
 * Client component that shows admin-only navigation link for Maintain Topic
 * Automatically updates when auth state changes via Hub listener
 * Only visible to users in the ADMIN group
 */
export function AdminNavLink() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAdminStatus();

    // Listen for auth events to update admin status in real-time
    const hubListener = Hub.listen('auth', ({ payload }) => {
      if (payload.event === 'signedIn' || payload.event === 'signedOut') {
        checkAdminStatus();
      }
    });

    return () => hubListener();
  }, []);

  const checkAdminStatus = async () => {
    try {
      const session = await fetchAuthSession();
      const groups =
        session.tokens?.accessToken?.payload['cognito:groups'] || [];
      setIsAdmin(Array.isArray(groups) && groups.includes('ADMIN'));
    } catch {
      setIsAdmin(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Don't render anything while checking or if not admin
  if (isLoading || !isAdmin) return null;

  return (
    <Link
      href='/admin/maintain-topic'
      className='text-sm font-medium text-foreground/80 hover:text-foreground transition-colors'
    >
      Maintain Topic
    </Link>
  );
}
