export type Role = 'USER' | 'ADMIN';

export interface UserProfile {
  id: string;
  walletAddress: string;
  role: Role;
  inviteCode?: string;
}

export interface AccessStatus {
  hasAccess: boolean;
  stage: 'REQUEST_ACCESS' | 'PENDING_APPROVAL' | 'INVITE_REDEEM' | 'APPROVED';
  source_ref: string;
}

export interface AccessRequest {
  id: string;
  walletAddress: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  source_ref: string;
}

export interface Referral {
  id: string;
  inviterWallet: string;
  inviteeWallet: string;
  status: 'SENT' | 'REDEEMED';
  source_ref: string;
}

export interface AuditEvent {
  id: string;
  action: string;
  actorWallet: string;
  metadata: Record<string, string>;
  createdAt: string;
  source_ref: string;
}
