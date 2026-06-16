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
  const [dailyTaps, setDailyTaps] = useState(0);
  const [voterTotalTaps, setVoterTotalTaps] = useState<number>(user.score || 0);
  const [floatingClicks, setFloatingClicks] = useState<{ id: number; x: number; y: number }[]>([]);

  // Synchronize local voterTotalTaps with user.score profile updates
  useEffect(() => {
    setVoterTotalTaps(user.score || 0);
  }, [user.score]);
  
  // Selector states
  const [showSelectorModal, setShowSelectorModal] = useState(false);
  const [governorCandidates, setGovernorCandidates] = useState<Candidate[]>([]);
  const [selectorLoading, setSelectorLoading] = useState(false);

  const pendingTapsRef = useRef(0);
  const clickIdRef = useRef(0);
  const timerRef = useRef<any>(null);

  const openCandidateSelector = async () => {
    setShowSelectorModal(true);
    setSelectorLoading(true);
    try {
      const res = await fetch(`${API_BASE}/game/candidates?role=GOVERNOR&state=${encodeURIComponent(user.state)}`);
      const data = await res.json();
      setGovernorCandidates(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setSelectorLoading(false);
    }
  };

  const handleSelectGovernor = async (candidateId: string) => {
    try {
      const res = await fetch(`${API_BASE}/user/onboarding`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegramId,
          state: user.state,
          presidentialCandidateId: presidential._id,
          gubernatorialCandidateId: candidateId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        // Fetch updated profile
        const profileRes = await fetch(`${API_BASE}/user/profile?telegramId=${telegramId}`);
        const profileData = await profileRes.json();
        if (profileData.exists) {
          onProfileUpdate(profileData);
        }
        setShowSelectorModal(false);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to select candidate.');
    }
  };

  // Load and cache daily taps count from database
  useEffect(() => {
    if (!activeCandidate) {
      setDailyTaps(0);
      return;
    }

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
    if (dailyTaps >= 1000) return; // Daily limit reached

    // Provide haptic feedback if available
    if (tg?.HapticFeedback?.impactOccurred) {
      tg.HapticFeedback.impactOccurred('medium');
    }

    // Increment locally for instant responsiveness
    setDailyTaps(prev => Math.min(1000, prev + 1));
    setVoterTotalTaps(prev => prev + 1);
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
    const candidateNameText = activeCandidate ? `Support ${activeCandidate.name} with me` : 'Support your favorite candidates with me';
    const shareText = encodeURIComponent(
      `${candidateNameText} for 2027! Tap to vote now 🇳🇬🔥`
    );
    const shareUrl = encodeURIComponent(`${cleanBotLink}?start=${referralCode}`);
    const telegramShareUrl = `https://t.me/share/url?url=${shareUrl}&text=${shareText}`;
    
    if (tg?.openTelegramLink) {
      tg.openTelegramLink(telegramShareUrl);
    } else {
      window.open(telegramShareUrl, '_blank');
    }
  };

  if (!presidential) {
    return (
      <div className="empty-game-view">
        <Sparkles size={48} className="pulse-icon" />
        <h3>Complete Onboarding First</h3>
        <p>Please select your state and candidate choices to start tapping.</p>
      </div>
    );
  }

  const isLimitReached = dailyTaps >= 1000;

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
      {/* Global Voter Stats */}
      <div className="voter-score-badge">
        {user.isSubscriber && (
          <span 
            className="premium-voter-badge" 
            style={{
              background: 'linear-gradient(135deg, #f2a900 0%, #ffdf00 100%)',
              color: '#000',
              fontSize: '0.65rem',
              fontWeight: 800,
              padding: '4px 12px',
              borderRadius: '20px',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              boxShadow: '0 0 10px rgba(242, 169, 0, 0.4)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              marginBottom: '8px'
            }}
          >
            <Sparkles size={10} /> Premium Voter
          </span>
        )}
        <span className="badge-title">Your Total Taps</span>
        <span className="badge-value">{(voterTotalTaps || 0).toLocaleString()}</span>
      </div>

      {/* Candidate Display */}
      <div className="candidate-info-card">
        <span className="candidate-title-label">
          {activeRole === 'PRESIDENT' ? '2027 Presidential Choice' : `Governor Choice for ${user.state}`}
        </span>
        <h2 className="candidate-active-name">{activeCandidate?.name || 'No Governor Selected'}</h2>
        <div className="candidate-total-stats">
          <Flame size={16} className="flame-icon" />
          <span>{(dailyTaps || 0).toLocaleString()} taps today</span>
        </div>
      </div>

      {/* Interactive Tapper Area */}
      {!activeCandidate ? (
        <div 
          onClick={openCandidateSelector}
          className="tap-area-wrapper"
          style={{
            width: '220px',
            height: '220px',
            borderRadius: '50%',
            border: '2px dashed var(--glass-border)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            cursor: 'pointer',
            background: 'rgba(255,255,255,0.01)',
            textAlign: 'center',
            padding: '20px',
            margin: '0.5rem auto 1.5rem',
            position: 'relative'
          }}
        >
          <div className="tap-outer-glow"></div>
          <Award size={36} className="green-text" style={{ filter: 'drop-shadow(0 0 10px rgba(0, 135, 83, 0.4))' }} />
          <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-main)' }}>Choose Candidate</span>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Tap to set governor</span>
        </div>
      ) : (
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
              <span>Daily 1000 Limit Reached!</span>
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
      )}

      {/* Daily Progress Meter */}
      <div className="daily-progress-meter">
        <div className="meter-header">
          <span>Daily Tap Budget</span>
          <span className="progress-fraction">{dailyTaps}/1000</span>
        </div>
        <div className="meter-bar-bg">
          <div 
            className="meter-bar-fill"
            style={{ width: `${(dailyTaps / 1000) * 100}%` }}
          ></div>
        </div>
        <p className="meter-footer">
          {isLimitReached 
            ? 'Daily limit achieved! Check back in 24 hours.' 
            : `${1000 - dailyTaps} taps left to contribute today.`}
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
      {/* Selector Modal Overlay */}
      {showSelectorModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 1000, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.25rem' }}>
          <div style={{ width: '100%', maxWidth: '400px', background: 'var(--bg-card)', border: '1px solid var(--glass-border)', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 8px 32px rgba(0,0,0,0.4)', display: 'flex', flexDirection: 'column', gap: '1.25rem', position: 'relative' }}>
            <button 
              onClick={() => setShowSelectorModal(false)}
              style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
            >
              Cancel
            </button>
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#fff' }}>Choose {user.state} Governor</h3>
            {selectorLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}><div className="loading-spinner" /></div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', maxHeight: '300px', overflowY: 'auto', paddingRight: '4px' }}>
                {governorCandidates.map(c => (
                  <div 
                    key={c._id}
                    onClick={() => handleSelectGovernor(c._id)}
                    style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px', borderRadius: '10px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)', cursor: 'pointer' }}
                  >
                    <img src={c.imageUrl || 'https://via.placeholder.com/40'} alt={c.name} style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', background: '#333' }} />
                    <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#fff' }}>{c.name}</span>
                  </div>
                ))}
                {governorCandidates.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    No candidates registered for {user.state} State yet.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
