import { AdminAccessPanel } from '@/components/admin-access-panel';
import { api } from '@/lib/api';

export default async function AdminPage() {
  const user = await api.getUser();

  if (user.role !== 'ADMIN') {
    return (
      <section className="card">
        <h2>Admin</h2>
        <p>Forbidden: ADMIN role required.</p>
      </section>
    );
  }

  return (
    <section className="stack">
      <div className="card">
        <h2>Admin</h2>
        <p>Manage access approvals, referral lifecycle, and audit telemetry.</p>
      </div>
      <AdminAccessPanel />
    </section>
  );
}
