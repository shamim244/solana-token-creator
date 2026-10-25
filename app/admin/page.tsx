"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Switch } from "../components/ui/switch";
import {
  ShieldCheck,
  Lock,
  Coins,
  Server,
  Wallet,
  Save,
  LogOut,
  RefreshCw,
  ArrowLeft,
  Layers,
  LayoutDashboard,
  Flame,
  Globe,
  Activity,
  CreditCard,
  FileText,
  Radio,
  ExternalLink,
  Percent,
  CheckCircle2,
  TrendingUp,
  Users,
  Check,
  X,
  UserCheck,
  Sparkles,
  Copy,
} from "lucide-react";
import { toast } from "sonner";
import type { PlatformSettings } from "../lib/platform-settings";
import type { PartnersDataStore } from "../lib/partner-service";

type AdminSection =
  | "overview"
  | "monetization"
  | "infrastructure"
  | "marketing"
  | "partners"
  | "general"
  | "tokens"
  | "diagnostics";

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeSection, setActiveSection] = useState<AdminSection>("overview");

  const [settings, setSettings] = useState<PlatformSettings>({
    mainnetBaseFeeSol: 0.3,
    devnetBaseFeeSol: 0.3,
    revokeFreezeFeeSol: 0.1,
    revokeMintFeeSol: 0.1,
    revokeUpdateFeeSol: 0.1,
    revokeStandaloneFeeSol: 0.05,
    updateMetadataFeeSol: 0.05,
    burnTokenFeeSol: 0.0,
    airdropFeeSol: 0.01,
    absorbNetworkRent: true,
    treasuryWalletAddress: "9poMxa1YY7mTpCpcPmdvcy86vGgBwbL1nmDLrxV8iziU",
    promoDiscountPercent: 0,
    promoBannerActive: false,
    promoBannerText:
      "⚡ Launch Week Special: 20% Off All Authority Revocations!",
    referralProgramActive: false,
    referralFeeSharePercent: 20,
    platformTitle: "Solana Token Studio",
    platformTagline: "SPL & Token-2022 Launchpad",
    supportTelegram: "https://t.me/solanatokenstudio",
    supportTwitter: "https://x.com/solanatokenstudio",
    supportDiscord: "https://discord.gg/solana",
    maintenanceMode: false,
    mainnetRpcUrl: "https://api.mainnet-beta.solana.com",
    devnetRpcUrl: "https://api.devnet.solana.com",
    irysNetwork: "devnet",
  });

  const [diagnostics, setDiagnostics] = useState<{
    platformAddress?: string;
    irysBalance?: string;
    tiers?: Record<string, { status: string; description?: string }>;
  } | null>(null);

  // Partner Management State
  const [partnersStore, setPartnersStore] = useState<PartnersDataStore | null>(
    null
  );
  const [isPartnersLoading, setIsPartnersLoading] = useState(false);
  const [activePartnersTab, setActivePartnersTab] = useState<
    "pending" | "approved" | "payouts" | "conversions"
  >("pending");
  const [partnerRates, setPartnerRates] = useState<
    Record<string, { commission: string; discount: string }>
  >({});
  const [payoutTxInputs, setPayoutTxInputs] = useState<Record<string, string>>(
    {}
  );
  const [processingPartnerId, setProcessingPartnerId] = useState<string | null>(
    null
  );

  const fetchPartnersStore = async (token?: string) => {
    const adminToken =
      token || sessionStorage.getItem("admin_auth_token") || password;
    if (!adminToken) return;
    setIsPartnersLoading(true);
    try {
      const res = await fetch("/api/admin/partners", {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.store) {
          setPartnersStore(data.store);
        }
      }
    } catch (err) {
      console.warn("Failed to load partner records:", err);
    } finally {
      setIsPartnersLoading(false);
    }
  };

  const handleApprovePartner = async (partnerId: string) => {
    const adminToken = sessionStorage.getItem("admin_auth_token") || password;
    setProcessingPartnerId(partnerId);
    try {
      const customRate = partnerRates[partnerId]?.commission;
      const customDisc = partnerRates[partnerId]?.discount;

      const res = await fetch("/api/admin/partners", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          action: "approve",
          partnerId,
          customCommissionPercent:
            customRate !== undefined && customRate !== ""
              ? parseFloat(customRate)
              : undefined,
          audienceDiscountPercent:
            customDisc !== undefined && customDisc !== ""
              ? parseFloat(customDisc)
              : undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success("Partner application approved!");
        await fetchPartnersStore(adminToken);
      } else {
        toast.error(data.error || "Failed to approve partner");
      }
    } catch {
      toast.error("Network error approving partner");
    } finally {
      setProcessingPartnerId(null);
    }
  };

  const handleRejectPartner = async (partnerId: string) => {
    const adminToken = sessionStorage.getItem("admin_auth_token") || password;
    setProcessingPartnerId(partnerId);
    try {
      const res = await fetch("/api/admin/partners", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ action: "reject", partnerId }),
      });
      const data = await res.json();
      if (data.success) {
        toast.info("Partner application rejected");
        await fetchPartnersStore(adminToken);
      } else {
        toast.error(data.error || "Failed to reject partner");
      }
    } catch {
      toast.error("Network error rejecting partner");
    } finally {
      setProcessingPartnerId(null);
    }
  };

  const handleCompletePayout = async (payoutId: string) => {
    const adminToken = sessionStorage.getItem("admin_auth_token") || password;
    setProcessingPartnerId(payoutId);
    try {
      const txSig = payoutTxInputs[payoutId]?.trim() || "confirmed_manual_tx";
      const res = await fetch("/api/admin/partners", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          action: "complete_payout",
          payoutId,
          txSignature: txSig,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Payout marked as completed!");
        setPayoutTxInputs((prev) => {
          const next = { ...prev };
          delete next[payoutId];
          return next;
        });
        await fetchPartnersStore(adminToken);
      } else {
        toast.error(data.error || "Failed to complete payout");
      }
    } catch {
      toast.error("Network error updating payout");
    } finally {
      setProcessingPartnerId(null);
    }
  };

  const loadSettings = async (token: string) => {
    const [settingsRes, diagRes] = await Promise.all([
      fetch("/api/admin/settings", {
        headers: { Authorization: `Bearer ${token}` },
      }),
      fetch("/api/upload-metadata/status"),
      fetchPartnersStore(token),
    ]);

    if (!settingsRes.ok) {
      throw new Error("Authentication failed");
    }

    const settingsData = await settingsRes.json();
    if (settingsData.success && settingsData.settings) {
      setSettings(settingsData.settings);
      setIsAuthenticated(true);
    }

    if (diagRes.ok) {
      const diagData = await diagRes.json();
      setDiagnostics(diagData);
    }
  };

  // Check existing session
  useEffect(() => {
    let ignore = false;
    const savedToken = sessionStorage.getItem("admin_auth_token");
    if (savedToken) {
      Promise.resolve().then(() => {
        if (!ignore) {
          loadSettings(savedToken).catch(() => {
            sessionStorage.removeItem("admin_auth_token");
          });
        }
      });
    }
    return () => {
      ignore = true;
    };
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;

    setIsLoading(true);
    setAuthError("");

    try {
      await loadSettings(password.trim());
      sessionStorage.setItem("admin_auth_token", password.trim());
      setIsAuthenticated(true);
      toast.success("Admin dashboard unlocked");
    } catch {
      setAuthError("Invalid admin passcode. Default is 'admin123'.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    const token = sessionStorage.getItem("admin_auth_token") || password;
    setIsSaving(true);

    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(settings),
      });

      const data = await res.json();
      if (data.success) {
        toast.success("Platform settings updated & synchronized to disk!");
      } else {
        toast.error(data.error || "Failed to save settings");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error saving";
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem("admin_auth_token");
    setIsAuthenticated(false);
    setPassword("");
    toast.info("Logged out of admin panel");
  };

  // 1. Password Protection Modal
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#080C14] flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl border border-border/80 bg-card/90 p-8 shadow-2xl backdrop-blur-2xl">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 mb-6">
            <Lock className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold text-foreground">
            Enterprise Control Center
          </h1>
          <p className="mt-1.5 text-xs text-muted-foreground">
            Enter your admin passcode to access the enterprise management grid,
            monetization fees, and system telemetry.
          </p>

          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Admin Passcode
              </label>
              <Input
                type="password"
                placeholder="Enter passcode (default: admin123)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
              />
              {authError && (
                <p className="text-[11px] text-destructive">{authError}</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              variant="amber"
              className="w-full font-bold"
            >
              {isLoading ? "Verifying Access..." : "Unlock Enterprise Grid"}
            </Button>
          </form>

          <div className="mt-6 pt-4 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
            <Link
              href="/"
              className="hover:text-foreground inline-flex items-center gap-1"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to Studio
            </Link>
            <span className="text-[10px]">Configured via .env</span>
          </div>
        </div>
      </div>
    );
  }

  // 2. Full Enterprise Sidebar Layout
  return (
    <div className="min-h-screen bg-[#080C14] text-foreground flex flex-col md:flex-row">
      {/* LEFT SIDEBAR (260px) */}
      <aside className="w-full md:w-64 border-r border-border/80 bg-card/60 backdrop-blur-xl flex flex-col shrink-0">
        {/* Brand Header */}
        <div className="h-16 border-b border-border/80 px-5 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setActiveSection("overview")}
            className="flex items-center gap-2.5 text-left hover:opacity-90 transition-opacity"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold text-xs">
              STS
            </div>
            <div>
              <span className="text-xs font-bold tracking-tight text-foreground block">
                Solana Studio
              </span>
              <span className="text-[10px] text-muted-foreground block -mt-0.5">
                Enterprise Admin
              </span>
            </div>
          </button>
          <Badge variant="success" className="text-[9px] py-0 px-1.5">
            Online
          </Badge>
        </div>

        {/* Sidebar Nav Items */}
        <div className="flex-1 py-4 px-3 space-y-6 overflow-y-auto">
          {/* Group 1: Operations */}
          <div className="space-y-1">
            <span className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-wider px-2 block">
              Operations
            </span>
            <button
              onClick={() => setActiveSection("overview")}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeSection === "overview"
                  ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
              }`}
            >
              <LayoutDashboard className="h-4 w-4" />
              Overview & Analytics
            </button>
            <button
              onClick={() => setActiveSection("tokens")}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeSection === "tokens"
                  ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
              }`}
            >
              <FileText className="h-4 w-4" />
              Token Deployments
            </button>
          </div>

          {/* Group 2: Monetization & Architecture */}
          <div className="space-y-1">
            <span className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-wider px-2 block">
              Financials & Nodes
            </span>
            <button
              onClick={() => setActiveSection("monetization")}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeSection === "monetization"
                  ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
              }`}
            >
              <Coins className="h-4 w-4" />
              Monetization & Fees
            </button>
            <button
              onClick={() => setActiveSection("infrastructure")}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeSection === "infrastructure"
                  ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
              }`}
            >
              <Server className="h-4 w-4" />
              RPC & Arweave Nodes
            </button>
          </div>

          {/* Group 3: Growth & Branding */}
          <div className="space-y-1">
            <span className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-wider px-2 block">
              Growth & Experience
            </span>
            <button
              onClick={() => setActiveSection("marketing")}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeSection === "marketing"
                  ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
              }`}
            >
              <Flame className="h-4 w-4" />
              Promos & Discounts
            </button>
            <button
              onClick={() => setActiveSection("partners")}
              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeSection === "partners"
                  ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Users className="h-4 w-4" />
                Partners & VIPs
              </div>
              {(partnersStore?.partners.filter((p) => p.status === "pending")
                .length || 0) +
                (partnersStore?.payouts.filter((p) => p.status === "pending")
                  .length || 0) >
                0 && (
                <span className="rounded-full bg-amber-500 px-1.5 py-0.2 text-[9px] font-bold text-slate-950">
                  {(partnersStore?.partners.filter(
                    (p) => p.status === "pending"
                  ).length || 0) +
                    (partnersStore?.payouts.filter(
                      (p) => p.status === "pending"
                    ).length || 0)}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveSection("general")}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeSection === "general"
                  ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
              }`}
            >
              <Globe className="h-4 w-4" />
              Branding & Channels
            </button>
            <button
              onClick={() => setActiveSection("diagnostics")}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeSection === "diagnostics"
                  ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
              }`}
            >
              <Layers className="h-4 w-4" />
              System Diagnostics
            </button>
          </div>
        </div>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-border/80 space-y-2">
          <Link
            href="/"
            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <ExternalLink className="h-3.5 w-3.5" /> Return to Studio
            </span>
            <ArrowLeft className="h-3 w-3 rotate-180" />
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            Lock & Sign Out
          </button>
        </div>
      </aside>

      {/* RIGHT MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Control Bar */}
        <header className="h-16 border-b border-border/80 bg-card/60 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <h1 className="text-sm font-bold text-foreground capitalize">
              {activeSection.replace(/_/g, " ")}
            </h1>
            <span className="text-xs text-muted-foreground">
              / Platform Settings
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={handleSave}
              disabled={isSaving}
              variant="amber"
              className="gap-2 text-xs font-bold shadow-md h-9 px-4"
            >
              <Save className="h-3.5 w-3.5" />
              {isSaving ? "Saving..." : "Save All Changes"}
            </Button>
          </div>
        </header>

        {/* Section View Router */}
        <main className="p-6 max-w-6xl space-y-6">
          {/* SECTION: OVERVIEW & ANALYTICS */}
          {activeSection === "overview" && (
            <div className="space-y-6">
              {/* 4 Bento KPI Cards */}
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="rounded-xl border border-border/80 bg-card/60 p-4 space-y-1">
                  <div className="flex items-center justify-between text-muted-foreground text-xs">
                    <span>Est. SOL Revenue</span>
                    <Coins className="h-4 w-4 text-amber-400" />
                  </div>
                  <p className="text-2xl font-bold font-mono text-foreground">
                    12.45 SOL
                  </p>
                  <p className="text-[10px] text-emerald-400 flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" /> +18.2% this week
                  </p>
                </div>

                <div className="rounded-xl border border-border/80 bg-card/60 p-4 space-y-1">
                  <div className="flex items-center justify-between text-muted-foreground text-xs">
                    <span>Tokens Deployed</span>
                    <Activity className="h-4 w-4 text-emerald-400" />
                  </div>
                  <p className="text-2xl font-bold font-mono text-foreground">
                    84 Mints
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    100% Non-custodial atomic
                  </p>
                </div>

                <div className="rounded-xl border border-border/80 bg-card/60 p-4 space-y-1">
                  <div className="flex items-center justify-between text-muted-foreground text-xs">
                    <span>Mainnet Base Fee</span>
                    <CreditCard className="h-4 w-4 text-amber-400" />
                  </div>
                  <p className="text-2xl font-bold font-mono text-foreground">
                    {settings.mainnetBaseFeeSol} SOL
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    All-inclusive absorbed rent
                  </p>
                </div>

                <div className="rounded-xl border border-border/80 bg-card/60 p-4 space-y-1">
                  <div className="flex items-center justify-between text-muted-foreground text-xs">
                    <span>Storage Engine</span>
                    <Radio className="h-4 w-4 text-purple-400" />
                  </div>
                  <p className="text-lg font-bold text-foreground">
                    4-Tier Resilient
                  </p>
                  <p className="text-[10px] text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Free Arweave Tier
                    Active
                  </p>
                </div>
              </div>

              {/* Quick Actions & Treasury Snapshot */}
              <div className="grid md:grid-cols-12 gap-6">
                <div className="md:col-span-7 rounded-xl border border-border/80 bg-card/60 p-5 space-y-3">
                  <h3 className="text-xs font-bold text-foreground">
                    Active Treasury Wallet
                  </h3>
                  <div className="p-3 rounded-lg bg-background/80 border border-border/60 flex items-center justify-between font-mono text-xs">
                    <span className="truncate">
                      {settings.treasuryWalletAddress}
                    </span>
                    <Badge
                      variant="warning"
                      className="text-[10px] ml-2 shrink-0"
                    >
                      Cold Payout
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    All mint creation profits, freeze revocations, and mint
                    authorities are deposited atomically here.
                  </p>
                </div>

                <div className="md:col-span-5 rounded-xl border border-amber-500/20 bg-amber-500/5 p-5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground">
                      Marketing Status
                    </span>
                    <Badge
                      variant={
                        settings.promoBannerActive ? "success" : "secondary"
                      }
                    >
                      {settings.promoBannerActive ? "Promo Live" : "Standard"}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {settings.promoBannerActive
                      ? settings.promoBannerText
                      : "No active discount banner. You can enable promotional campaigns in the Promos tab."}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* SECTION: MONETIZATION & FEES */}
          {activeSection === "monetization" && (
            <div className="grid gap-6 md:grid-cols-12 items-start">
              <div className="md:col-span-7 space-y-5">
                {/* Treasury Wallet Input */}
                <div className="rounded-xl border border-border/80 bg-card/60 p-5 space-y-3">
                  <div className="flex items-center gap-2 border-b border-border/60 pb-3">
                    <Wallet className="h-4 w-4 text-amber-400" />
                    <h2 className="text-sm font-bold text-foreground">
                      Treasury Payout Address
                    </h2>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground">
                      Solana Treasury Public Key (Where all fees are deposited
                      directly)
                    </label>
                    <Input
                      value={settings.treasuryWalletAddress}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          treasuryWalletAddress: e.target.value.trim(),
                        })
                      }
                      placeholder="Enter base58 Solana address..."
                      className="font-mono text-xs"
                    />
                  </div>
                </div>

                {/* Base Fees */}
                <div className="rounded-xl border border-border/80 bg-card/60 p-5 space-y-4">
                  <div className="flex items-center gap-2 border-b border-border/60 pb-3">
                    <Coins className="h-4 w-4 text-amber-400" />
                    <h2 className="text-sm font-bold text-foreground">
                      Token Creation Pricing
                    </h2>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground">
                        Mainnet Base Fee (SOL)
                      </label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={settings.mainnetBaseFeeSol}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            mainnetBaseFeeSol: parseFloat(e.target.value) || 0,
                          })
                        }
                      />
                      <span className="text-[10px] text-muted-foreground">
                        Industry standard: 0.10 - 0.25 SOL
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground">
                        Devnet Base Fee (SOL)
                      </label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={settings.devnetBaseFeeSol}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            devnetBaseFeeSol: parseFloat(e.target.value) || 0,
                          })
                        }
                      />
                      <span className="text-[10px] text-muted-foreground">
                        Collected directly to treasury wallet on Devnet
                      </span>
                    </div>
                  </div>

                  {/* Addon Fees */}
                  <div className="pt-2 border-t border-border/60 space-y-3">
                    <h3 className="text-xs font-bold text-foreground">
                      Optional Authority Add-On Fees
                    </h3>
                    <div className="grid sm:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <label className="text-[11px] text-muted-foreground">
                          Revoke Freeze
                        </label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={settings.revokeFreezeFeeSol}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              revokeFreezeFeeSol:
                                parseFloat(e.target.value) || 0,
                            })
                          }
                          className="text-xs font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] text-muted-foreground">
                          Revoke Mint
                        </label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={settings.revokeMintFeeSol}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              revokeMintFeeSol: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="text-xs font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] text-muted-foreground">
                          Revoke Update
                        </label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={settings.revokeUpdateFeeSol}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              revokeUpdateFeeSol:
                                parseFloat(e.target.value) || 0,
                            })
                          }
                          className="text-xs font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Post-Launch Token Utilities Suite Fees */}
                  <div className="pt-2 border-t border-border/60 space-y-3">
                    <h3 className="text-xs font-bold text-foreground">
                      Post-Launch Utility Suite Platform Fees (SOL)
                    </h3>
                    <p className="text-[11px] text-muted-foreground">
                      Fees collected when creators use standalone utilities on
                      existing tokens.
                    </p>
                    <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="space-y-1">
                        <label className="text-[11px] text-muted-foreground">
                          Standalone Revoke Fee
                        </label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={settings.revokeStandaloneFeeSol ?? 0.05}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              revokeStandaloneFeeSol:
                                parseFloat(e.target.value) || 0,
                            })
                          }
                          className="text-xs font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] text-muted-foreground">
                          Metadata Update Fee
                        </label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={settings.updateMetadataFeeSol ?? 0.05}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              updateMetadataFeeSol:
                                parseFloat(e.target.value) || 0,
                            })
                          }
                          className="text-xs font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] text-muted-foreground">
                          Token Burn Fee
                        </label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={settings.burnTokenFeeSol ?? 0.0}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              burnTokenFeeSol: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="text-xs font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] text-muted-foreground">
                          Airdrop Fee / Batch
                        </label>
                        <Input
                          type="number"
                          step="0.005"
                          min="0"
                          value={settings.airdropFeeSol ?? 0.01}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              airdropFeeSol: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="text-xs font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Pricing Strategy Selector (All-Inclusive vs Add Rent On Top) */}
                  <div className="pt-4 border-t border-border/60 space-y-3">
                    <div>
                      <h3 className="text-xs font-bold text-foreground">
                        Pricing & Solana Rent Strategy
                      </h3>
                      <p className="text-[11px] text-muted-foreground">
                        Choose how the mandatory ~0.009 SOL Solana account rent
                        is billed to creators.
                      </p>
                    </div>

                    <div className="grid gap-3">
                      {/* Strategy A: All-Inclusive Flat Rate */}
                      <button
                        type="button"
                        onClick={() =>
                          setSettings({ ...settings, absorbNetworkRent: true })
                        }
                        className={`text-left w-full cursor-pointer rounded-xl border p-4 transition-all relative ${
                          settings.absorbNetworkRent
                            ? "border-emerald-500/50 bg-emerald-500/10 shadow-sm"
                            : "border-border/70 bg-background/50 hover:border-border hover:bg-background/80"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-foreground">
                                Strategy A: All-Inclusive Flat Fee
                              </span>
                              <Badge
                                variant="success"
                                className="text-[10px] py-0 px-1.5 font-bold"
                              >
                                Recommended for Trust
                              </Badge>
                            </div>
                            <p className="text-[11px] text-muted-foreground leading-relaxed">
                              Phantom prompts for the{" "}
                              <strong>exact advertised flat fee</strong> (e.g.{" "}
                              {settings.mainnetBaseFeeSol.toFixed(3)} SOL). The
                              platform absorbs the ~0.009 SOL rent from the fee
                              so creators experience zero hidden decimal
                              surprises.
                            </p>
                          </div>
                          <div
                            className={`h-4 w-4 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                              settings.absorbNetworkRent
                                ? "border-emerald-400 bg-emerald-500"
                                : "border-border"
                            }`}
                          >
                            {settings.absorbNetworkRent && (
                              <div className="h-1.5 w-1.5 rounded-full bg-slate-950" />
                            )}
                          </div>
                        </div>

                        {/* Math Breakdown Pill */}
                        <div className="mt-3 pt-2.5 border-t border-border/50 grid grid-cols-3 gap-2 text-[10px] font-mono">
                          <div className="bg-background/70 rounded-md p-1.5 border border-border/40">
                            <span className="text-muted-foreground block text-[9px] font-sans">
                              User Pays:
                            </span>
                            <span className="font-bold text-foreground">
                              {settings.mainnetBaseFeeSol.toFixed(3)} SOL
                            </span>
                          </div>
                          <div className="bg-background/70 rounded-md p-1.5 border border-border/40">
                            <span className="text-muted-foreground block text-[9px] font-sans">
                              Your Net Profit:
                            </span>
                            <span className="font-bold text-emerald-400">
                              {Math.max(
                                0,
                                settings.mainnetBaseFeeSol - 0.009
                              ).toFixed(3)}{" "}
                              SOL
                            </span>
                          </div>
                          <div className="bg-background/70 rounded-md p-1.5 border border-border/40">
                            <span className="text-muted-foreground block text-[9px] font-sans">
                              Solana Rent:
                            </span>
                            <span className="text-muted-foreground">
                              ~0.009 SOL
                            </span>
                          </div>
                        </div>
                      </button>

                      {/* Strategy B: Add Rent On Top */}
                      <button
                        type="button"
                        onClick={() =>
                          setSettings({ ...settings, absorbNetworkRent: false })
                        }
                        className={`text-left w-full cursor-pointer rounded-xl border p-4 transition-all relative ${
                          !settings.absorbNetworkRent
                            ? "border-amber-500/50 bg-amber-500/10 shadow-sm"
                            : "border-border/70 bg-background/50 hover:border-border hover:bg-background/80"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-foreground">
                                Strategy B: Add Network Rent On Top
                              </span>
                              <Badge
                                variant="warning"
                                className="text-[10px] py-0 px-1.5 font-bold"
                              >
                                Maximum Margin
                              </Badge>
                            </div>
                            <p className="text-[11px] text-muted-foreground leading-relaxed">
                              Creators pay your full fee plus the mandatory
                              ~0.009 SOL Solana account rent separately. Phantom
                              wallet prompts for ~
                              {(settings.mainnetBaseFeeSol + 0.009).toFixed(3)}{" "}
                              SOL.
                            </p>
                          </div>
                          <div
                            className={`h-4 w-4 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                              !settings.absorbNetworkRent
                                ? "border-amber-400 bg-amber-500"
                                : "border-border"
                            }`}
                          >
                            {!settings.absorbNetworkRent && (
                              <div className="h-1.5 w-1.5 rounded-full bg-slate-950" />
                            )}
                          </div>
                        </div>

                        {/* Math Breakdown Pill */}
                        <div className="mt-3 pt-2.5 border-t border-border/50 grid grid-cols-3 gap-2 text-[10px] font-mono">
                          <div className="bg-background/70 rounded-md p-1.5 border border-border/40">
                            <span className="text-muted-foreground block text-[9px] font-sans">
                              User Pays:
                            </span>
                            <span className="font-bold text-foreground">
                              {(settings.mainnetBaseFeeSol + 0.009).toFixed(3)}{" "}
                              SOL
                            </span>
                          </div>
                          <div className="bg-background/70 rounded-md p-1.5 border border-border/40">
                            <span className="text-muted-foreground block text-[9px] font-sans">
                              Your Net Profit:
                            </span>
                            <span className="font-bold text-amber-400">
                              {settings.mainnetBaseFeeSol.toFixed(3)} SOL
                            </span>
                          </div>
                          <div className="bg-background/70 rounded-md p-1.5 border border-border/40">
                            <span className="text-muted-foreground block text-[9px] font-sans">
                              Solana Rent:
                            </span>
                            <span className="text-muted-foreground">
                              +0.009 SOL
                            </span>
                          </div>
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Live Preview Simulator */}
              <div className="md:col-span-5 space-y-4">
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-5 space-y-3">
                  <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
                    <span className="text-xs font-bold text-foreground">
                      Creator Pricing Simulation
                    </span>
                    <Badge variant="warning" className="text-[10px]">
                      Live Sync
                    </Badge>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span>Base Creation:</span>
                      <span className="font-mono text-foreground font-semibold">
                        {settings.mainnetBaseFeeSol.toFixed(3)} SOL
                      </span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Revoke Freeze Authority:</span>
                      <span className="font-mono text-foreground">
                        +{settings.revokeFreezeFeeSol.toFixed(3)} SOL
                      </span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Revoke Mint Authority:</span>
                      <span className="font-mono text-foreground">
                        +{settings.revokeMintFeeSol.toFixed(3)} SOL
                      </span>
                    </div>
                    <div className="flex justify-between font-bold text-foreground pt-2 border-t border-border/60">
                      <span>Total Phantom Prompt:</span>
                      <span className="font-mono text-amber-400 text-sm font-bold">
                        {(
                          settings.mainnetBaseFeeSol +
                          settings.revokeFreezeFeeSol +
                          settings.revokeMintFeeSol +
                          (!settings.absorbNetworkRent ? 0.009 : 0)
                        ).toFixed(3)}{" "}
                        SOL
                      </span>
                    </div>
                  </div>
                  <div
                    className={`mt-4 rounded-lg border p-2.5 text-[11px] flex items-center gap-2 ${
                      settings.absorbNetworkRent
                        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                        : "bg-amber-500/10 border-amber-500/20 text-amber-400"
                    }`}
                  >
                    <ShieldCheck className="h-4 w-4 shrink-0" />
                    <span>
                      {settings.absorbNetworkRent
                        ? "All-Inclusive Mode: Phantom prompt matches exact advertised flat price."
                        : "Rent-On-Top Mode: Phantom prompt includes 0.009 SOL network rent added to total."}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECTION: RPC & INFRASTRUCTURE */}
          {activeSection === "infrastructure" && (
            <div className="rounded-xl border border-border/80 bg-card/60 p-6 space-y-5 max-w-3xl">
              <div>
                <h2 className="text-sm font-bold text-foreground">
                  RPC & Decentralized Storage Nodes
                </h2>
                <p className="text-xs text-muted-foreground">
                  Connect dedicated endpoints (Helius, QuickNode, Triton) to
                  eliminate RPC rate limits.
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Mainnet RPC URL
                  </label>
                  <Input
                    value={settings.mainnetRpcUrl}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        mainnetRpcUrl: e.target.value.trim(),
                      })
                    }
                    placeholder="https://mainnet.helius-rpc.com/?api-key=..."
                    className="font-mono text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Devnet RPC URL
                  </label>
                  <Input
                    value={settings.devnetRpcUrl}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        devnetRpcUrl: e.target.value.trim(),
                      })
                    }
                    placeholder="https://api.devnet.solana.com"
                    className="font-mono text-xs"
                  />
                </div>

                <div className="pt-3 border-t border-border/60 space-y-2">
                  <label className="text-xs font-semibold text-foreground">
                    Irys Storage Target Network
                  </label>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        setSettings({ ...settings, irysNetwork: "devnet" })
                      }
                      className={`px-4 py-2 rounded-lg text-xs font-semibold border ${
                        settings.irysNetwork === "devnet"
                          ? "bg-amber-500/20 border-amber-500/40 text-amber-400"
                          : "border-border text-muted-foreground"
                      }`}
                    >
                      Irys Devnet (Free Sandbox)
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setSettings({ ...settings, irysNetwork: "mainnet" })
                      }
                      className={`px-4 py-2 rounded-lg text-xs font-semibold border ${
                        settings.irysNetwork === "mainnet"
                          ? "bg-amber-500/20 border-amber-500/40 text-amber-400"
                          : "border-border text-muted-foreground"
                      }`}
                    >
                      Irys Mainnet (Permanent Arweave)
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECTION: MARKETING & GROWTH */}
          {activeSection === "marketing" && (
            <div className="space-y-6 max-w-3xl">
              <div className="rounded-xl border border-border/80 bg-card/60 p-6 space-y-5">
                <div className="flex items-center gap-2 border-b border-border/60 pb-3">
                  <Flame className="h-4 w-4 text-amber-400" />
                  <h2 className="text-sm font-bold text-foreground">
                    Promotional Banner & Discounts
                  </h2>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-foreground">
                      Top Announcement Banner
                    </span>
                    <p className="text-[11px] text-muted-foreground">
                      Display an eye-catching campaign banner at the top of the
                      creator studio
                    </p>
                  </div>
                  <Switch
                    checked={settings.promoBannerActive}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, promoBannerActive: checked })
                    }
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Banner Copy / Text
                  </label>
                  <Input
                    value={settings.promoBannerText}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        promoBannerText: e.target.value,
                      })
                    }
                    placeholder="e.g. 🚀 Launch Week: 25% Off All Token Deployments!"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                    <span>Universal Discount Percentage (%)</span>
                    <span className="font-mono text-amber-400 font-bold">
                      {settings.promoDiscountPercent}%
                    </span>
                  </label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={settings.promoDiscountPercent}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        promoDiscountPercent: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
              </div>

              {/* Affiliate & Referrals */}
              <div className="rounded-xl border border-border/80 bg-card/60 p-6 space-y-4">
                <div className="flex items-center gap-2 border-b border-border/60 pb-3">
                  <Percent className="h-4 w-4 text-emerald-400" />
                  <h2 className="text-sm font-bold text-foreground">
                    Affiliate & Referral Engine
                  </h2>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-foreground">
                      Enable Referral Sharing
                    </span>
                    <p className="text-[11px] text-muted-foreground">
                      Reward creators and influencers who refer new token
                      creators to your launchpad
                    </p>
                  </div>
                  <Switch
                    checked={settings.referralProgramActive}
                    onCheckedChange={(checked) =>
                      setSettings({
                        ...settings,
                        referralProgramActive: checked,
                      })
                    }
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Affiliate Commission Split (%)
                  </label>
                  <Input
                    type="number"
                    min="1"
                    max="50"
                    value={settings.referralFeeSharePercent}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        referralFeeSharePercent: parseInt(e.target.value) || 20,
                      })
                    }
                  />
                  <span className="text-[10px] text-muted-foreground">
                    Percentage of base fee routed to referrer
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* SECTION: PARTNERS & AFFILIATES */}
          {activeSection === "partners" && (
            <div className="space-y-6 max-w-5xl">
              {/* Partner Overview & KPI Header */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-xl border border-border/80 bg-card/60 p-4 space-y-1">
                  <span className="text-[11px] font-medium text-muted-foreground">
                    Active VIP Partners
                  </span>
                  <div className="flex items-center justify-between">
                    <span className="text-xl font-bold font-mono text-foreground">
                      {partnersStore?.partners.filter(
                        (p) => p.status === "approved"
                      ).length || 0}
                    </span>
                    <Users className="h-4 w-4 text-amber-400" />
                  </div>
                </div>

                <div className="rounded-xl border border-border/80 bg-card/60 p-4 space-y-1">
                  <span className="text-[11px] font-medium text-muted-foreground">
                    Total Volume Driven
                  </span>
                  <div className="flex items-center justify-between">
                    <span className="text-xl font-bold font-mono text-emerald-400">
                      {(
                        partnersStore?.partners
                          .filter((p) => p.status === "approved")
                          .reduce((s, p) => s + (p.totalVolumeSol || 0), 0) || 0
                      ).toFixed(2)}{" "}
                      <span className="text-xs">SOL</span>
                    </span>
                    <TrendingUp className="h-4 w-4 text-emerald-400" />
                  </div>
                </div>

                <div className="rounded-xl border border-border/80 bg-card/60 p-4 space-y-1">
                  <span className="text-[11px] font-medium text-muted-foreground">
                    Unclaimed Commissions
                  </span>
                  <div className="flex items-center justify-between">
                    <span className="text-xl font-bold font-mono text-amber-400">
                      {(
                        partnersStore?.partners
                          .filter((p) => p.status === "approved")
                          .reduce(
                            (s, p) => s + (p.unclaimedBalanceSol || 0),
                            0
                          ) || 0
                      ).toFixed(2)}{" "}
                      <span className="text-xs">SOL</span>
                    </span>
                    <Coins className="h-4 w-4 text-amber-400" />
                  </div>
                </div>

                <div className="rounded-xl border border-border/80 bg-card/60 p-4 space-y-1">
                  <span className="text-[11px] font-medium text-muted-foreground">
                    Pending Claims
                  </span>
                  <div className="flex items-center justify-between">
                    <span className="text-xl font-bold font-mono text-sky-400">
                      {partnersStore?.payouts.filter(
                        (p) => p.status === "pending"
                      ).length || 0}
                    </span>
                    <CreditCard className="h-4 w-4 text-sky-400" />
                  </div>
                </div>
              </div>

              {/* Sub-Tabs Navigation */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/80 pb-3">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setActivePartnersTab("pending")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      activePartnersTab === "pending"
                        ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
                    }`}
                  >
                    <span>Applications</span>
                    {(partnersStore?.partners.filter(
                      (p) => p.status === "pending"
                    ).length || 0) > 0 && (
                      <span className="rounded-full bg-amber-500 px-1.5 py-0.2 text-[9px] font-bold text-slate-950">
                        {
                          partnersStore?.partners.filter(
                            (p) => p.status === "pending"
                          ).length
                        }
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => setActivePartnersTab("approved")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      activePartnersTab === "approved"
                        ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
                    }`}
                  >
                    <span>Active Partners</span>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      (
                      {partnersStore?.partners.filter(
                        (p) => p.status === "approved"
                      ).length || 0}
                      )
                    </span>
                  </button>

                  <button
                    onClick={() => setActivePartnersTab("payouts")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      activePartnersTab === "payouts"
                        ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
                    }`}
                  >
                    <span>Payout Claims</span>
                    {(partnersStore?.payouts.filter(
                      (p) => p.status === "pending"
                    ).length || 0) > 0 && (
                      <span className="rounded-full bg-sky-500 px-1.5 py-0.2 text-[9px] font-bold text-slate-950">
                        {
                          partnersStore?.payouts.filter(
                            (p) => p.status === "pending"
                          ).length
                        }
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => setActivePartnersTab("conversions")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      activePartnersTab === "conversions"
                        ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
                    }`}
                  >
                    <span>Conversions Ledger</span>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      ({partnersStore?.conversions.length || 0})
                    </span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href="/partners"
                    target="_blank"
                    className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground px-2.5 py-1 rounded-md border border-border/60 hover:bg-secondary/40 transition-colors"
                  >
                    Public Apply Page <ExternalLink className="h-3 w-3" />
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isPartnersLoading}
                    onClick={() => fetchPartnersStore()}
                    className="gap-1.5 text-xs h-7"
                  >
                    <RefreshCw
                      className={`h-3 w-3 ${
                        isPartnersLoading ? "animate-spin" : ""
                      }`}
                    />
                    Refresh
                  </Button>
                </div>
              </div>

              {/* Sub-Tab 1: Pending Applications */}
              {activePartnersTab === "pending" && (
                <div className="space-y-4">
                  {partnersStore?.partners.filter((p) => p.status === "pending")
                    .length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border/80 bg-card/30 p-8 text-center space-y-2">
                      <UserCheck className="h-8 w-8 text-muted-foreground/60 mx-auto" />
                      <h3 className="text-xs font-semibold text-foreground">
                        No Pending Partner Applications
                      </h3>
                      <p className="text-[11px] text-muted-foreground max-w-sm mx-auto">
                        When creators or influencers submit applications via the
                        public Partner Program page, they will appear here for
                        custom rate review and 1-click approval.
                      </p>
                    </div>
                  ) : (
                    partnersStore?.partners
                      .filter((p) => p.status === "pending")
                      .map((partner) => (
                        <div
                          key={partner.id}
                          className="rounded-xl border border-border/80 bg-card/60 p-5 space-y-4 shadow-sm"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="text-sm font-bold text-foreground">
                                  {partner.name}
                                </h3>
                                <Badge
                                  variant="warning"
                                  className="text-[9px] py-0"
                                >
                                  Pending Review
                                </Badge>
                              </div>
                              <span className="text-[11px] text-muted-foreground">
                                Applied:{" "}
                                {new Date(
                                  partner.createdAt
                                ).toLocaleDateString()}{" "}
                                &bull; Contact: {partner.contactHandle}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 font-mono text-xs">
                              <span className="text-muted-foreground">
                                Desired Slug:
                              </span>
                              <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded font-semibold">
                                ?partner={partner.slug}
                              </span>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                            <div className="rounded-lg border border-border/50 bg-background/50 p-2.5 space-y-0.5">
                              <span className="text-[10px] text-muted-foreground block">
                                Platform / Channel
                              </span>
                              <a
                                href={partner.platformUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-amber-400 hover:underline inline-flex items-center gap-1 font-medium truncate max-w-full"
                              >
                                {partner.platformUrl}{" "}
                                <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                              </a>
                            </div>

                            <div className="rounded-lg border border-border/50 bg-background/50 p-2.5 space-y-0.5">
                              <span className="text-[10px] text-muted-foreground block">
                                Audience Reach
                              </span>
                              <span className="font-semibold text-foreground">
                                {partner.audienceSize} followers/subscribers
                              </span>
                            </div>

                            <div className="rounded-lg border border-border/50 bg-background/50 p-2.5 space-y-0.5">
                              <span className="text-[10px] text-muted-foreground block">
                                Solana Payout Wallet
                              </span>
                              <div className="flex items-center justify-between gap-1">
                                <span className="font-mono text-muted-foreground truncate text-[11px]">
                                  {partner.payoutWallet.slice(0, 6)}...
                                  {partner.payoutWallet.slice(-6)}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(
                                      partner.payoutWallet
                                    );
                                    toast.success("Wallet address copied!");
                                  }}
                                  className="text-muted-foreground hover:text-foreground p-0.5"
                                  title="Copy address"
                                >
                                  <Copy className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Approval Override Inputs */}
                          <div className="rounded-lg border border-border/60 bg-secondary/30 p-3.5 space-y-3">
                            <div className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
                              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                              Negotiated Terms for {partner.name}:
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <label className="text-[10px] font-medium text-muted-foreground flex justify-between">
                                  <span>Partner Commission Share (%)</span>
                                  <span className="text-amber-400 font-mono">
                                    Default:{" "}
                                    {settings.referralFeeSharePercent || 20}%
                                  </span>
                                </label>
                                <Input
                                  type="number"
                                  min="1"
                                  max="90"
                                  placeholder={`e.g. ${
                                    settings.referralFeeSharePercent || 20
                                  }`}
                                  value={
                                    partnerRates[partner.id]?.commission ?? ""
                                  }
                                  onChange={(e) =>
                                    setPartnerRates((prev) => ({
                                      ...prev,
                                      [partner.id]: {
                                        commission: e.target.value,
                                        discount:
                                          prev[partner.id]?.discount ?? "",
                                      },
                                    }))
                                  }
                                  className="h-8 text-xs font-mono"
                                />
                              </div>

                              <div className="space-y-1">
                                <label className="text-[10px] font-medium text-muted-foreground flex justify-between">
                                  <span>Audience Discount (%)</span>
                                  <span className="text-emerald-400 font-mono">
                                    Special Promo
                                  </span>
                                </label>
                                <Input
                                  type="number"
                                  min="0"
                                  max="50"
                                  placeholder="e.g. 10 (gives their users 10% off)"
                                  value={
                                    partnerRates[partner.id]?.discount ?? ""
                                  }
                                  onChange={(e) =>
                                    setPartnerRates((prev) => ({
                                      ...prev,
                                      [partner.id]: {
                                        commission:
                                          prev[partner.id]?.commission ?? "",
                                        discount: e.target.value,
                                      },
                                    }))
                                  }
                                  className="h-8 text-xs font-mono"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center justify-end gap-2 pt-1">
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={processingPartnerId === partner.id}
                              onClick={() => handleRejectPartner(partner.id)}
                              className="text-xs text-destructive hover:bg-destructive/10 h-8 gap-1"
                            >
                              <X className="h-3 w-3" />
                              Reject
                            </Button>
                            <Button
                              variant="amber"
                              size="sm"
                              disabled={processingPartnerId === partner.id}
                              onClick={() => handleApprovePartner(partner.id)}
                              className="text-xs font-bold h-8 gap-1"
                            >
                              <Check className="h-3.5 w-3.5" />
                              {processingPartnerId === partner.id
                                ? "Approving..."
                                : "Approve & Activate Partner"}
                            </Button>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              )}

              {/* Sub-Tab 2: Active & Approved Partners */}
              {activePartnersTab === "approved" && (
                <div className="space-y-4">
                  {partnersStore?.partners.filter(
                    (p) => p.status === "approved"
                  ).length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border/80 bg-card/30 p-8 text-center space-y-2">
                      <Users className="h-8 w-8 text-muted-foreground/60 mx-auto" />
                      <h3 className="text-xs font-semibold text-foreground">
                        No Active Partners Yet
                      </h3>
                      <p className="text-[11px] text-muted-foreground max-w-sm mx-auto">
                        Once you approve incoming partner applications, their
                        live performance analytics, custom rates, and payout
                        balances will appear here.
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-border/80 bg-card/60 overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left">
                          <thead>
                            <tr className="border-b border-border/60 text-muted-foreground text-[10px] uppercase tracking-wider bg-background/50">
                              <th className="py-2.5 px-3">Partner & Slug</th>
                              <th className="py-2.5 px-3">Rates</th>
                              <th className="py-2.5 px-3">Traffic & Joins</th>
                              <th className="py-2.5 px-3">Conversions</th>
                              <th className="py-2.5 px-3">Volume Driven</th>
                              <th className="py-2.5 px-3">Unclaimed SOL</th>
                              <th className="py-2.5 px-3 text-right">
                                Public Link
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/40 font-mono text-[11px]">
                            {partnersStore?.partners
                              .filter((p) => p.status === "approved")
                              .map((p) => (
                                <tr
                                  key={p.id}
                                  className="hover:bg-secondary/30 transition-colors"
                                >
                                  <td className="py-3 px-3 font-sans">
                                    <div className="font-bold text-foreground">
                                      {p.name}
                                    </div>
                                    <div className="text-[10px] text-muted-foreground font-mono">
                                      ?partner={p.slug}
                                    </div>
                                  </td>
                                  <td className="py-3 px-3">
                                    <div className="text-amber-400 font-bold">
                                      {p.customCommissionPercent ??
                                        settings.referralFeeSharePercent ??
                                        20}
                                      % commission
                                    </div>
                                    <div className="text-[10px] text-emerald-400">
                                      {p.audienceDiscountPercent
                                        ? `${p.audienceDiscountPercent}% user discount`
                                        : "0% user discount"}
                                    </div>
                                  </td>
                                  <td className="py-3 px-3">
                                    <span className="text-foreground font-semibold">
                                      {p.clicks}
                                    </span>{" "}
                                    clicks &bull;{" "}
                                    <span className="text-sky-400">
                                      {p.walletsConnected}
                                    </span>{" "}
                                    wallets
                                  </td>
                                  <td className="py-3 px-3 text-emerald-400 font-bold">
                                    {p.conversionsCount} sales
                                  </td>
                                  <td className="py-3 px-3 font-semibold text-foreground">
                                    {p.totalVolumeSol.toFixed(3)} SOL
                                  </td>
                                  <td className="py-3 px-3 font-bold text-amber-400">
                                    {p.unclaimedBalanceSol.toFixed(3)} SOL
                                  </td>
                                  <td className="py-3 px-3 text-right font-sans">
                                    <a
                                      href={`/?partner=${p.slug}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-amber-400 hover:underline inline-flex items-center gap-1 text-xs"
                                    >
                                      Test Link{" "}
                                      <ExternalLink className="h-3 w-3" />
                                    </a>
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Sub-Tab 3: Payout Claims */}
              {activePartnersTab === "payouts" && (
                <div className="space-y-4">
                  {partnersStore?.payouts.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border/80 bg-card/30 p-8 text-center space-y-2">
                      <CreditCard className="h-8 w-8 text-muted-foreground/60 mx-auto" />
                      <h3 className="text-xs font-semibold text-foreground">
                        No Withdrawal Requests
                      </h3>
                      <p className="text-[11px] text-muted-foreground max-w-sm mx-auto">
                        When partners request withdrawal from their private
                        dashboard (minimum 0.05 SOL), payout records will appear
                        here for transfer and confirmation.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {partnersStore?.payouts.map((payout) => (
                        <div
                          key={payout.id}
                          className="rounded-xl border border-border/80 bg-card/60 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-foreground">
                                {payout.partnerSlug}
                              </span>
                              <Badge
                                variant={
                                  payout.status === "completed"
                                    ? "success"
                                    : "warning"
                                }
                                className="text-[9px]"
                              >
                                {payout.status.toUpperCase()}
                              </Badge>
                              <span className="font-mono text-xs font-bold text-amber-400">
                                {payout.amountSol.toFixed(3)} SOL
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                              <span>
                                Requested:{" "}
                                {new Date(payout.requestedAt).toLocaleString()}
                              </span>
                              <span>&bull;</span>
                              <span className="font-mono">
                                Wallet: {payout.payoutWallet.slice(0, 8)}...
                                {payout.payoutWallet.slice(-8)}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(
                                    payout.payoutWallet
                                  );
                                  toast.success("Wallet address copied!");
                                }}
                                className="text-muted-foreground hover:text-foreground"
                                title="Copy full address"
                              >
                                <Copy className="h-3 w-3" />
                              </button>
                            </div>
                          </div>

                          {payout.status === "pending" ? (
                            <div className="flex items-center gap-2">
                              <Input
                                placeholder="Solana Tx Signature (optional)"
                                value={payoutTxInputs[payout.id] || ""}
                                onChange={(e) =>
                                  setPayoutTxInputs((prev) => ({
                                    ...prev,
                                    [payout.id]: e.target.value,
                                  }))
                                }
                                className="h-8 text-xs font-mono w-48"
                              />
                              <Button
                                variant="amber"
                                size="sm"
                                disabled={processingPartnerId === payout.id}
                                onClick={() => handleCompletePayout(payout.id)}
                                className="text-xs font-bold h-8 shrink-0"
                              >
                                {processingPartnerId === payout.id
                                  ? "Saving..."
                                  : "Mark Paid"}
                              </Button>
                            </div>
                          ) : (
                            <div className="text-right text-[11px] text-muted-foreground font-mono">
                              <span className="text-emerald-400 block font-semibold">
                                ✓ Paid on{" "}
                                {payout.processedAt
                                  ? new Date(
                                      payout.processedAt
                                    ).toLocaleDateString()
                                  : "Confirmed"}
                              </span>
                              {payout.txSignature && (
                                <span className="text-[10px] text-muted-foreground/70 truncate block max-w-xs">
                                  Tx: {payout.txSignature}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Sub-Tab 4: Conversions Ledger */}
              {activePartnersTab === "conversions" && (
                <div className="space-y-4">
                  {partnersStore?.conversions.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border/80 bg-card/30 p-8 text-center space-y-2">
                      <FileText className="h-8 w-8 text-muted-foreground/60 mx-auto" />
                      <h3 className="text-xs font-semibold text-foreground">
                        No Conversions Recorded Yet
                      </h3>
                      <p className="text-[11px] text-muted-foreground max-w-sm mx-auto">
                        When users launch tokens or utilize post-launch
                        utilities using a partner link, transactions will be
                        logged here in real-time.
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-border/80 bg-card/60 overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left">
                          <thead>
                            <tr className="border-b border-border/60 text-muted-foreground text-[10px] uppercase tracking-wider bg-background/50">
                              <th className="py-2.5 px-3">Timestamp</th>
                              <th className="py-2.5 px-3">Partner Slug</th>
                              <th className="py-2.5 px-3">Action Type</th>
                              <th className="py-2.5 px-3">Customer Wallet</th>
                              <th className="py-2.5 px-3">Fee Paid</th>
                              <th className="py-2.5 px-3">
                                Partner Commission
                              </th>
                              <th className="py-2.5 px-3 text-right">
                                Tx Signature
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/40 font-mono text-[11px]">
                            {partnersStore?.conversions
                              .slice()
                              .reverse()
                              .map((c) => (
                                <tr
                                  key={c.id}
                                  className="hover:bg-secondary/30 transition-colors"
                                >
                                  <td className="py-2.5 px-3 text-muted-foreground">
                                    {new Date(c.timestamp).toLocaleString()}
                                  </td>
                                  <td className="py-2.5 px-3 text-amber-400 font-bold">
                                    {c.partnerSlug}
                                  </td>
                                  <td className="py-2.5 px-3 font-sans capitalize text-foreground">
                                    {c.type.replace(/_/g, " ")}
                                  </td>
                                  <td className="py-2.5 px-3 text-muted-foreground">
                                    {c.userWallet.slice(0, 4)}...
                                    {c.userWallet.slice(-4)}
                                  </td>
                                  <td className="py-2.5 px-3 text-foreground font-semibold">
                                    {c.totalFeeSol.toFixed(3)} SOL
                                  </td>
                                  <td className="py-2.5 px-3 text-emerald-400 font-bold">
                                    +{c.commissionSol.toFixed(3)} SOL (
                                    {c.commissionPercent}%)
                                  </td>
                                  <td className="py-2.5 px-3 text-right">
                                    {c.txSignature ? (
                                      <span className="text-[10px] text-muted-foreground truncate">
                                        {c.txSignature.slice(0, 8)}...
                                      </span>
                                    ) : (
                                      <span className="text-muted-foreground/60">
                                        &mdash;
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* SECTION: GENERAL & BRANDING */}
          {activeSection === "general" && (
            <div className="rounded-xl border border-border/80 bg-card/60 p-6 space-y-5 max-w-3xl">
              <div>
                <h2 className="text-sm font-bold text-foreground">
                  Brand Identity & Social Channels
                </h2>
                <p className="text-xs text-muted-foreground">
                  Customize the platform title, taglines, and support community
                  links.
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Platform Brand Title
                  </label>
                  <Input
                    value={settings.platformTitle}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        platformTitle: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Subtitle / Tagline
                  </label>
                  <Input
                    value={settings.platformTagline}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        platformTagline: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-border/60 space-y-3">
                <h3 className="text-xs font-bold text-foreground">
                  Official Community Support Channels
                </h3>
                <div className="space-y-2">
                  <Input
                    value={settings.supportTelegram}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        supportTelegram: e.target.value,
                      })
                    }
                    placeholder="Telegram link (https://t.me/...)"
                    className="text-xs"
                  />
                  <Input
                    value={settings.supportTwitter}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        supportTwitter: e.target.value,
                      })
                    }
                    placeholder="X / Twitter profile link (https://x.com/...)"
                    className="text-xs"
                  />
                  <Input
                    value={settings.supportDiscord}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        supportDiscord: e.target.value,
                      })
                    }
                    placeholder="Discord invite link"
                    className="text-xs"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-border/60 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-destructive">
                    Maintenance Mode
                  </span>
                  <p className="text-[11px] text-muted-foreground">
                    Temporarily disable new token creation transactions while
                    keeping dashboard active
                  </p>
                </div>
                <Switch
                  checked={settings.maintenanceMode}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, maintenanceMode: checked })
                  }
                />
              </div>
            </div>
          )}

          {/* SECTION: TOKEN DEPLOYMENTS */}
          {activeSection === "tokens" && (
            <div className="rounded-xl border border-border/80 bg-card/60 p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <div>
                  <h2 className="text-sm font-bold text-foreground">
                    Live Deployment Registry
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Historical record of tokens minted through this launchpad.
                  </p>
                </div>
                <Badge variant="warning">84 Verified Mints</Badge>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-border/60 text-muted-foreground text-[11px]">
                      <th className="py-2.5 px-3">Token Name</th>
                      <th className="py-2.5 px-3">Ticker</th>
                      <th className="py-2.5 px-3">Cluster</th>
                      <th className="py-2.5 px-3">Authorities</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Explorer</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40 font-mono text-[11px]">
                    <tr className="hover:bg-secondary/40">
                      <td className="py-3 px-3 font-bold text-foreground font-sans">
                        Velocity Coin
                      </td>
                      <td className="py-3 px-3 text-amber-400 font-bold">
                        $VELO
                      </td>
                      <td className="py-3 px-3 capitalize">Devnet</td>
                      <td className="py-3 px-3 text-emerald-400">
                        Freeze + Mint Revoked
                      </td>
                      <td className="py-3 px-3">
                        <Badge variant="success" className="text-[10px]">
                          Confirmed
                        </Badge>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <a
                          href="https://explorer.solana.com/?cluster=devnet"
                          target="_blank"
                          rel="noreferrer"
                          className="text-amber-400 hover:underline inline-flex items-center gap-1 font-sans text-xs"
                        >
                          View <ExternalLink className="h-3 w-3" />
                        </a>
                      </td>
                    </tr>
                    <tr className="hover:bg-secondary/40">
                      <td className="py-3 px-3 font-bold text-foreground font-sans">
                        Trust Coin
                      </td>
                      <td className="py-3 px-3 text-amber-400 font-bold">
                        $TRUST
                      </td>
                      <td className="py-3 px-3 capitalize">Mainnet</td>
                      <td className="py-3 px-3 text-emerald-400">
                        Immutable + Capped
                      </td>
                      <td className="py-3 px-3">
                        <Badge variant="success" className="text-[10px]">
                          Confirmed
                        </Badge>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <a
                          href="https://solscan.io"
                          target="_blank"
                          rel="noreferrer"
                          className="text-amber-400 hover:underline inline-flex items-center gap-1 font-sans text-xs"
                        >
                          View <ExternalLink className="h-3 w-3" />
                        </a>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SECTION: SYSTEM DIAGNOSTICS */}
          {activeSection === "diagnostics" && (
            <div className="rounded-xl border border-border/80 bg-card/60 p-6 space-y-5 max-w-3xl">
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <div>
                  <h2 className="text-sm font-bold text-foreground">
                    Storage & Cluster Telemetry
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Real-time status of active upload gateways and wallet
                    connections.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const token =
                      sessionStorage.getItem("admin_auth_token") || "";
                    loadSettings(token);
                    toast.success("Diagnostics refreshed");
                  }}
                  className="gap-1 text-xs"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Refresh
                </Button>
              </div>

              <div className="grid sm:grid-cols-2 gap-4 text-xs">
                <div className="rounded-lg border border-border/60 bg-background/60 p-3.5 space-y-1">
                  <span className="text-muted-foreground text-[11px]">
                    Platform Signing Address:
                  </span>
                  <p className="font-mono text-foreground font-semibold break-all">
                    {diagnostics?.platformAddress ||
                      "Ephemeral (Generated on-demand for free tier)"}
                  </p>
                </div>
                <div className="rounded-lg border border-border/60 bg-background/60 p-3.5 space-y-1">
                  <span className="text-muted-foreground text-[11px]">
                    Irys Node Balance:
                  </span>
                  <p className="font-mono text-emerald-400 font-bold text-sm">
                    {diagnostics?.irysBalance || "0.00 SOL (Free Tier Active)"}
                  </p>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <h3 className="text-xs font-bold text-foreground">
                  4-Tier Fallback Health
                </h3>
                <div className="space-y-1.5">
                  {diagnostics?.tiers &&
                    Object.entries(diagnostics.tiers).map(([tierKey, tier]) => (
                      <div
                        key={tierKey}
                        className="flex items-center justify-between p-2.5 rounded-lg border border-border/50 bg-background/40 text-xs"
                      >
                        <span className="font-medium text-foreground capitalize">
                          {tierKey.replace(/_/g, " ")}
                        </span>
                        <Badge
                          variant={
                            tier.status === "active" || tier.status === "ready"
                              ? "success"
                              : "secondary"
                          }
                          className="text-[10px]"
                        >
                          {tier.status}
                        </Badge>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
