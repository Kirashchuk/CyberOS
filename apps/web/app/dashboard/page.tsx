import { api } from '@/lib/api';

export default async function DashboardPage() {
  const [user, status] = await Promise.all([api.getUser(), api.getAccessStatus()]);

  return (
    <section className="stack">
      <div className="card">
        <h2>Dashboard</h2>
        <p>Wallet: {user.walletAddress}</p>
        <p>Role: {user.role}</p>
        <p>Access stage: {status.stage}</p>
        <p>source_ref: {status.source_ref}</p>
      </div>
      {!status.hasAccess ? (
        <div className="card">
          <p>Access is not active yet. Complete request-access and invite redeem steps.</p>
        </div>
      ) : (
        <div className="card">
          <p>Access granted. You now have full app access.</p>
        </div>
      )}
    </section>
  );
}
