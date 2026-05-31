import { useState } from 'react';
import { Award, Check, Wallet, Smartphone, ShieldCheck } from 'lucide-react';

const API_BASE = '/api';
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
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletType, setWalletType] = useState<'tonkeeper' | 'telegram' | null>(null);
  const [currency, setCurrency] = useState<'TON' | 'USDT'>('TON');
  
  const [connecting, setConnecting] = useState(false);
  const [paying, setPaying] = useState(false);
  const [success, setSuccess] = useState(false);
  const [txHash, setTxHash] = useState('');

  const handleConnectWallet = (type: 'tonkeeper' | 'telegram') => {
    setConnecting(true);
    if (tg?.HapticFeedback?.impactOccurred) {
      tg.HapticFeedback.impactOccurred('light');
    }

    setTimeout(() => {
      setConnecting(false);
      setWalletConnected(true);
      setWalletType(type);
    }, 1500);
  };

  const handlePayment = async () => {
    setPaying(true);
    if (tg?.HapticFeedback?.impactOccurred) {
      tg.HapticFeedback.impactOccurred('heavy');
    }

    // Simulate blockchain mining/confirmation latency
    setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE}/user/subscribe`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ telegramId }),
        });

        const data = await res.json();
        if (data.success) {
          // Generate a fake transaction hash for demonstration
          const randHash = '0x' + Array.from({ length: 40 }, () => 
            Math.floor(Math.random() * 16).toString(16)
          ).join('');
          setTxHash(randHash);
          setPaying(false);
          setSuccess(true);
          
          if (tg?.HapticFeedback?.notificationOccurred) {
            tg.HapticFeedback.notificationOccurred('success');
          }

          // Fetch fresh profile details
          const profileRes = await fetch(`${API_BASE}/user/profile?telegramId=${telegramId}`);
          const profileData = await profileRes.json();
          if (profileData.exists) {
            onProfileUpdate(profileData);
          }
        } else {
          alert('Subscription failed: ' + (data.message || 'Unknown error'));
          setPaying(false);
        }
      } catch (err) {
        console.error('Failed to upgrade subscription:', err);
        alert('Network error. Failed to process payment.');
        setPaying(false);
      }
    }, 2500);
  };

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
              <ShieldCheck size={72} className="success-glowing-shield" />
            </div>
            <h2>Premium Status Unlocked! 🌟</h2>
            <p className="success-p-description">
              Congratulations! Your account has been upgraded. You now qualify for cashable referral rewards, double tapping power, and golden badges.
            </p>
            <div className="blockchain-tx-box">
              <span>Transaction Confirmed (TON)</span>
              <span className="tx-hash-value" title={txHash}>{txHash.slice(0, 10)}...{txHash.slice(-8)}</span>
            </div>
            <button className="premium-dismiss-btn" onClick={onClose}>
              Let's Go! 🚀
            </button>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="premium-modal-header">
              <Award className="brand-gold-sparkle" size={48} />
              <h2>Premium Supporter Upgrade</h2>
              <p>Support your candidate at the highest level and unlock referral payouts.</p>
            </div>

            {/* Benefits list */}
            <div className="premium-benefits-checklist">
              <div className="benefit-row">
                <Check className="check-gold" size={16} />
                <span>**Cashable Referral Rewards:** Convert NGN 3,000 referrals to real funds.</span>
              </div>
              <div className="benefit-row">
                <Check className="check-gold" size={16} />
                <span>**2x Tap Multiplier:** Double the weight of your support on leadboards.</span>
              </div>
              <div className="benefit-row">
                <Check className="check-gold" size={16} />
                <span>**Golden Poster Themes:** Access exclusive backgrounds in the poster editor.</span>
              </div>
              <div className="benefit-row">
                <Check className="check-gold" size={16} />
                <span>**Weekly Giveaway Access:** Automatically enter the top supporter raffles.</span>
              </div>
            </div>

            {/* Price section */}
            <div className="premium-price-tier-selector">
              <div className="price-label-row">
                <span>Voter Pass Subscription</span>
                <span className="converted-price">≈ $10.00 USD</span>
              </div>
              
              <div className="crypto-currency-selector">
                <button
                  className={`currency-pill ${currency === 'TON' ? 'active' : ''}`}
                  onClick={() => setCurrency('TON')}
                >
                  0.85 TON
                </button>
                <button
                  className={`currency-pill ${currency === 'USDT' ? 'active' : ''}`}
                  onClick={() => setCurrency('USDT')}
                >
                  10.00 USDT
                </button>
              </div>
            </div>

            {/* Wallet flow */}
            {!walletConnected ? (
              <div className="wallet-connect-wrapper">
                <h3>Connect Web3 Wallet</h3>
                
                {connecting ? (
                  <div className="wallet-connecting-indicator">
                    <div className="spinner-small gold"></div>
                    <span>Initializing Secure Connection...</span>
                  </div>
                ) : (
                  <div className="wallet-button-row">
                    <button className="wallet-btn tonkeeper" onClick={() => handleConnectWallet('tonkeeper')}>
                      <Smartphone size={16} />
                      Tonkeeper
                    </button>
                    <button className="wallet-btn telegram-wallet" onClick={() => handleConnectWallet('telegram')}>
                      <Wallet size={16} />
                      Telegram Wallet
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="wallet-pay-wrapper">
                <div className="connected-wallet-indicator">
                  <div className="indicator-left">
                    <Wallet size={16} className="active-wallet-icon" />
                    <span>Connected: **UQDx...e42a** ({walletType === 'tonkeeper' ? 'Tonkeeper' : 'Telegram Wallet'})</span>
                  </div>
                  <button className="disconnect-wallet-btn" onClick={() => setWalletConnected(false)}>
                    Change
                  </button>
                </div>

                {paying ? (
                  <div className="wallet-paying-indicator">
                    <div className="spinner-small gold"></div>
                    <span>Broadcasting to TON Blockchain...</span>
                  </div>
                ) : (
                  <button className="submit-pay-contract-btn" onClick={handlePayment}>
                    Confirm and Pay {currency === 'TON' ? '0.85 TON' : '10.00 USDT'}
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
