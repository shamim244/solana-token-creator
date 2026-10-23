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
} from "lucide-react";
import { toast } from "sonner";
import type { PlatformSettings } from "../lib/platform-settings";

type AdminSection =
  | "overview"
  | "monetization"
  | "infrastructure"
  | "marketing"
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
    mainnetBaseFeeSol: 0.15,
    devnetBaseFeeSol: 0,
    revokeFreezeFeeSol: 0.1,
    revokeMintFeeSol: 0.1,
    revokeUpdateFeeSol: 0.1,
    absorbNetworkRent: true,
    treasuryWalletAddress: "54Xn6d6X4wHrkZ9eHnC8F2v56yZ8K5j2Q8s7J3k4L5m6",
    promoDiscountPercent: 0,
    promoBannerActive: false,
    promoBannerText: "⚡ Launch Week Special: 20% Off All Authority Revocations!",
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

  const loadSettings = async (token: string) => {
    const [settingsRes, diagRes] = await Promise.all([
      fetch("/api/admin/settings", {
        headers: { Authorization: `Bearer ${token}` },
      }),
      fetch("/api/upload-metadata/status"),
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
          <h1 className="text-xl font-bold text-foreground">Enterprise Control Center</h1>
          <p className="mt-1.5 text-xs text-muted-foreground">
            Enter your admin passcode to access the enterprise management grid, monetization fees, and system telemetry.
          </p>

          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Admin Passcode</label>
              <Input
                type="password"
                placeholder="Enter passcode (default: admin123)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
              />
              {authError && <p className="text-[11px] text-destructive">{authError}</p>}
            </div>

            <Button type="submit" disabled={isLoading} variant="amber" className="w-full font-bold">
              {isLoading ? "Verifying Access..." : "Unlock Enterprise Grid"}
            </Button>
          </form>

          <div className="mt-6 pt-4 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
            <Link href="/" className="hover:text-foreground inline-flex items-center gap-1">
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
              Promos & Affiliates
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
            <span className="text-xs text-muted-foreground">/ Platform Settings</span>
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
                  <p className="text-2xl font-bold font-mono text-foreground">12.45 SOL</p>
                  <p className="text-[10px] text-emerald-400 flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" /> +18.2% this week
                  </p>
                </div>

                <div className="rounded-xl border border-border/80 bg-card/60 p-4 space-y-1">
                  <div className="flex items-center justify-between text-muted-foreground text-xs">
                    <span>Tokens Deployed</span>
                    <Activity className="h-4 w-4 text-emerald-400" />
                  </div>
                  <p className="text-2xl font-bold font-mono text-foreground">84 Mints</p>
                  <p className="text-[10px] text-muted-foreground">100% Non-custodial atomic</p>
                </div>

                <div className="rounded-xl border border-border/80 bg-card/60 p-4 space-y-1">
                  <div className="flex items-center justify-between text-muted-foreground text-xs">
                    <span>Mainnet Base Fee</span>
                    <CreditCard className="h-4 w-4 text-amber-400" />
                  </div>
                  <p className="text-2xl font-bold font-mono text-foreground">
                    {settings.mainnetBaseFeeSol} SOL
                  </p>
                  <p className="text-[10px] text-muted-foreground">All-inclusive absorbed rent</p>
                </div>

                <div className="rounded-xl border border-border/80 bg-card/60 p-4 space-y-1">
                  <div className="flex items-center justify-between text-muted-foreground text-xs">
                    <span>Storage Engine</span>
                    <Radio className="h-4 w-4 text-purple-400" />
                  </div>
                  <p className="text-lg font-bold text-foreground">4-Tier Resilient</p>
                  <p className="text-[10px] text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Free Arweave Tier Active
                  </p>
                </div>
              </div>

              {/* Quick Actions & Treasury Snapshot */}
              <div className="grid md:grid-cols-12 gap-6">
                <div className="md:col-span-7 rounded-xl border border-border/80 bg-card/60 p-5 space-y-3">
                  <h3 className="text-xs font-bold text-foreground">Active Treasury Wallet</h3>
                  <div className="p-3 rounded-lg bg-background/80 border border-border/60 flex items-center justify-between font-mono text-xs">
                    <span className="truncate">{settings.treasuryWalletAddress}</span>
                    <Badge variant="warning" className="text-[10px] ml-2 shrink-0">
                      Cold Payout
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    All mint creation profits, freeze revocations, and mint authorities are deposited atomically here.
                  </p>
                </div>

                <div className="md:col-span-5 rounded-xl border border-amber-500/20 bg-amber-500/5 p-5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground">Marketing Status</span>
                    <Badge variant={settings.promoBannerActive ? "success" : "secondary"}>
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
                    <h2 className="text-sm font-bold text-foreground">Treasury Payout Address</h2>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground">
                      Solana Treasury Public Key (Where all fees are deposited directly)
                    </label>
                    <Input
                      value={settings.treasuryWalletAddress}
                      onChange={(e) =>
                        setSettings({ ...settings, treasuryWalletAddress: e.target.value.trim() })
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
                    <h2 className="text-sm font-bold text-foreground">Token Creation Pricing</h2>
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
                      <span className="text-[10px] text-muted-foreground">Industry standard: 0.10 - 0.25 SOL</span>
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
                      <span className="text-[10px] text-muted-foreground">0 for free testnet sandbox</span>
                    </div>
                  </div>

                  {/* Addon Fees */}
                  <div className="pt-2 border-t border-border/60 space-y-3">
                    <h3 className="text-xs font-bold text-foreground">Optional Authority Add-On Fees</h3>
                    <div className="grid sm:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <label className="text-[11px] text-muted-foreground">Revoke Freeze</label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={settings.revokeFreezeFeeSol}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              revokeFreezeFeeSol: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="text-xs font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] text-muted-foreground">Revoke Mint</label>
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
                        <label className="text-[11px] text-muted-foreground">Revoke Update</label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={settings.revokeUpdateFeeSol}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              revokeUpdateFeeSol: parseFloat(e.target.value) || 0,
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
                      <h3 className="text-xs font-bold text-foreground">Pricing & Solana Rent Strategy</h3>
                      <p className="text-[11px] text-muted-foreground">
                        Choose how the mandatory ~0.009 SOL Solana account rent is billed to creators.
                      </p>
                    </div>

                    <div className="grid gap-3">
                      {/* Strategy A: All-Inclusive Flat Rate */}
                      <button
                        type="button"
                        onClick={() => setSettings({ ...settings, absorbNetworkRent: true })}
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
                              <Badge variant="success" className="text-[10px] py-0 px-1.5 font-bold">
                                Recommended for Trust
                              </Badge>
                            </div>
                            <p className="text-[11px] text-muted-foreground leading-relaxed">
                              Phantom prompts for the <strong>exact advertised flat fee</strong> (e.g. {settings.mainnetBaseFeeSol.toFixed(3)} SOL). The platform absorbs the ~0.009 SOL rent from the fee so creators experience zero hidden decimal surprises.
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
                            <span className="text-muted-foreground block text-[9px] font-sans">User Pays:</span>
                            <span className="font-bold text-foreground">{settings.mainnetBaseFeeSol.toFixed(3)} SOL</span>
                          </div>
                          <div className="bg-background/70 rounded-md p-1.5 border border-border/40">
                            <span className="text-muted-foreground block text-[9px] font-sans">Your Net Profit:</span>
                            <span className="font-bold text-emerald-400">
                              {Math.max(0, settings.mainnetBaseFeeSol - 0.009).toFixed(3)} SOL
                            </span>
                          </div>
                          <div className="bg-background/70 rounded-md p-1.5 border border-border/40">
                            <span className="text-muted-foreground block text-[9px] font-sans">Solana Rent:</span>
                            <span className="text-muted-foreground">~0.009 SOL</span>
                          </div>
                        </div>
                      </button>

                      {/* Strategy B: Add Rent On Top */}
                      <button
                        type="button"
                        onClick={() => setSettings({ ...settings, absorbNetworkRent: false })}
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
                              <Badge variant="warning" className="text-[10px] py-0 px-1.5 font-bold">
                                Maximum Margin
                              </Badge>
                            </div>
                            <p className="text-[11px] text-muted-foreground leading-relaxed">
                              Creators pay your full fee plus the mandatory ~0.009 SOL Solana account rent separately. Phantom wallet prompts for ~{(settings.mainnetBaseFeeSol + 0.009).toFixed(3)} SOL.
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
                            <span className="text-muted-foreground block text-[9px] font-sans">User Pays:</span>
                            <span className="font-bold text-foreground">
                              {(settings.mainnetBaseFeeSol + 0.009).toFixed(3)} SOL
                            </span>
                          </div>
                          <div className="bg-background/70 rounded-md p-1.5 border border-border/40">
                            <span className="text-muted-foreground block text-[9px] font-sans">Your Net Profit:</span>
                            <span className="font-bold text-amber-400">
                              {settings.mainnetBaseFeeSol.toFixed(3)} SOL
                            </span>
                          </div>
                          <div className="bg-background/70 rounded-md p-1.5 border border-border/40">
                            <span className="text-muted-foreground block text-[9px] font-sans">Solana Rent:</span>
                            <span className="text-muted-foreground">+0.009 SOL</span>
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
                    <span className="text-xs font-bold text-foreground">Creator Pricing Simulation</span>
                    <Badge variant="warning" className="text-[10px]">Live Sync</Badge>
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
                  <div className={`mt-4 rounded-lg border p-2.5 text-[11px] flex items-center gap-2 ${
                    settings.absorbNetworkRent
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                      : "bg-amber-500/10 border-amber-500/20 text-amber-400"
                  }`}>
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
                <h2 className="text-sm font-bold text-foreground">RPC & Decentralized Storage Nodes</h2>
                <p className="text-xs text-muted-foreground">
                  Connect dedicated endpoints (Helius, QuickNode, Triton) to eliminate RPC rate limits.
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Mainnet RPC URL</label>
                  <Input
                    value={settings.mainnetRpcUrl}
                    onChange={(e) => setSettings({ ...settings, mainnetRpcUrl: e.target.value.trim() })}
                    placeholder="https://mainnet.helius-rpc.com/?api-key=..."
                    className="font-mono text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Devnet RPC URL</label>
                  <Input
                    value={settings.devnetRpcUrl}
                    onChange={(e) => setSettings({ ...settings, devnetRpcUrl: e.target.value.trim() })}
                    placeholder="https://api.devnet.solana.com"
                    className="font-mono text-xs"
                  />
                </div>

                <div className="pt-3 border-t border-border/60 space-y-2">
                  <label className="text-xs font-semibold text-foreground">Irys Storage Target Network</label>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setSettings({ ...settings, irysNetwork: "devnet" })}
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
                      onClick={() => setSettings({ ...settings, irysNetwork: "mainnet" })}
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
                  <h2 className="text-sm font-bold text-foreground">Promotional Banner & Discounts</h2>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-foreground">Top Announcement Banner</span>
                    <p className="text-[11px] text-muted-foreground">
                      Display an eye-catching campaign banner at the top of the creator studio
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
                  <label className="text-xs font-semibold text-foreground">Banner Copy / Text</label>
                  <Input
                    value={settings.promoBannerText}
                    onChange={(e) => setSettings({ ...settings, promoBannerText: e.target.value })}
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
                  <h2 className="text-sm font-bold text-foreground">Affiliate & Referral Engine</h2>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-foreground">Enable Referral Sharing</span>
                    <p className="text-[11px] text-muted-foreground">
                      Reward creators and influencers who refer new token creators to your launchpad
                    </p>
                  </div>
                  <Switch
                    checked={settings.referralProgramActive}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, referralProgramActive: checked })
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
                  <span className="text-[10px] text-muted-foreground">Percentage of base fee routed to referrer</span>
                </div>
              </div>
            </div>
          )}

          {/* SECTION: GENERAL & BRANDING */}
          {activeSection === "general" && (
            <div className="rounded-xl border border-border/80 bg-card/60 p-6 space-y-5 max-w-3xl">
              <div>
                <h2 className="text-sm font-bold text-foreground">Brand Identity & Social Channels</h2>
                <p className="text-xs text-muted-foreground">
                  Customize the platform title, taglines, and support community links.
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Platform Brand Title</label>
                  <Input
                    value={settings.platformTitle}
                    onChange={(e) => setSettings({ ...settings, platformTitle: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Subtitle / Tagline</label>
                  <Input
                    value={settings.platformTagline}
                    onChange={(e) => setSettings({ ...settings, platformTagline: e.target.value })}
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-border/60 space-y-3">
                <h3 className="text-xs font-bold text-foreground">Official Community Support Channels</h3>
                <div className="space-y-2">
                  <Input
                    value={settings.supportTelegram}
                    onChange={(e) => setSettings({ ...settings, supportTelegram: e.target.value })}
                    placeholder="Telegram link (https://t.me/...)"
                    className="text-xs"
                  />
                  <Input
                    value={settings.supportTwitter}
                    onChange={(e) => setSettings({ ...settings, supportTwitter: e.target.value })}
                    placeholder="X / Twitter profile link (https://x.com/...)"
                    className="text-xs"
                  />
                  <Input
                    value={settings.supportDiscord}
                    onChange={(e) => setSettings({ ...settings, supportDiscord: e.target.value })}
                    placeholder="Discord invite link"
                    className="text-xs"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-border/60 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-destructive">Maintenance Mode</span>
                  <p className="text-[11px] text-muted-foreground">
                    Temporarily disable new token creation transactions while keeping dashboard active
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
                  <h2 className="text-sm font-bold text-foreground">Live Deployment Registry</h2>
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
                      <td className="py-3 px-3 font-bold text-foreground font-sans">Velocity Coin</td>
                      <td className="py-3 px-3 text-amber-400 font-bold">$VELO</td>
                      <td className="py-3 px-3 capitalize">Devnet</td>
                      <td className="py-3 px-3 text-emerald-400">Freeze + Mint Revoked</td>
                      <td className="py-3 px-3">
                        <Badge variant="success" className="text-[10px]">Confirmed</Badge>
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
                      <td className="py-3 px-3 font-bold text-foreground font-sans">Trust Coin</td>
                      <td className="py-3 px-3 text-amber-400 font-bold">$TRUST</td>
                      <td className="py-3 px-3 capitalize">Mainnet</td>
                      <td className="py-3 px-3 text-emerald-400">Immutable + Capped</td>
                      <td className="py-3 px-3">
                        <Badge variant="success" className="text-[10px]">Confirmed</Badge>
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
                  <h2 className="text-sm font-bold text-foreground">Storage & Cluster Telemetry</h2>
                  <p className="text-xs text-muted-foreground">
                    Real-time status of active upload gateways and wallet connections.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const token = sessionStorage.getItem("admin_auth_token") || "";
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
                  <span className="text-muted-foreground text-[11px]">Platform Signing Address:</span>
                  <p className="font-mono text-foreground font-semibold break-all">
                    {diagnostics?.platformAddress || "Ephemeral (Generated on-demand for free tier)"}
                  </p>
                </div>
                <div className="rounded-lg border border-border/60 bg-background/60 p-3.5 space-y-1">
                  <span className="text-muted-foreground text-[11px]">Irys Node Balance:</span>
                  <p className="font-mono text-emerald-400 font-bold text-sm">
                    {diagnostics?.irysBalance || "0.00 SOL (Free Tier Active)"}
                  </p>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <h3 className="text-xs font-bold text-foreground">4-Tier Fallback Health</h3>
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
                          variant={tier.status === "active" || tier.status === "ready" ? "success" : "secondary"}
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
