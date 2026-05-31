import { useState } from 'react';
import { Users, Copy, Share2, Award, ArrowUpRight, ShieldCheck, HelpCircle } from 'lucide-react';

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
}

export default function FriendsContainer({
  telegramId,
  profile,
  onOpenPremium,
}: FriendsContainerProps) {
  const user = profile?.user || {};
  const stats = profile?.referralStats || { totalReferred: 0, subscribedReferred: 0, friends: [] };
  const friends: Friend[] = stats.friends || [];

  const [copied, setCopied] = useState(false);

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

  // NGN 3,000 bonus per subscribed referral
  const rewardRate = 3000;
  const potentialSubscribedEarnings = stats.subscribedReferred * rewardRate;
  const cashableEarnings = user.isSubscriber ? potentialSubscribedEarnings : 0;
  const lockedPremiumEarnings = !user.isSubscriber ? potentialSubscribedEarnings : 0;
  
  // Pending earnings from free friends who haven't subscribed yet
  const freeFriendsCount = stats.totalReferred - stats.subscribedReferred;
  const pendingEarnings = freeFriendsCount * rewardRate;

  return (
    <main className="main-content friends-main">
      {/* Premium Voter Banner */}
      {!user.isSubscriber ? (
        <div className="premium-upsell-banner">
          <div className="banner-left">
            <Award className="gold-medal-icon" size={32} />
            <div className="banner-text">
              <h3>Become a Premium Voter 🌟</h3>
              <p>Unlock cashable NGN {potentialSubscribedEarnings.toLocaleString()} referral earnings & double tap multipliers!</p>
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
            Cashable Rewards
            <span title="Cashable if both you and the friend are subscribed">
              <HelpCircle size={12} className="tooltip-icon" />
            </span>
          </span>
          <span className="stat-value cashable">NGN {cashableEarnings.toLocaleString()}</span>
          {lockedPremiumEarnings > 0 && (
            <span className="stat-subtext locked" onClick={onOpenPremium}>
              🔒 NGN {lockedPremiumEarnings.toLocaleString()} locked (Upgrade to unlock)
            </span>
          )}
        </div>
        
        <div className="reward-stat-card">
          <span className="stat-label">Pending Rewards</span>
          <span className="stat-value pending">NGN {pendingEarnings.toLocaleString()}</span>
          <span className="stat-subtext">Waiting for friends to subscribe</span>
        </div>
      </div>

      {/* Referral Link Card */}
      <div className="referral-link-card">
        <h3>Your Referral Link</h3>
        <p>Invite friends to earn +500 points on onboarding and NGN 3,000 on premium upgrades!</p>
        
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
