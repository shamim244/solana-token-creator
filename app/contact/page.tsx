import type { Metadata } from "next";
import Link from "next/link";
import {
  Send,
  MessageCircle,
  HelpCircle,
  ArrowLeft,
  ExternalLink,
  Mail,
  CheckCircle2,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Contact & Support | Solana Token Studio",
  description:
    "Get support, join our Telegram & Discord communities, and read our comprehensive token launch FAQ.",
};

const FAQ_ITEMS = [
  {
    q: "How fast is token deployment?",
    a: "Token creation executes in a single Solana block—typically under 2 seconds. Once confirmed, your token, creator ATA, initial supply, and Metaplex metadata are immediately live across all explorers and wallets.",
  },
  {
    q: "Are my wallet private keys or funds safe?",
    a: "Yes, 100%. Solana Token Studio is non-custodial and operates client-side in your browser. We never have access to your private keys or seed phrase. All transactions are simulated and signed directly inside your connected wallet (Phantom, Solflare, etc.).",
  },
  {
    q: "What is the difference between Standard SPL and Token-2022?",
    a: "Standard SPL is the universal standard accepted by all DEXs (Raydium, Orca), centralized exchanges, and analytics tools. Token-2022 is Solana's modern extensions program offering transfer fees, interest, and non-transferable soulbound tokens. Most creators choose Standard SPL for maximum liquidity compatibility.",
  },
  {
    q: "Why should I revoke Freeze and Mint authorities?",
    a: "Revoking Freeze authority guarantees that you cannot freeze holders' accounts. Revoking Mint authority guarantees that the supply is capped and no new tokens can ever be printed. Doing both grants your token verified green safety badges on RugCheck and DexScreener.",
  },
  {
    q: "How do I list my token on Raydium after creation?",
    a: "Navigate to our 1-Click DEX Launcher tab, paste your mint address, and click 'Open Raydium CPMM'. Raydium Constant Product (CPMM) allows creating a liquidity pool for ~0.4 SOL without purchasing an expensive OpenBook Market ID (saving 2.8 SOL).",
  },
  {
    q: "What is Platform Network Rent Absorption?",
    a: "Creating Solana accounts (Mint, ATA, Metaplex V3 metadata) requires ~0.009 SOL in on-chain rent-exempt balance. When rent absorption is enabled, the platform absorbs these rent costs into a single flat fee, so your wallet prompt shows the exact amount without hidden surprises.",
  },
];

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-12 sm:py-16 space-y-12">
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
          Contact & Community Support
        </h1>
        <p className="text-sm text-muted-foreground">
          Need help launching your token, revoking authorities, or configuring
          liquidity? Connect with our developer team and community.
        </p>
      </div>

      {/* Support Channels Grid */}
      <div className="grid sm:grid-cols-3 gap-4">
        {/* Telegram */}
        <div className="rounded-2xl border border-border/70 bg-card p-5 space-y-3 flex flex-col justify-between hover:border-sky-500/50 transition-colors">
          <div className="space-y-2">
            <div className="h-10 w-10 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <Send className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-sm text-foreground">
              Telegram Community
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Fastest response time. Join our Telegram support channel for
              real-time troubleshooting and launch tips.
            </p>
          </div>
          <a
            href="https://t.me/solanatokenstudio"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-xs font-semibold hover:bg-accent transition-colors"
          >
            Join Telegram <ExternalLink className="h-3 w-3" />
          </a>
        </div>

        {/* Discord */}
        <div className="rounded-2xl border border-border/70 bg-card p-5 space-y-3 flex flex-col justify-between hover:border-indigo-500/50 transition-colors">
          <div className="space-y-2">
            <div className="h-10 w-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <MessageCircle className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-sm text-foreground">
              Discord Server
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Developer discussions, feature requests, partnership inquiries,
              and community showcases.
            </p>
          </div>
          <a
            href="https://discord.gg/solana"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-xs font-semibold hover:bg-accent transition-colors"
          >
            Join Discord <ExternalLink className="h-3 w-3" />
          </a>
        </div>

        {/* Twitter / X */}
        <div className="rounded-2xl border border-border/70 bg-card p-5 space-y-3 flex flex-col justify-between hover:border-neutral-500/50 transition-colors">
          <div className="space-y-2">
            <div className="h-10 w-10 rounded-xl bg-neutral-500/10 border border-neutral-500/30 flex items-center justify-center text-foreground font-bold">
              𝕏
            </div>
            <h3 className="font-bold text-sm text-foreground">
              Twitter / 𝕏 Channel
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Platform status updates, newly launched ecosystem tools, and
              Solana network announcements.
            </p>
          </div>
          <a
            href="https://x.com/solana"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-xs font-semibold hover:bg-accent transition-colors"
          >
            Follow on 𝕏 <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>

      {/* Direct Inquiries & Partnership Box */}
      <div className="rounded-2xl border border-border/80 bg-card p-6 sm:p-8 space-y-4">
        <div className="flex items-start gap-4">
          <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 shrink-0">
            <Mail className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-bold text-foreground">
              Direct Enterprise & Partnership Inquiries
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Are you an accelerator, DAO, or launchpad looking for high-volume
              whitelabel integration or custom Solana token smart contract
              features? Reach out directly to our engineering leads.
            </p>
            <div className="pt-2">
              <a
                href="mailto:support@solanatokenstudio.io?subject=Solana%20Token%20Studio%20Inquiry"
                className="inline-flex items-center gap-2 text-xs font-semibold text-amber-400 hover:underline"
              >
                support@solanatokenstudio.io &rarr;
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Frequently Asked Questions */}
      <div id="faq" className="space-y-6 pt-4">
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-amber-500" />
            Frequently Asked Questions
          </h2>
          <p className="text-xs text-muted-foreground">
            Everything you need to know about creating and managing tokens on
            Solana.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {FAQ_ITEMS.map((item, idx) => (
            <div
              key={idx}
              className="rounded-2xl border border-border/70 bg-card p-5 space-y-2 hover:border-border transition-colors"
            >
              <h3 className="text-xs font-bold text-foreground flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                {item.q}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed pl-6">
                {item.a}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
