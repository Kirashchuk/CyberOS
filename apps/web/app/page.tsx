import { WalletGate } from '@/components/wallet-gate';

export default function LandingPage() {
  return (
    <section className="stack">
      <div className="card">
        <h2>Landing</h2>
        <p>Single entrypoint for wallet connect via Privy and invite-gated app access.</p>
      </div>
      <WalletGate />
    </section>
  );
}
