import { AccessRequestForm } from '@/components/access-request-form';

export default function WaitlistPage() {
  return (
    <section className="stack">
      <div className="card">
        <h2>Waitlist</h2>
        <p>Step 1 of lifecycle: request-access with wallet identity.</p>
      </div>
      <AccessRequestForm />
    </section>
  );
}
