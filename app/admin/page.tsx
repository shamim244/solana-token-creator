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
} from "lucide-react";
import { toast } from "sonner";
import type { PlatformSettings } from "../lib/platform-settings";

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"fees" | "rpc" | "diagnostics">("fees");

  const [settings, setSettings] = useState<PlatformSettings>({
    mainnetBaseFeeSol: 0.15,
    devnetBaseFeeSol: 0,
    revokeFreezeFeeSol: 0.1,
    revokeMintFeeSol: 0.1,
    revokeUpdateFeeSol: 0.1,
    absorbNetworkRent: true,
    treasuryWalletAddress: "54Xn6d6X4wHrkZ9eHnC8F2v56yZ8K5j2Q8s7J3k4L5m6",
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
        toast.success("Platform settings updated & saved to disk!");
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
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl border border-border/80 bg-card/80 p-8 shadow-2xl backdrop-blur-xl">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 mb-6">
            <Lock className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Admin Portal</h1>
          <p className="mt-1.5 text-xs text-muted-foreground">
            Enter your admin passcode to access live fee configuration, treasury settings, and platform diagnostics.
          </p>

          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Passcode</label>
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
              {isLoading ? "Verifying..." : "Unlock Dashboard"}
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

  // 2. Full Admin Dashboard
  return (
    <div className="min-h-screen bg-background text-foreground pb-16">
      {/* Top Header */}
      <header className="border-b border-border/80 bg-card/60 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm tracking-tight text-foreground">
                  Platform Control Center
                </span>
                <Badge variant="success" className="text-[10px] py-0">
                  Live Sync
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground font-mono">
                No-code dynamic settings
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={handleSave}
              disabled={isSaving}
              variant="amber"
              className="gap-1.5 text-xs font-bold shadow-md"
            >
              <Save className="h-3.5 w-3.5" />
              {isSaving ? "Saving..." : "Save All Changes"}
            </Button>
            <Button
              onClick={handleLogout}
              variant="outline"
              size="sm"
              className="h-9 px-2.5 text-xs text-muted-foreground hover:text-destructive"
            >
              <LogOut className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-8 space-y-6">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-border/80 pb-3">
          <button
            onClick={() => setActiveTab("fees")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "fees"
                ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
            }`}
          >
            <Coins className="h-4 w-4" />
            Monetization & Fees
          </button>
          <button
            onClick={() => setActiveTab("rpc")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "rpc"
                ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
            }`}
          >
            <Server className="h-4 w-4" />
            RPC & Storage Nodes
          </button>
          <button
            onClick={() => setActiveTab("diagnostics")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "diagnostics"
                ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
            }`}
          >
            <Layers className="h-4 w-4" />
            Live Health & Diagnostics
          </button>
        </div>

        {/* TAB 1: FEES & MONETIZATION */}
        {activeTab === "fees" && (
          <div className="grid gap-6 md:grid-cols-12 items-start">
            {/* Left Column: Inputs */}
            <div className="md:col-span-7 space-y-5">
              <div className="rounded-xl border border-border/80 bg-card/60 p-5 space-y-4">
                <div className="flex items-center gap-2 border-b border-border/60 pb-3">
                  <Wallet className="h-4 w-4 text-amber-400" />
                  <h2 className="text-sm font-bold text-foreground">Treasury Payout Address</h2>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">
                    Solana Treasury Public Key (Where all creation & authority fees are deposited)
                  </label>
                  <Input
                    value={settings.treasuryWalletAddress}
                    onChange={(e) =>
                      setSettings({ ...settings, treasuryWalletAddress: e.target.value.trim() })
                    }
                    placeholder="Enter base58 Solana wallet address..."
                    className="font-mono text-xs"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Funds are sent atomically inside the same mint transaction directly to this wallet.
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-border/80 bg-card/60 p-5 space-y-4">
                <div className="flex items-center gap-2 border-b border-border/60 pb-3">
                  <Coins className="h-4 w-4 text-amber-400" />
                  <h2 className="text-sm font-bold text-foreground">Mainnet Token Creation Fees</h2>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">
                      Base Creation Fee (SOL)
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
                    <span className="text-[10px] text-muted-foreground">Competitors charge: 0.10 - 0.25 SOL</span>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">
                      Devnet Creation Fee (SOL)
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
                    <span className="text-[10px] text-muted-foreground">Keep at 0 for free testnet creation</span>
                  </div>
                </div>

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

                <div className="pt-3 border-t border-border/60 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-foreground">All-Inclusive Rent Absorption</span>
                    <p className="text-[11px] text-muted-foreground">
                      Absorb ~0.009 SOL network rent into platform fee so Phantom shows exact flat fee
                    </p>
                  </div>
                  <Switch
                    checked={settings.absorbNetworkRent}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, absorbNetworkRent: checked })
                    }
                  />
                </div>
              </div>
            </div>

            {/* Right Column: Live Creator Receipt Simulation */}
            <div className="md:col-span-5 space-y-4">
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-5 space-y-3">
                <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
                  <span className="text-xs font-bold text-foreground">Live Creator Pricing Preview</span>
                  <Badge variant="warning" className="text-[10px]">Real-time</Badge>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  This is exactly what users will see on the final review step on Mainnet:
                </p>

                <div className="space-y-2 pt-2 border-t border-border/40 text-xs">
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
                    <span>Maximum Total per Token:</span>
                    <span className="font-mono text-amber-400 text-sm">
                      {(
                        settings.mainnetBaseFeeSol +
                        settings.revokeFreezeFeeSol +
                        settings.revokeMintFeeSol +
                        settings.revokeUpdateFeeSol
                      ).toFixed(3)}{" "}
                      SOL
                    </span>
                  </div>
                </div>

                <div className="mt-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-2.5 text-[11px] text-emerald-400 flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 shrink-0" />
                  <span>Phantom wallet deduction will match this exact number.</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: RPC & STORAGE */}
        {activeTab === "rpc" && (
          <div className="rounded-xl border border-border/80 bg-card/60 p-6 space-y-5 max-w-3xl">
            <div>
              <h2 className="text-sm font-bold text-foreground">RPC & Cluster Endpoints</h2>
              <p className="text-xs text-muted-foreground">
                Point your platform to premium dedicated RPC providers (Helius, QuickNode, Triton) for faster confirmations.
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

        {/* TAB 3: DIAGNOSTICS & HEALTH */}
        {activeTab === "diagnostics" && (
          <div className="rounded-xl border border-border/80 bg-card/60 p-6 space-y-5 max-w-3xl">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div>
                <h2 className="text-sm font-bold text-foreground">Storage & Cluster Diagnostics</h2>
                <p className="text-xs text-muted-foreground">
                  Status of active upload gateways and wallet connections.
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
  );
}
