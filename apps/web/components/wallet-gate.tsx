'use client';

import { usePrivy } from '@privy-io/react-auth';

export function WalletGate() {
  const { login, logout, authenticated, user, ready } = usePrivy();

  if (!ready) {
    return <p>Bootstrapping wallet session...</p>;
  }

  return (
    <div className="card">
      <h3>Wallet access</h3>
      <p>
        {authenticated
          ? `Connected: ${user?.wallet?.address ?? 'Unknown wallet'}`
          : 'Connect your wallet to continue.'}
      </p>
      {authenticated ? (
        <button onClick={logout}>Disconnect</button>
      ) : (
        <button onClick={login}>Connect with Privy</button>
      )}
    </div>
  );
}
