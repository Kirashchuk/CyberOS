'use client';

import { FormEvent, useState } from 'react';
import { api } from '@/lib/api';

export function AccessRequestForm() {
  const [walletAddress, setWalletAddress] = useState('');
  const [result, setResult] = useState('');

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const status = await api.requestAccess(walletAddress);
    setResult(`Status: ${status.stage} (source_ref: ${status.source_ref})`);
  }

  return (
    <form onSubmit={onSubmit} className="card">
      <h3>Request access</h3>
      <label htmlFor="walletAddress">Wallet address</label>
      <input
        id="walletAddress"
        value={walletAddress}
        onChange={(event) => setWalletAddress(event.target.value)}
        placeholder="0x..."
        required
      />
      <button type="submit">Submit request</button>
      {result ? <p>{result}</p> : null}
    </form>
  );
}
