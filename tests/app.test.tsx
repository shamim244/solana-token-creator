import { address, createSolanaRpc } from "@solana/kit";
import { ClientProvider } from "@solana/react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { useMemo } from "react";
import { Toaster } from "sonner";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  expect,
  test,
  describe,
} from "vitest";
import { AirdropCard } from "../app/components/actions/airdrop-card";
import { MemoCard } from "../app/components/actions/memo-card";
import { TransferSolCard } from "../app/components/actions/transfer-sol-card";
import { ClusterProvider } from "../app/components/cluster-context";
import { WalletButton } from "../app/components/wallet-button";
import { createAppClient } from "../app/lib/solana-client";
import {
  mockWalletAddress,
  registerMockWallet,
  resetMockWallet,
} from "./mock-wallet";

import type { Surfnet } from "@solana/surfpool";

const LAMPORTS_PER_SOL = 1_000_000_000;

interface SurfnetFactory {
  start: () => Surfnet;
  newKeypair: () => { publicKey: string };
}

let SurfnetClass: SurfnetFactory | null = null;
try {
  const surfpool = await import("@solana/surfpool");
  SurfnetClass = surfpool.Surfnet as unknown as SurfnetFactory;
} catch {
  // Native binary not compiled for platform (e.g. Windows MSVC)
}

const isSurfnetSupported = Boolean(
  SurfnetClass && process.platform !== "win32"
);

describe.skipIf(!isSurfnetSupported)(
  "Surfnet On-Chain Integration Tests",
  () => {
    let surfnet: Surfnet | undefined;
    let rpc: ReturnType<typeof createSolanaRpc>;

    beforeAll(() => {
      if (!SurfnetClass) return;
      surfnet = SurfnetClass.start();
      rpc = createSolanaRpc(surfnet.rpcUrl);
      surfnet.fundSol(mockWalletAddress, 5 * LAMPORTS_PER_SOL);
      registerMockWallet();
    }, 60_000);

    afterAll(() => {
      surfnet?.stop();
    });

    beforeEach(() => {
      localStorage.clear();
      resetMockWallet();
    });

    afterEach(cleanup);

    function TestApp() {
      const client = useMemo(
        () =>
          createAppClient("localnet", {
            rpcUrl: surfnet?.rpcUrl || "http://127.0.0.1:8899",
            rpcSubscriptionsUrl: surfnet?.wsUrl || "ws://127.0.0.1:8900",
          }),
        []
      );
      return (
        <ClusterProvider>
          <ClientProvider client={client}>
            <WalletButton />
            <AirdropCard />
            <TransferSolCard />
            <MemoCard />
            <Toaster />
          </ClientProvider>
        </ClusterProvider>
      );
    }

    async function getBalance(owner: string): Promise<bigint> {
      const { value } = await rpc
        .getBalance(address(owner), { commitment: "confirmed" })
        .send();
      return value;
    }

    async function connectWallet() {
      fireEvent.click(
        await screen.findByRole("button", { name: "Connect Wallet" })
      );
      fireEvent.click(
        await screen.findByRole("button", { name: "Mock Wallet" })
      );
      return await screen.findByRole("button", {
        name: `Wallet ${mockWalletAddress}`,
      });
    }

    test("connects the mock wallet and shows its on-chain balance", async () => {
      surfnet?.fundSol(mockWalletAddress, 5 * LAMPORTS_PER_SOL);
      render(<TestApp />);

      const walletButton = await connectWallet();
      fireEvent.click(walletButton);

      await screen.findByText(mockWalletAddress);
      await waitFor(
        () => {
          const balance = screen.getByText("Balance").nextElementSibling;
          expect(balance?.textContent).toBe("5 SOL");
        },
        { timeout: 10_000 }
      );
    });

    test("airdrop button funds the connected wallet", async () => {
      render(<TestApp />);
      await connectWallet();

      const before = await getBalance(mockWalletAddress);
      fireEvent.click(screen.getByRole("button", { name: "Airdrop 1 SOL" }));

      await screen.findByText("Airdropped 1 SOL");
      await waitFor(async () => {
        expect(await getBalance(mockWalletAddress)).toBe(
          before + BigInt(LAMPORTS_PER_SOL)
        );
      });
    });

    test("signs and sends a SOL transfer that moves lamports on-chain", async () => {
      const recipient = SurfnetClass?.newKeypair().publicKey || "";
      render(<TestApp />);
      await connectWallet();

      expect(await getBalance(recipient)).toBe(0n);
      const senderBefore = await getBalance(mockWalletAddress);

      fireEvent.change(screen.getByPlaceholderText("Recipient address"), {
        target: { value: recipient },
      });
      fireEvent.change(screen.getByPlaceholderText("Amount (SOL)"), {
        target: { value: "1" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Send SOL" }));

      await screen.findByText("SOL transfer sent", {}, { timeout: 15_000 });
      expect(await getBalance(recipient)).toBe(BigInt(LAMPORTS_PER_SOL));
      expect(await getBalance(mockWalletAddress)).toBeLessThan(
        senderBefore - BigInt(LAMPORTS_PER_SOL)
      );
    });

    test("posts a memo and records it in the transaction logs", async () => {
      render(<TestApp />);
      await connectWallet();

      fireEvent.click(screen.getByRole("button", { name: "Post memo" }));
      await screen.findByText("Memo posted", {}, { timeout: 15_000 });

      const signatures = await rpc
        .getSignaturesForAddress(address(mockWalletAddress), { limit: 1 })
        .send();
      expect(signatures.length).toBeGreaterThan(0);
      const transaction = await rpc
        .getTransaction(signatures[0].signature, {
          encoding: "json",
          maxSupportedTransactionVersion: 0,
        })
        .send();
      expect(transaction?.meta?.logMessages?.join("\n")).toContain(
        "gm from @solana/kit"
      );
    });
  }
);
