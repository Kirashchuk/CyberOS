'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { AccessRequest, AuditEvent, Referral } from '@/lib/types';

export function AdminAccessPanel() {
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [audit, setAudit] = useState<AuditEvent[]>([]);

  async function loadData() {
    const [accessRequests, referralData, auditData] = await Promise.all([
      api.getAccessRequests(),
      api.getReferrals(),
      api.getAuditFeed(),
    ]);

    setRequests(accessRequests);
    setReferrals(referralData);
    setAudit(auditData);
  }

  useEffect(() => {
    void loadData();
  }, []);

  async function approve(requestId: string) {
    await api.approveAccessRequest(requestId);
    await loadData();
  }

  return (
    <div className="stack">
      <section className="card">
        <h3>Access requests</h3>
        <ul>
          {requests.map((request) => (
            <li key={request.id}>
              {request.walletAddress} • {request.status} • {request.source_ref}{' '}
              {request.status === 'PENDING' ? (
                <button onClick={() => approve(request.id)}>Approve</button>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <section className="card">
        <h3>Referrals</h3>
        <ul>
          {referrals.map((referral) => (
            <li key={referral.id}>
              {referral.inviterWallet} → {referral.inviteeWallet} ({referral.status}) • {referral.source_ref}
            </li>
          ))}
        </ul>
      </section>

      <section className="card">
        <h3>Audit feed</h3>
        <ul>
          {audit.map((event) => (
            <li key={event.id}>
              {event.createdAt}: {event.action} by {event.actorWallet} • {event.source_ref}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
