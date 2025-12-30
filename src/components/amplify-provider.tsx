'use client';

import { Amplify } from 'aws-amplify';
import config from '@/../amplify_outputs.json';
import { useEffect } from 'react';

Amplify.configure(config, { ssr: true });

export function AmplifyProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Ensure Amplify is configured on client mount
    Amplify.configure(config, { ssr: true });
  }, []);

  return <>{children}</>;
}
