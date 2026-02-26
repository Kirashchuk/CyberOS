'use client';

import { PrivyProvider } from '@privy-io/react-auth';
import { ReactNode } from 'react';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;

  if (!appId) {
    throw new Error('NEXT_PUBLIC_PRIVY_APP_ID is required for Privy integration.');
  }

  return (
    <PrivyProvider
      appId={appId}
      config={{
        loginMethods: ['wallet'],
        embeddedWallets: {
          createOnLogin: 'off',
        },
      }}
    >
      {children}
    </PrivyProvider>
  );
}
