import { AccessRequest, AccessStatus, AuditEvent, Referral, UserProfile } from '@/lib/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8787';

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`API request failed for ${path}: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export const api = {
  getUser: () => apiFetch<UserProfile>('/v1/me'),
  getAccessStatus: () => apiFetch<AccessStatus>('/v1/access/status'),
  requestAccess: (walletAddress: string) =>
    apiFetch<AccessStatus>('/v1/access/request', {
      method: 'POST',
      body: JSON.stringify({ walletAddress }),
    }),
  redeemInvite: (inviteCode: string) =>
    apiFetch<AccessStatus>('/v1/invites/redeem', {
      method: 'POST',
      body: JSON.stringify({ inviteCode }),
    }),
  getAuditFeed: () => apiFetch<AuditEvent[]>('/v1/audit'),
  getAccessRequests: () => apiFetch<AccessRequest[]>('/v1/admin/access-requests'),
  approveAccessRequest: (requestId: string) =>
    apiFetch<AccessRequest>(`/v1/admin/access-requests/${requestId}/approve`, {
      method: 'POST',
    }),
  getReferrals: () => apiFetch<Referral[]>('/v1/admin/referrals'),
};
