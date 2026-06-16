import { useState, useEffect } from "react";
import {
  Award,
  Check,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";

const API_BASE = "/api";
const tg = (window as any).Telegram?.WebApp;

interface PremiumOverlayProps {
  telegramId: string;
  onClose: () => void;
  onProfileUpdate: (updatedProfile: any) => void;
}

export default function PremiumOverlay({
  telegramId,
  onClose,
  onProfileUpdate,
}: PremiumOverlayProps) {
  const [selectedNetwork, setSelectedNetwork] = useState<string>("solana");
  const [selectedToken, setSelectedToken] = useState<"native" | "usdc">("usdc");
  const [walletData, setWalletData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [success, setSuccess] = useState(false);
  const [txHash, setTxHash] = useState("");

  const [prices, setPrices] = useState<Record<string, number>>({
    solana: 150.0,
    ethereum: 3500.0,
    bsc: 580.0,
    base: 3500.0,
    polygon: 0.65,
    arbitrum: 3500.0,
  });

  const fetchPricesAndBalances = async () => {
    setLoading(true);
    try {
      // Fetch prices from Binance API
      const symbols = ["SOLUSDT", "ETHUSDT", "BNBUSDT", "POLUSDT"];
      const priceRes = await fetch(
        `https://api.binance.com/api/v3/ticker/price?symbols=${JSON.stringify(symbols)}`,
      );
      const priceData = await priceRes.json();
      const priceMap: any = {};
      if (Array.isArray(priceData)) {
        priceData.forEach((item) => {
          priceMap[item.symbol] = parseFloat(item.price);
        });
      }

      setPrices({
        solana: priceMap.SOLUSDT || 150.0,
        ethereum: priceMap.ETHUSDT || 3500.0,
        bsc: priceMap.BNBUSDT || 580.0,
        base: priceMap.ETHUSDT || 3500.0,
        polygon: priceMap.POLUSDT || 0.65,
        arbitrum: priceMap.ETHUSDT || 3500.0,
      });

      // Fetch user's wallet balances
      const balRes = await fetch(
        `${API_BASE}/wallet/balances?telegramId=${telegramId}`,
      );
      const balData = await balRes.json();
      if (balData && balData.addresses) {
        setWalletData(balData);
      }
    } catch (err) {
      console.error("Failed to load prices/balances:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPricesAndBalances();
  }, [telegramId]);

  const handlePayment = async () => {
    if (!walletData) return;
    setPaying(true);
    if (tg?.HapticFeedback?.impactOccurred) {
      tg.HapticFeedback.impactOccurred("heavy");
    }

    try {
      const res = await fetch(`${API_BASE}/user/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          telegramId,
          network: selectedNetwork,
          tokenType: selectedToken,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setTxHash(data.signature || "");
        setSuccess(true);

        if (tg?.HapticFeedback?.notificationOccurred) {
          tg.HapticFeedback.notificationOccurred("success");
        }

        // Fetch fresh profile details
        const profileRes = await fetch(
          `${API_BASE}/user/profile?telegramId=${telegramId}`,
        );
        const profileData = await profileRes.json();
        if (profileData.exists) {
          onProfileUpdate(profileData);
        }
      } else {
        alert("Subscription failed: " + (data.message || "Unknown error"));
      }
    } catch (err) {
      console.error("Failed to upgrade subscription:", err);
      alert("Network error. Failed to process payment.");
    } finally {
      setPaying(false);
    }
  };

  const getExplorerLink = () => {
    if (!walletData || !txHash) return "#";
    const baseUrl = walletData.explorers[selectedNetwork] || "";
    if (!baseUrl) return "#";

    if (selectedNetwork === "solana") {
      try {
        const url = new URL(baseUrl);
        url.pathname = `/tx/${txHash}`;
        return url.toString();
      } catch (e) {
        if (baseUrl.includes("?")) {
          const [base, query] = baseUrl.split("?");
          const cleanBase = base.endsWith("/") ? base.slice(0, -1) : base;
          return `${cleanBase}/tx/${txHash}?${query}`;
        }
        const cleanBase = baseUrl.endsWith("/")
          ? baseUrl.slice(0, -1)
          : baseUrl;
        return `${cleanBase}/tx/${txHash}`;
      }
    }

    const cleanBase = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
    return `${cleanBase}/tx/${txHash}`;
  };

  // Helper selectors
  const networks = [
    {
      key: "solana",
      name: "Solana",
      symbol: "SOL",
      logo: "https://solscan.io/_next/static/media/solana-sol-logo.ecf2bf3a.svg",
    },
    {
      key: "ethereum",
      name: "Ethereum",
      symbol: "ETH",
      logo: "https://etherscan.io/images/svg/brands/ethereum-original.svg",
    },
    {
      key: "bsc",
      name: "BNB Chain",
      symbol: "BNB",
      logo: "https://bscscan.com/assets/bsc/images/svg/logos/token-light.svg?v=26.6.2.0",
    },
    {
      key: "base",
      name: "Base",
      symbol: "ETH",
      logo: "https://basescan.org/assets/base/images/svg/logos/chain-light.svg?v=",
    },
    {
      key: "polygon",
      name: "Polygon",
      symbol: "POL",
      logo: "https://polygonscan.com/assets/poly/images/svg/logos/token-light.svg?v=26.6.2.0",
    },
    {
      key: "arbitrum",
      name: "Arbitrum",
      symbol: "ETH",
      logo: "https://arbiscan.io/assets/arbitrum/images/svg/logos/token-secondary-light.svg?v=",
    },
  ];

  const currentNetwork =
    networks.find((n) => n.key === selectedNetwork) || networks[0];

  // Calculate pricing & cost
  const getRequiredAmount = () => {
    if (selectedToken === "usdc") return 10.0;
    const price = prices[selectedNetwork] || 1.0;
    return 10.0 / price;
  };

  const getBalance = () => {
    if (!walletData) return 0;
    const bal = walletData.balances[selectedNetwork];
    if (!bal) return 0;
    return selectedToken === "usdc" ? bal.usdc : bal.native;
  };

  const requiredAmount = getRequiredAmount();
  const balance = getBalance();
  const hasEnoughFunds = balance >= requiredAmount;

  if (loading) {
    return (
      <div className="premium-overlay-backdrop">
        <div
          className="premium-modal-card"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "350px",
            gap: "15px",
          }}
        >
          <div className="loading-spinner" />
          <span style={{ fontSize: "0.9rem", color: "var(--text-muted)" }}>
            ...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="premium-overlay-backdrop">
      <div className="premium-modal-card">
        {/* Close button */}
        {!paying && !success && (
          <button className="premium-modal-close-btn" onClick={onClose}>
            ✕
          </button>
        )}

        {/* Success Screen */}
        {success ? (
          <div className="premium-flow-success">
            <div className="success-lottie-mock">
              <ShieldCheck
                size={72}
                className="success-glowing-shield"
                style={{ color: "var(--primary)" }}
              />
            </div>
            <h2
              style={{
                fontSize: "1.4rem",
                fontWeight: 800,
                margin: "1rem 0 0.5rem",
              }}
            >
              Premium Status Unlocked! 🌟
            </h2>
            <p
              className="success-p-description"
              style={{
                fontSize: "0.85rem",
                color: "var(--text-muted)",
                lineHeight: 1.5,
                marginBottom: "1.25rem",
              }}
            >
              Congratulations! Your account has been upgraded. You now qualify
              for cashable referral rewards, double tapping power, and voter
              badges.
            </p>
            {txHash && (
              <div
                className="blockchain-tx-box"
                style={{
                  background: "rgba(0,0,0,0.4)",
                  padding: "0.85rem 1rem",
                  borderRadius: "10px",
                  border: "1px solid var(--glass-border)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "5px",
                  marginBottom: "1.5rem",
                  textAlign: "left",
                }}
              >
                <span
                  style={{
                    fontSize: "0.7rem",
                    textTransform: "uppercase",
                    color: "var(--text-muted)",
                    fontWeight: 700,
                  }}
                >
                  Transaction Receipt ({selectedNetwork})
                </span>
                <a
                  href={getExplorerLink()}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    color: "var(--primary-light)",
                    fontSize: "0.8rem",
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                    wordBreak: "break-all",
                  }}
                >
                  {txHash.slice(0, 16)}...{txHash.slice(-16)}
                  <ExternalLink size={12} />
                </a>
              </div>
            )}
            <button
              className="next-btn"
              onClick={onClose}
              style={{ width: "100%", padding: "14px", borderRadius: "12px" }}
            >
              Let's Go! 🚀
            </button>
          </div>
        ) : (
          <>
            {/* Header */}
            <div
              className="premium-modal-header"
              style={{ textAlign: "center", marginBottom: "1.25rem" }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  marginBottom: "0.5rem",
                }}
              >
                <Award size={48} style={{ color: "var(--primary)" }} />
              </div>
              <h2
                style={{
                  fontSize: "1.35rem",
                  fontWeight: 800,
                  margin: "0 0 0.5rem",
                }}
              >
                Premium Supporter Upgrade
              </h2>
              <p
                style={{
                  fontSize: "0.85rem",
                  color: "var(--text-muted)",
                  margin: 0,
                }}
              >
                Support your candidate at the highest level and unlock referral
                payouts.
              </p>
            </div>

            {/* Benefits list */}
            <div
              className="premium-benefits-checklist"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                marginBottom: "1.25rem",
                padding: "0.75rem",
                background: "rgba(255,255,255,0.02)",
                borderRadius: "12px",
                border: "1px solid var(--glass-border)",
              }}
            >
              <div
                className="benefit-row"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  fontSize: "0.8rem",
                  textAlign: "left",
                }}
              >
                <Check
                  size={14}
                  style={{ color: "var(--primary-light)", flexShrink: 0 }}
                />
                <span>
                  <strong>Cashable Referral Rewards:</strong> Qualify for
                  referral rewards payouts.
                </span>
              </div>
              <div
                className="benefit-row"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  fontSize: "0.8rem",
                  textAlign: "left",
                }}
              >
                <Check
                  size={14}
                  style={{ color: "var(--primary-light)", flexShrink: 0 }}
                />
                <span>
                  <strong>2x Tap Multiplier:</strong> Double the weight of your
                  support on rankings.
                </span>
              </div>
              <div
                className="benefit-row"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  fontSize: "0.8rem",
                  textAlign: "left",
                }}
              >
                <Check
                  size={14}
                  style={{ color: "var(--primary-light)", flexShrink: 0 }}
                />
                <span>
                  <strong>Voter Badges:</strong> Display a premium badge next to
                  your rank.
                </span>
              </div>
            </div>

            {/* Network Selector */}
            <div style={{ textAlign: "left", marginBottom: "1rem" }}>
              <label
                style={{
                  fontSize: "0.75rem",
                  color: "var(--text-muted)",
                  fontWeight: 800,
                  textTransform: "uppercase",
                  display: "block",
                  marginBottom: "8px",
                }}
              >
                Select Payment Network
              </label>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: "6px",
                }}
              >
                {networks.map((net) => (
                  <button
                    key={net.key}
                    onClick={() => setSelectedNetwork(net.key)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      background:
                        selectedNetwork === net.key
                          ? "rgba(0,135,83,0.15)"
                          : "rgba(255,255,255,0.03)",
                      border:
                        selectedNetwork === net.key
                          ? "2px solid var(--primary)"
                          : "2px solid var(--glass-border)",
                      borderRadius: "10px",
                      padding: "8px 6px",
                      cursor: "pointer",
                      color:
                        selectedNetwork === net.key
                          ? "#fff"
                          : "rgba(255,255,255,0.6)",
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      justifyContent: "center",
                      transition: "all 0.2s ease",
                    }}
                  >
                    <img
                      src={net.logo}
                      alt={net.name}
                      style={{
                        width: "16px",
                        height: "16px",
                        borderRadius: "50%",
                      }}
                    />
                    <span>{net.name === "BNB Chain" ? "BNB" : net.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Token Selector */}
            <div style={{ textAlign: "left", marginBottom: "1.25rem" }}>
              <label
                style={{
                  fontSize: "0.75rem",
                  color: "var(--text-muted)",
                  fontWeight: 800,
                  textTransform: "uppercase",
                  display: "block",
                  marginBottom: "8px",
                }}
              >
                Select Asset
              </label>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  onClick={() => setSelectedToken("usdc")}
                  className={`currency-pill ${selectedToken === "usdc" ? "active" : ""}`}
                  style={{
                    flex: 1,
                    padding: "10px 0",
                    background:
                      selectedToken === "usdc"
                        ? "var(--primary)"
                        : "rgba(255,255,255,0.03)",
                    border: "1px solid var(--glass-border)",
                    borderRadius: "10px",
                    color: "#fff",
                    fontWeight: 700,
                    cursor: "pointer",
                    fontSize: "0.8rem",
                    transition: "all 0.2s ease",
                  }}
                >
                  USDC
                </button>
                <button
                  onClick={() => setSelectedToken("native")}
                  className={`currency-pill ${selectedToken === "native" ? "active" : ""}`}
                  style={{
                    flex: 1,
                    padding: "10px 0",
                    background:
                      selectedToken === "native"
                        ? "var(--primary)"
                        : "rgba(255,255,255,0.03)",
                    border: "1px solid var(--glass-border)",
                    borderRadius: "10px",
                    color: "#fff",
                    fontWeight: 700,
                    cursor: "pointer",
                    fontSize: "0.8rem",
                    transition: "all 0.2s ease",
                  }}
                >
                  {currentNetwork.symbol} (Native)
                </button>
              </div>
            </div>

            {/* Bill Summary */}
            <div
              style={{
                background: "rgba(0,0,0,0.3)",
                border: "1px solid var(--glass-border)",
                borderRadius: "12px",
                padding: "12px",
                textAlign: "left",
                marginBottom: "1.5rem",
                fontSize: "0.8rem",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "6px",
                }}
              >
                <span style={{ color: "var(--text-muted)" }}>
                  Required Cost:
                </span>
                <span style={{ fontWeight: 800, color: "#fff" }}>
                  {selectedToken === "usdc"
                    ? "10.00 USDC"
                    : `${requiredAmount.toFixed(selectedNetwork === "solana" ? 3 : 5)} ${currentNetwork.symbol}`}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  borderTop: "1px dashed rgba(255,255,255,0.05)",
                  paddingTop: "6px",
                }}
              >
                <span style={{ color: "var(--text-muted)" }}>
                  Your Wallet Balance:
                </span>
                <span
                  style={{
                    fontWeight: 800,
                    color: hasEnoughFunds
                      ? "var(--primary-light)"
                      : "var(--danger)",
                  }}
                >
                  {balance.toFixed(selectedToken === "usdc" ? 2 : 4)}{" "}
                  {selectedToken === "usdc" ? "USDC" : currentNetwork.symbol}
                </span>
              </div>
            </div>

            {/* Pay Button / Insufficient Funds Alert */}
            {paying ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  padding: "14px",
                  background: "var(--glass)",
                  border: "1px solid var(--glass-border)",
                  borderRadius: "12px",
                  color: "var(--primary-light)",
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  width: "100%",
                }}
              >
                <RefreshCw size={16} className="spinning" />
                <span>Executing multi-chain payment...</span>
              </div>
            ) : !hasEnoughFunds ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                <div
                  style={{
                    background: "rgba(231,76,60,0.05)",
                    border: "1px solid rgba(231,76,60,0.15)",
                    borderRadius: "10px",
                    padding: "10px",
                    fontSize: "0.75rem",
                    color: "rgba(255,255,255,0.7)",
                    textAlign: "left",
                  }}
                >
                  ⚠️ <strong>Insufficient Balance:</strong> Fund your in-app{" "}
                  <strong>{currentNetwork.name}</strong> wallet address with at
                  least $10 worth of{" "}
                  {selectedToken === "usdc" ? "USDC" : currentNetwork.symbol}{" "}
                  (plus gas) to unlock premium.
                </div>
                <button
                  className="nav-btn back-btn"
                  onClick={onClose}
                  style={{
                    width: "100%",
                    justifyContent: "center",
                    padding: "12px",
                  }}
                >
                  Go to Wallet Page
                </button>
              </div>
            ) : (
              <button
                className="next-btn"
                onClick={handlePayment}
                style={{ width: "100%", padding: "14px", borderRadius: "12px" }}
              >
                Confirm and Pay $10.00
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
