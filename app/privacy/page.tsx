import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy Policy | Solana Token Studio",
  description:
    "Information regarding our privacy practices, decentralized data handling, and non-custodial operations.",
};

export default function PrivacyPage() {
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
          Privacy Policy
        </h1>
        <p className="text-sm text-muted-foreground">
          Last revised: October 2026 &bull; Committed to user privacy and
          decentralization
        </p>
      </div>

      {/* Highlights Banner */}
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5 sm:p-6 space-y-2">
        <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-emerald-400" />
          Zero Personal Data Collection Policy
        </h2>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Solana Token Studio does not require user accounts, email addresses,
          names, or passwords. We never track your real-world identity or store
          financial credentials.
        </p>
      </div>

      {/* Content */}
      <div className="space-y-8 text-xs sm:text-sm text-muted-foreground leading-relaxed">
        <section className="space-y-3">
          <h2 className="text-base sm:text-lg font-bold text-foreground">
            1. Information We Do NOT Collect
          </h2>
          <p>
            Unlike traditional web applications, Solana Token Studio is built on
            decentralized Web3 principles:
          </p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>
              <strong>No Personal Identity:</strong> We do not collect names,
              email addresses, physical addresses, phone numbers, or government
              identification.
            </li>
            <li>
              <strong>No Financial Credentials:</strong> We do not collect or
              process credit cards, bank accounts, or fiat payment details.
            </li>
            <li>
              <strong>No Private Keys:</strong> We have zero access to your
              wallet private keys, seed phrases, or master passwords.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-base sm:text-lg font-bold text-foreground">
            2. Public Blockchain Information
          </h2>
          <p>
            When you connect your self-custodial wallet and sign a transaction:
          </p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>
              Your public Solana wallet address is read by your browser to query
              on-chain balances and compose transactions.
            </li>
            <li>
              All transaction signatures, mint addresses, token metadata, and
              account balances are permanently and publicly recorded on the
              Solana ledger.
            </li>
            <li>
              Token logo images and metadata JSON files are stored publicly on
              decentralized networks (such as Irys and Arweave / IPFS) to ensure
              global indexability by wallets, DEXs, and explorers.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-base sm:text-lg font-bold text-foreground">
            3. Local Storage & Cookies
          </h2>
          <p>
            We use browser <code>localStorage</code> strictly for client-side
            convenience:
          </p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>
              <strong>Theme Preference:</strong> Storing whether you prefer dark
              or light theme.
            </li>
            <li>
              <strong>Selected Cluster:</strong> Remembering whether you are
              working on Solana Mainnet or Devnet.
            </li>
            <li>
              <strong>Recent Drafts:</strong> Caching in-progress token form
              fields so your work is not lost if you accidentally refresh the
              page.
            </li>
          </ul>
          <p>
            We do not use third-party advertising cookies or cross-site
            trackers.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base sm:text-lg font-bold text-foreground">
            4. Decentralized RPC Endpoints
          </h2>
          <p>
            To fetch blockchain state and broadcast transactions, the client
            communicates with public Solana RPC nodes (such as{" "}
            <code>https://api.mainnet-beta.solana.com</code>). These third-party
            node providers may log IP addresses and basic network telemetry in
            accordance with their own infrastructure logging policies.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base sm:text-lg font-bold text-foreground">
            5. Contact Us Regarding Privacy
          </h2>
          <p>
            If you have questions regarding our privacy architecture, you can
            reach out via our official community support channels or visit our{" "}
            <Link
              href="/contact"
              className="text-amber-400 hover:underline font-medium"
            >
              Contact Page
            </Link>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
