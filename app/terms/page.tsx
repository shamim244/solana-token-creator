import type { Metadata } from "next";
import Link from "next/link";
import { ShieldAlert, ArrowLeft, CheckCircle2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Terms and Conditions | Solana Token Studio",
  description:
    "Legal terms, non-custodial software disclaimers, and token creation guidelines.",
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-12 sm:py-16 space-y-8">
      {/* Back to Home */}
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors font-medium"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Token Studio
      </Link>

      {/* Header */}
      <div className="space-y-3 border-b border-border/60 pb-6">
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground">
          Terms & Conditions
        </h1>
        <p className="text-sm text-muted-foreground">
          Last revised: October 2026 &bull; Effective for all users of Solana
          Token Studio
        </p>
      </div>

      {/* Key Principles Box */}
      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5 sm:p-6 space-y-3">
        <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-amber-500" />
          Important Non-Custodial Protocol Notice
        </h2>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Solana Token Studio provides decentralized, client-side open-source
          interfaces for interacting with the Solana blockchain. We do not
          custody funds, manage private keys, or control the tokens deployed
          through our smart contract integrations.
        </p>
      </div>

      {/* Legal Content */}
      <div className="space-y-8 text-xs sm:text-sm text-muted-foreground leading-relaxed">
        <section className="space-y-3">
          <h2 className="text-base sm:text-lg font-bold text-foreground">
            1. Non-Custodial Nature of Services
          </h2>
          <p>
            Solana Token Studio operates solely as a client-side interface that
            generates serialized transaction messages for the SPL Token Program,
            Token-2022 Program, and Metaplex Foundation Token Metadata Program.
          </p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>
              We never hold, access, or store your private keys, seed phrases,
              or wallet credentials.
            </li>
            <li>
              Every transaction is simulated, reviewed, and signed directly
              inside your connected self-custodial wallet (e.g., Phantom,
              Solflare, Backpack).
            </li>
            <li>
              Transactions are broadcast directly to public Solana validators
              via decentralized RPC endpoints.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-base sm:text-lg font-bold text-foreground">
            2. User Responsibilities & On-Chain Finality
          </h2>
          <p>
            Due to the immutable nature of the Solana blockchain, all
            transactions executed by users are final and irreversible.
          </p>
          <div className="rounded-xl border border-border/60 bg-card p-4 space-y-2">
            <span className="font-semibold text-foreground block">
              You explicitly acknowledge that:
            </span>
            <div className="space-y-1.5 text-xs">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Revocations are permanent:</strong> Revoking Freeze,
                  Mint, or Metadata Update authority permanently surrenders
                  control over that capability. No entity, including Solana
                  Token Studio, can restore revoked authorities.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Token burning is irreversible:</strong> Tokens burned
                  via the Token Burner are removed from circulating supply
                  permanently.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Regulatory compliance:</strong> You are solely
                  responsible for ensuring that any token created complies with
                  the laws, securities regulations, and sanctions of your
                  jurisdiction.
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-base sm:text-lg font-bold text-foreground">
            3. Platform Fees & Network Rent
          </h2>
          <p>
            Solana Token Studio charges dynamic platform fees for services such
            as token creation, authority revocations, and metadata updates.
            These fees are clearly itemized in the user interface and in wallet
            signing prompts prior to confirmation.
          </p>
          <p>
            When network rent absorption is enabled, the platform fee includes
            the mandatory Solana on-chain rent-exempt balances required for
            Mint, ATA, and Metaplex accounts.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base sm:text-lg font-bold text-foreground">
            4. No Financial, Legal, or Investment Advice
          </h2>
          <p>
            Nothing on this website, in our documentation, or within our
            interfaces constitutes financial, investment, legal, or tax advice.
            Solana Token Studio does not endorse, guarantee, or sponsor any
            token or smart contract created by users.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base sm:text-lg font-bold text-foreground">
            5. Limitation of Liability
          </h2>
          <p>
            To the maximum extent permitted by applicable law, Solana Token
            Studio, its developers, and contributors shall not be held liable
            for any indirect, punitive, or consequential damages, including loss
            of digital assets, wallet vulnerabilities, blockchain forks, or RPC
            downtime.
          </p>
        </section>
      </div>
    </div>
  );
}
