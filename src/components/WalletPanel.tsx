"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type WalletState = {
  address: string | null;
  chainId: string | null;
  error: string | null;
};

const ETH_DECIMALS = 18;

const toWei = (amount: string): string => {
  const [whole, fraction = ""] = amount.split(".");
  const safeFraction = fraction.slice(0, ETH_DECIMALS).padEnd(ETH_DECIMALS, "0");
  const normalized = `${whole}${safeFraction}`.replace(/^0+/, "") || "0";
  return BigInt(normalized).toString(16);
};

export default function WalletPanel() {
  const [state, setState] = useState<WalletState>({
    address: null,
    chainId: null,
    error: null
  });
  const [isSending, setIsSending] = useState(false);

  const treasuryAddress =
    process.env.NEXT_PUBLIC_TREASURY_ADDRESS || "";
  const paymentAmount =
    process.env.NEXT_PUBLIC_PAYMENT_AMOUNT_ETH || "0.02";

  const hasWallet = useMemo(
    () => typeof window !== "undefined" && !!(window as any).ethereum,
    []
  );

  const refreshState = useCallback(async () => {
    if (!hasWallet) {
      return;
    }
    try {
      const ethereum = (window as any).ethereum;
      const accounts = await ethereum.request({ method: "eth_accounts" });
      const chainId = await ethereum.request({ method: "eth_chainId" });
      setState({
        address: accounts?.[0] ?? null,
        chainId,
        error: null
      });
    } catch (error) {
      setState({
        address: null,
        chainId: null,
        error: "Unable to read wallet state."
      });
    }
  }, [hasWallet]);

  useEffect(() => {
    refreshState();
  }, [refreshState]);

  const connectWallet = async () => {
    if (!hasWallet) {
      setState((prev) => ({
        ...prev,
        error: "No wallet detected. Install MetaMask or a compatible wallet."
      }));
      return;
    }
    try {
      const ethereum = (window as any).ethereum;
      const accounts = await ethereum.request({
        method: "eth_requestAccounts"
      });
      setState((prev) => ({
        ...prev,
        address: accounts?.[0] ?? null,
        error: null
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: "Wallet connection was rejected."
      }));
    }
  };

  const sendPayment = async () => {
    if (!hasWallet || !state.address) {
      setState((prev) => ({
        ...prev,
        error: "Connect a wallet before sending payment."
      }));
      return;
    }
    if (!treasuryAddress) {
      setState((prev) => ({
        ...prev,
        error: "Treasury address is not configured."
      }));
      return;
    }
    setIsSending(true);
    try {
      const ethereum = (window as any).ethereum;
      const valueHex = `0x${toWei(paymentAmount)}`;
      await ethereum.request({
        method: "eth_sendTransaction",
        params: [
          {
            from: state.address,
            to: treasuryAddress,
            value: valueHex
          }
        ]
      });
      setState((prev) => ({
        ...prev,
        error: null
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: "Payment failed or was rejected."
      }));
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="card">
      <h3>Crypto Membership</h3>
      <p>
        Accept crypto payments securely using a wallet connection. Your
        transaction goes directly to your treasury address.
      </p>
      {!hasWallet && (
        <p>Wallet not detected. Install MetaMask to continue.</p>
      )}
      {state.address ? (
        <p>
          Connected: {state.address.slice(0, 6)}...
          {state.address.slice(-4)} (Chain {state.chainId})
        </p>
      ) : (
        <button className="button" onClick={connectWallet}>
          Connect Wallet
        </button>
      )}
      <div style={{ marginTop: 12 }}>
        <button
          className="button button-secondary"
          onClick={sendPayment}
          disabled={isSending}
        >
          {isSending ? "Sending..." : `Pay ${paymentAmount} ETH`}
        </button>
      </div>
      {state.error && (
        <p style={{ color: "#b91c1c", marginTop: 12 }}>{state.error}</p>
      )}
    </div>
  );
}
