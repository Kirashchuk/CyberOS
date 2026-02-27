import { InviteRedeemForm } from '@/components/invite-redeem-form';
import { WalletGate } from '@/components/wallet-gate';

export default function AuthPage() {
  return (
    <section className="stack">
      <div className="card">
        <h2>Auth</h2>
        <p>Step 2 of lifecycle: connect wallet and redeem approved invite.</p>
      </div>
      <WalletGate />
      <InviteRedeemForm />
    </section>
  );
}
