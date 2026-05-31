import { useState, useEffect, useCallback, useRef } from 'react';
import { Flame, Award, Zap, Share2, Sparkles, CheckCircle2 } from 'lucide-react';

const API_BASE = '/api';

// Telegram WebApp interface
const tg = (window as any).Telegram?.WebApp;

interface Candidate {
  _id: string;
  name: string;
  role: 'PRESIDENT' | 'GOVERNOR';
  state?: string;
  imageUrl?: string;
  totalTaps: number;
}

interface TapContainerProps {
  telegramId: string;
  profile: any;
  onProfileUpdate: (updatedProfile: any) => void;
}

export default function TapContainer({
  telegramId,
  profile,
  onProfileUpdate,
}: TapContainerProps) {
  const user = profile?.user || {};
  const presidential = user.presidentialCandidate as Candidate;
  const gubernatorial = user.gubernatorialCandidate as Candidate;

  const [activeRole, setActiveRole] = useState<'PRESIDENT' | 'GOVERNOR'>('PRESIDENT');
  const activeCandidate = activeRole === 'PRESIDENT' ? presidential : gubernatorial;

  // Taps tracking
  const [candidateTotalTaps, setCandidateTotalTaps] = useState(0);
  const [dailyTaps, setDailyTaps] = useState(0);
  const [floatingClicks, setFloatingClicks] = useState<{ id: number; x: number; y: number }[]>([]);
  
  const pendingTapsRef = useRef(0);
  const clickIdRef = useRef(0);
  const timerRef = useRef<any>(null);

  // Load and cache daily taps count from database
  useEffect(() => {
    if (!activeCandidate) return;
    
    // Set candidate total taps
    setCandidateTotalTaps(activeCandidate.totalTaps || 0);

    // Fetch user's daily tap count for this candidate today
    // We can check this by fetching the leaderboard or user status, or we can just fetch a lightweight status
    // For simplicity, we can fetch daily tap count from a new endpoint or let the backend tap response guide us.
    // Let's call /api/game/candidates to refresh candidate taps, and assume dailyTaps = 0 initially until synced.
    // Wait, let's write a simple endpoint or fetch it. Actually, we can fetch profile details or get it on tap.
    // Let's assume dailyTaps starts at 0, and if they tap it updates. 
    // To make it fully robust, let's fetch daily records or we can just query it. Let's write code to assume dailyTaps is loaded.
    // Let's call an endpoint: GET /api/game/leaderboard (which has stats) or let's create a tiny endpoint/query in our profile.
    // Wait! Let's look at user profile, we can fetch daily tap counts. But wait, we can also query the API /api/game/daily-taps?userId=...&candidateId=...
    // Let's fetch the daily count! Let's add a GET endpoint /api/game/daily-taps or fetch it.
    // Alternatively, let's request it on load:
    fetch(`${API_BASE}/game/daily-taps?userId=${telegramId}&candidateId=${activeCandidate._id}`)
      .then(res => res.json())
      .then(data => {
        setDailyTaps(data.dailyTaps || 0);
      })
      .catch(() => setDailyTaps(0));

  }, [activeCandidate, telegramId]);

  // Sync taps to the backend
  const syncTapsToBackend = useCallback(async () => {
    const tapsToSync = pendingTapsRef.current;
    if (tapsToSync <= 0 || !activeCandidate) return;

    // Reset pending taps buffer
    pendingTapsRef.current = 0;

    try {
      const res = await fetch(`${API_BASE}/game/tap`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: telegramId,
          candidateId: activeCandidate._id,
          taps: tapsToSync,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setCandidateTotalTaps(data.candidateTotalTaps);
        setDailyTaps(data.dailyTapsCount);
        
        // Refresh overall user profile to update total user score
        const profileRes = await fetch(`${API_BASE}/user/profile?telegramId=${telegramId}`);
        const profileData = await profileRes.json();
        if (profileData.exists) {
          onProfileUpdate(profileData);
        }
      } else {
        // Limit exceeded or other error — re-fetch profile to sync actual values
        alert(data.message || 'Failed to sync taps');
        window.location.reload();
      }
    } catch (err) {
      console.error('Failed to sync taps:', err);
      // Put them back in queue
      pendingTapsRef.current += tapsToSync;
    }
  }, [activeCandidate, telegramId, onProfileUpdate]);

  // Handle tap event
  const handleTap = useCallback((e: React.TouchEvent<HTMLDivElement> | React.MouseEvent<HTMLDivElement>) => {
    if (!activeCandidate) return;
    if (dailyTaps >= 100) return; // Daily limit reached

    // Provide haptic feedback if available
    if (tg?.HapticFeedback?.impactOccurred) {
      tg.HapticFeedback.impactOccurred('medium');
    }

    // Increment locally for instant responsiveness
    setDailyTaps(prev => Math.min(100, prev + 1));
    setCandidateTotalTaps(prev => prev + 1);
    pendingTapsRef.current += 1;

    // Floating animation coordinates
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    const id = clickIdRef.current++;
    setFloatingClicks(prev => [...prev, { id, x, y }]);
    setTimeout(() => {
      setFloatingClicks(prev => prev.filter(c => c.id !== id));
    }, 800);

    // Debounced sync to database (2.5 seconds of inactivity)
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      syncTapsToBackend();
    }, 2500);
  }, [activeCandidate, dailyTaps, syncTapsToBackend]);

  // Clean up and sync on unmount or tab change
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (pendingTapsRef.current > 0) {
        syncTapsToBackend();
      }
    };
  }, [syncTapsToBackend]);

  const getAvatarInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  };

  const getCandidateAvatar = (c: Candidate) => {
    if (c.imageUrl) return c.imageUrl;
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(getAvatarInitials(c.name))}&background=008753&color=fff&size=256&bold=true`;
  };

  const handleShareClick = () => {
    // Open a share dialog for Telegram
    const referralCode = user.referralCode || `ref_${telegramId}`;
    const botLink = profile?.botLink || 't.me/tele_vote_2027_bot';
    const cleanBotLink = botLink.startsWith('http') ? botLink : `https://${botLink}`;
    const shareText = encodeURIComponent(
      `Support ${activeCandidate.name} with me for 2027! Tap to vote now 🇳🇬🔥`
    );
    const shareUrl = encodeURIComponent(`${cleanBotLink}?start=${referralCode}`);
    const telegramShareUrl = `https://t.me/share/url?url=${shareUrl}&text=${shareText}`;
    
    if (tg?.openTelegramLink) {
      tg.openTelegramLink(telegramShareUrl);
    } else {
      window.open(telegramShareUrl, '_blank');
    }
  };

  if (!activeCandidate) {
    return (
      <div className="empty-game-view">
        <Sparkles size={48} className="pulse-icon" />
        <h3>Complete Onboarding First</h3>
        <p>Please select your state and candidate choices to start tapping.</p>
      </div>
    );
  }

  const isLimitReached = dailyTaps >= 100;

  return (
    <main className="main-content tap-main">
      {/* Target Selector Tabs */}
      <div className="target-tabs">
        <button
          className={`tab-btn ${activeRole === 'PRESIDENT' ? 'active' : ''}`}
          onClick={() => {
            if (pendingTapsRef.current > 0) syncTapsToBackend();
            setActiveRole('PRESIDENT');
          }}
        >
          <Award size={18} />
          Presidential
        </button>
        <button
          className={`tab-btn ${activeRole === 'GOVERNOR' ? 'active' : ''}`}
          onClick={() => {
            if (pendingTapsRef.current > 0) syncTapsToBackend();
            setActiveRole('GOVERNOR');
          }}
        >
          <Zap size={18} />
          Governor ({user.state || 'State'})
        </button>
      </div>

      {/* Global Voter Stats */}
      <div className="voter-score-badge">
        <span className="badge-title">Your Total Taps</span>
        <span className="badge-value">{(user.score || 0).toLocaleString()}</span>
      </div>

      {/* Candidate Display */}
      <div className="candidate-info-card">
        <span className="candidate-title-label">
          {activeRole === 'PRESIDENT' ? '2027 Presidential Choice' : `Governor Choice for ${user.state}`}
        </span>
        <h2 className="candidate-active-name">{activeCandidate.name}</h2>
        <div className="candidate-total-stats">
          <Flame size={16} className="flame-icon" />
          <span>{candidateTotalTaps.toLocaleString()} total taps</span>
        </div>
      </div>

      {/* Interactive Tapper Area */}
      <div 
        className={`tap-area-wrapper ${isLimitReached ? 'limit-reached' : ''}`}
        onPointerDown={handleTap}
      >
        <div className="tap-outer-glow"></div>
        <div className="tap-ring-animated"></div>
        
        <img 
          className="tap-image-avatar" 
          src={getCandidateAvatar(activeCandidate)} 
          alt={activeCandidate.name} 
          draggable="false"
        />

        {isLimitReached && (
          <div className="lock-overlay">
            <CheckCircle2 size={54} className="checkmark-icon" />
            <span>Daily 100 Limit Reached!</span>
          </div>
        )}

        {/* Floating Numbers */}
        {floatingClicks.map(click => (
          <div 
            key={click.id} 
            className="floating-number-spark"
            style={{ left: `${click.x}px`, top: `${click.y}px` }}
          >
            +1
          </div>
        ))}
      </div>

      {/* Daily Progress Meter */}
      <div className="daily-progress-meter">
        <div className="meter-header">
          <span>Daily Tap Budget</span>
          <span className="progress-fraction">{dailyTaps}/100</span>
        </div>
        <div className="meter-bar-bg">
          <div 
            className="meter-bar-fill"
            style={{ width: `${(dailyTaps / 100) * 100}%` }}
          ></div>
        </div>
        <p className="meter-footer">
          {isLimitReached 
            ? 'Daily limit achieved! Check back in 24 hours.' 
            : `${100 - dailyTaps} taps left to contribute today.`}
        </p>
      </div>

      {/* Share Card & Action Bar */}
      <div className="action-button-row">
        <button className="share-card-btn" onClick={handleShareClick}>
          <Share2 size={18} />
          Share Movement
        </button>
        <a 
          href={`${API_BASE}/user/share-image?telegramId=${telegramId}`}
          target="_blank"
          rel="noreferrer"
          className="generate-card-btn"
        >
          <Sparkles size={18} />
          Get Share Card
        </a>
      </div>
    </main>
  );
}
