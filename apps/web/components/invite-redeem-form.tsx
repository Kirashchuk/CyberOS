'use client';

import { FormEvent, useState } from 'react';
import { api } from '@/lib/api';

export function InviteRedeemForm() {
  const [inviteCode, setInviteCode] = useState('');
  const [result, setResult] = useState('');

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const status = await api.redeemInvite(inviteCode);
    setResult(`Status: ${status.stage} (source_ref: ${status.source_ref})`);
  }

  return (
    <form onSubmit={onSubmit} className="card">
      <h3>Redeem invite</h3>
      <label htmlFor="inviteCode">Invite code</label>
      <input
        id="inviteCode"
        value={inviteCode}
        onChange={(event) => setInviteCode(event.target.value)}
        placeholder="INVITE-XXXX"
        required
      />
      <button type="submit">Redeem invite</button>
      {result ? <p>{result}</p> : null}
    </form>
  );
}
