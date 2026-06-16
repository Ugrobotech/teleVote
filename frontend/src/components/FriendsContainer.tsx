import { useState, useEffect } from 'react';
import { Users, Copy, Share2, Award, ArrowUpRight, ShieldCheck, HelpCircle, Wallet } from 'lucide-react';

const tg = (window as any).Telegram?.WebApp;

interface Friend {
  _id: string;
  username: string;
  firstName: string;
  lastName: string;
  isSubscriber: boolean;
  onboardingComplete: boolean;
  score: number;
}

interface FriendsContainerProps {
  telegramId: string;
  profile: any;
  onOpenPremium: () => void;
  onRefreshProfile?: () => void;
}

export default function FriendsContainer({
  telegramId,
  profile,
  onOpenPremium,
  onRefreshProfile,
}: FriendsContainerProps) {
  const user = profile?.user || {};
  const stats = profile?.referralStats || {
    totalReferred: 0,
    subscribedReferred: 0,
    friends: [],
    pointsAvailable: 0,
    pointsPending: 0,
    pointsWithdrawn: 0
  };
  const friends: Friend[] = stats.friends || [];

  const [copied, setCopied] = useState(false);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [withdrawPoints, setWithdrawPoints] = useState<string>('');
  const [withdrawChain, setWithdrawChain] = useState<'solana' | 'evm'>('solana');
  const [withdrawAddress, setWithdrawAddress] = useState<string>('');
  const [withdrawStatus, setWithdrawStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const referralCode = user.referralCode || `ref_${telegramId}`;
  const botLink = profile?.botLink || 't.me/tele_vote_2027_bot';
  const referralLink = botLink.startsWith('http') ? `${botLink}?start=${referralCode}` : `https://${botLink}?start=${referralCode}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    if (tg?.HapticFeedback?.notificationOccurred) {
      tg.HapticFeedback.notificationOccurred('success');
    }
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInvite = () => {
    const shareText = encodeURIComponent(
      `Support your candidate with me for the 2027 Nigerian elections! Tap & climb the leaderboards together 🇳🇬🔥`
    );
    const telegramShareUrl = `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${shareText}`;
    
    if (tg?.openTelegramLink) {
      tg.openTelegramLink(telegramShareUrl);
    } else {
      window.open(telegramShareUrl, '_blank');
    }
  };

  const fetchWithdrawals = async () => {
    try {
      const res = await fetch(`/api/user/withdrawals?telegramId=${telegramId}`);
      const data = await res.json();
      if (data.withdrawals) {
        setWithdrawals(data.withdrawals);
      }
    } catch (err) {
      console.error('Failed to fetch withdrawals:', err);
    }
  };

  useEffect(() => {
    fetchWithdrawals();
  }, [telegramId]);

  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setWithdrawStatus(null);
    
    const pointsNum = parseInt(withdrawPoints);
    if (isNaN(pointsNum) || pointsNum <= 0) {
      setWithdrawStatus({ type: 'error', message: 'Please enter a valid points amount.' });
      return;
    }

    if (pointsNum > pointsAvailable) {
      setWithdrawStatus({ type: 'error', message: `You only have ${pointsAvailable} points available.` });
      return;
    }

    if (!withdrawAddress.trim()) {
      setWithdrawStatus({ type: 'error', message: 'Wallet address is required.' });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/user/withdraw`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegramId,
          points: pointsNum,
          walletAddress: withdrawAddress.trim(),
          chain: withdrawChain,
        }),
      });
      const data = await res.json();
      if (data.error) {
        setWithdrawStatus({ type: 'error', message: data.error });
      } else {
        setWithdrawStatus({
          type: 'success',
          message: `Successfully requested payout for ${pointsNum} points!`,
        });
        setWithdrawPoints('');
        setWithdrawAddress('');
        fetchWithdrawals();
        if (onRefreshProfile) {
          onRefreshProfile();
        }
      }
    } catch (err) {
      console.error('Error submitting withdrawal:', err);
      setWithdrawStatus({ type: 'error', message: 'Network error submitting payout request.' });
    } finally {
      setSubmitting(false);
    }
  };

  // 1 point per referred user who also subscribes
  const pointsAvailable = user.isSubscriber ? (stats.pointsAvailable || 0) : 0;
  const pointsLocked = !user.isSubscriber ? (stats.pointsAvailable || 0) : 0;
  const pointsPending = stats.pointsPending || 0;
  const pointsWithdrawn = stats.pointsWithdrawn || 0;
  const freeFriendsCount = stats.totalReferred - stats.subscribedReferred;

  return (
    <main className="main-content friends-main">
      {/* Premium Voter Banner */}
      {!user.isSubscriber ? (
        <div className="premium-upsell-banner">
          <div className="banner-left">
            <Award className="gold-medal-icon" size={32} />
            <div className="banner-text">
              <h3>Become a Premium Voter 🌟</h3>
              <p>Unlock cashable referral points & qualify for weekly $2,000 giveaways!</p>
            </div>
          </div>
          <button className="banner-upgrade-btn" onClick={onOpenPremium}>
            Upgrade
            <ArrowUpRight size={16} />
          </button>
        </div>
      ) : (
        <div className="premium-active-banner">
          <ShieldCheck size={28} className="shield-active-icon" />
          <div className="banner-text">
            <h3>Premium Status Active 🌟</h3>
            <p>You qualify for cashable referral rewards and weekly giveaways!</p>
          </div>
        </div>
      )}

      {/* Reward Dashboard */}
      <div className="reward-dashboard">
        <div className="reward-stat-card">
          <span className="stat-label">
            Available Points
            <span title="Available for withdrawal (requires premium)">
              <HelpCircle size={12} className="tooltip-icon" />
            </span>
          </span>
          <span className="stat-value cashable">{pointsAvailable} PTS</span>
          {pointsLocked > 0 && (
            <span className="stat-subtext locked" onClick={onOpenPremium}>
              🔒 {pointsLocked} PTS locked (Upgrade to unlock)
            </span>
          )}
        </div>
        
        <div className="reward-stat-card">
          <span className="stat-label">Pending Points</span>
          <span className="stat-value pending">{pointsPending} PTS</span>
          <span className="stat-subtext">Waiting for approval</span>
        </div>

        <div className="reward-stat-card">
          <span className="stat-label">Withdrawn Points</span>
          <span className="stat-value cashable" style={{ color: '#4caf50' }}>{pointsWithdrawn} PTS</span>
          <span className="stat-subtext">Paid to your wallet</span>
        </div>
      </div>

      {/* Withdrawal request form */}
      <div className="referral-link-card withdrawal-card">
        <div className="withdrawal-card-header" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
          <Wallet size={20} className="gold-medal-icon" />
          <h3 style={{ margin: 0 }}>Referral Point Cashout</h3>
        </div>
        {user.isSubscriber ? (
          <>
            <p style={{ marginBottom: '15px' }}>
              Subscribers earn 1 point per referred user who also subscribes. Points can be cashed out to EVM or Solana wallets ($10 value per point).
            </p>
            {pointsAvailable > 0 ? (
              <form onSubmit={handleWithdrawSubmit} className="withdrawal-form">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Points to Cash Out</label>
                      <input
                        type="number"
                        min="1"
                        max={pointsAvailable}
                        value={withdrawPoints}
                        onChange={(e) => setWithdrawPoints(e.target.value)}
                        placeholder={`Max ${pointsAvailable}`}
                        required
                        style={{
                          width: '100%',
                          background: 'rgba(0, 0, 0, 0.25)',
                          border: '1px solid var(--glass-border)',
                          borderRadius: '8px',
                          padding: '10px',
                          color: 'white',
                          fontSize: '0.85rem',
                          outline: 'none',
                        }}
                      />
                    </div>
                    <div style={{ width: '130px' }}>
                      <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Chain</label>
                      <select
                        value={withdrawChain}
                        onChange={(e) => setWithdrawChain(e.target.value as 'solana' | 'evm')}
                        style={{
                          width: '100%',
                          background: 'rgba(0, 0, 0, 0.25)',
                          border: '1px solid var(--glass-border)',
                          borderRadius: '8px',
                          padding: '10px',
                          color: 'white',
                          fontSize: '0.85rem',
                          outline: 'none',
                        }}
                      >
                        <option value="solana">Solana</option>
                        <option value="evm">EVM</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>
                      Recipient Wallet Address ({withdrawChain === 'solana' ? 'Solana' : 'EVM'})
                    </label>
                    <input
                      type="text"
                      value={withdrawAddress}
                      onChange={(e) => setWithdrawAddress(e.target.value)}
                      placeholder={withdrawChain === 'solana' ? 'Solana address...' : '0x... EVM address'}
                      required
                      style={{
                        width: '100%',
                        background: 'rgba(0, 0, 0, 0.25)',
                        border: '1px solid var(--glass-border)',
                        borderRadius: '8px',
                        padding: '10px',
                        color: 'white',
                        fontSize: '0.85rem',
                        outline: 'none',
                      }}
                    />
                  </div>
                  {withdrawStatus && (
                    <div
                      style={{
                        padding: '8px 12px',
                        borderRadius: '6px',
                        fontSize: '0.8rem',
                        background: withdrawStatus.type === 'success' ? 'rgba(76, 175, 80, 0.15)' : 'rgba(244, 67, 54, 0.15)',
                        color: withdrawStatus.type === 'success' ? '#4caf50' : '#f44336',
                        border: withdrawStatus.type === 'success' ? '1px solid rgba(76, 175, 80, 0.3)' : '1px solid rgba(244, 67, 54, 0.3)',
                      }}
                    >
                      {withdrawStatus.message}
                    </div>
                  )}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="friends-invite-btn"
                    style={{ marginTop: '5px', width: '100%', padding: '12px' }}
                  >
                    {submitting ? 'Requesting...' : `Withdraw to ${withdrawChain.toUpperCase()}`}
                  </button>
                </div>
              </form>
            ) : (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textAlign: 'center', padding: '10px 0' }}>
                You don't have any cashable referral points available yet.
              </div>
            )}
          </>
        ) : (
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textAlign: 'center', padding: '10px 0' }}>
            🔒 Please upgrade to premium to access referral point withdrawals.
          </div>
        )}
      </div>

      {/* Payout History */}
      {withdrawals.length > 0 && (
        <div className="referral-link-card">
          <h3 style={{ marginBottom: '12px' }}>Payout History</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {withdrawals.map((req) => (
              <div
                key={req._id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: 'rgba(0,0,0,0.15)',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  border: '1px solid rgba(255,255,255,0.03)',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'white' }}>
                    {req.points} Points ({req.chain.toUpperCase()})
                  </span>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {req.walletAddress}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                  <span
                    style={{
                      fontSize: '0.7rem',
                      padding: '3px 8px',
                      borderRadius: '12px',
                      fontWeight: 'bold',
                      background:
                        req.status === 'APPROVED'
                          ? 'rgba(76, 175, 80, 0.15)'
                          : req.status === 'REJECTED'
                          ? 'rgba(244, 67, 54, 0.15)'
                          : 'rgba(255, 193, 7, 0.15)',
                      color:
                        req.status === 'APPROVED'
                          ? '#4caf50'
                          : req.status === 'REJECTED'
                          ? '#f44336'
                          : '#ffc107',
                    }}
                  >
                    {req.status}
                  </span>
                  {req.txHash && (
                    <a
                      href={
                        req.chain === 'solana'
                          ? `https://solscan.io/account/${req.walletAddress}?cluster=devnet`
                          : `https://polygonscan.com/tx/${req.txHash}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: '0.65rem', color: '#64b5f6', textDecoration: 'underline' }}
                    >
                      Tx Link
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Referral Link Card */}
      <div className="referral-link-card">
        <h3>Your Referral Link</h3>
        <p>Invite friends to earn +500 points on onboarding and 1 referral point on premium upgrades!</p>
        
        <div className="copy-link-box">
          <input type="text" readOnly value={referralLink} className="link-input-display" />
          <button onClick={handleCopyLink} className="copy-btn">
            {copied ? 'Copied!' : <Copy size={16} />}
          </button>
        </div>

        <button onClick={handleInvite} className="friends-invite-btn">
          <Share2 size={18} />
          Invite via Telegram
        </button>
      </div>

      {/* Friends List */}
      <div className="friends-list-header">
        <Users size={20} />
        <h3>Referred Friends ({stats.totalReferred})</h3>
        {freeFriendsCount > 0 && (
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '8px' }}>
            ({freeFriendsCount} free)
          </span>
        )}
      </div>

      <div className="friends-scroller">
        {friends.length === 0 ? (
          <div className="friends-empty-state">
            <p>No friends referred yet. Send your invite link to get started!</p>
          </div>
        ) : (
          friends.map((friend) => (
            <div key={friend._id} className="friend-row-item">
              <div className="friend-info">
                <span className="friend-name">
                  {friend.firstName
                    ? `${friend.firstName} ${friend.lastName || ''}`.trim()
                    : `@${friend.username || 'Anonymous'}`}
                </span>
                <div className="friend-badge-row">
                  <span className={`friend-badge ${friend.onboardingComplete ? 'onboarded' : 'pending'}`}>
                    {friend.onboardingComplete ? 'Onboarded' : 'Pending'}
                  </span>
                  <span className={`friend-badge ${friend.isSubscriber ? 'subscriber' : 'free'}`}>
                    {friend.isSubscriber ? 'Premium 🌟' : 'Free'}
                  </span>
                </div>
              </div>
              <div className="friend-points">
                <span className="points-amount">{friend.score.toLocaleString()}</span>
                <span className="points-label">taps</span>
              </div>
            </div>
          ))
        )}
      </div>
    </main>
  );
}
