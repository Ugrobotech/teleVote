import React, { useState, useCallback, useRef } from 'react';
import { Trophy, Users, Home } from 'lucide-react';
import './index.css';

// Initialize the Telegram SDK early
if (typeof WebApp !== 'undefined' && typeof WebApp.ready === 'function') {
  WebApp.ready();
  WebApp.expand();
} else if ((window as any).Telegram?.WebApp) {
  (window as any).Telegram.WebApp.ready();
  (window as any).Telegram.WebApp.expand();
}

function TapView() {
  const [points, setPoints] = useState(0);
  const [clicks, setClicks] = useState<{ id: number, x: number, y: number }[]>([]);
  const clickIdRef = useRef(0);

  const handleTap = useCallback((e: React.TouchEvent<HTMLDivElement> | React.MouseEvent<HTMLDivElement>) => {
    // Provide haptic feedback if available
    if ((window as any).Telegram?.WebApp?.HapticFeedback?.impactOccurred) {
      (window as any).Telegram.WebApp.HapticFeedback.impactOccurred('light');
    }

    setPoints(prev => prev + 1);

    // Calculate click coordinates for floating animation
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
    setClicks(prev => [...prev, { id, x, y }]);
    
    // Remove floating number after animation
    setTimeout(() => {
      setClicks(prev => prev.filter(click => click.id !== id));
    }, 800);

    // TODO: Need debounced API call to /api/game/tap
  }, []);

  return (
    <main className="main-content">
      <div className="points-label">Your Contribution</div>
      <div className="points-display">{points.toLocaleString()}</div>

      <div 
        className="tap-area" 
        onPointerDown={handleTap}
      >
        <div className="tap-ring"></div>
        <img 
          className="tap-image" 
          src="https://ui-avatars.com/api/?name=C&background=008753&color=fff&size=256" 
          alt="Candidate" 
          draggable="false"
        />
        {clicks.map(click => (
          <div 
            key={click.id} 
            className="floating-number"
            style={{ left: `${click.x}px`, top: `${click.y}px` }}
          >
            +1
          </div>
        ))}
      </div>
    </main>
  );
}

function LeaderboardView() {
  return (
    <main className="main-content" style={{ justifyContent: 'flex-start', width: '100%', padding: '1rem' }}>
      <h2 style={{ color: 'var(--primary)', marginBottom: '1rem', alignSelf: 'flex-start' }}>Top Supporters</h2>
      <div style={{ width: '100%', background: 'var(--bg-card)', borderRadius: '15px', padding: '1rem' }}>
        {[1, 2, 3, 4, 5, 6].map((_, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem 0', borderBottom: i < 5 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
            <span style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
              <span style={{ color: i < 3 ? 'var(--accent)' : 'var(--text-muted)', fontWeight: '900', fontSize: '1.2rem' }}>#{i + 1}</span>
              <span style={{ fontWeight: 'bold' }}>CryptoUser_{i + 1}</span>
            </span>
            <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>{(15000 - i * 1500).toLocaleString()} taps</span>
          </div>
        ))}
      </div>
    </main>
  );
}

function App() {
  const [activeTab, setActiveTab] = useState<'tap' | 'leaderboard' | 'friends'>('tap');

  return (
    <div className="app-container">
      <header className="header">
        <h1 className="title">Tap For <span className="green-text">Candidate</span></h1>
      </header>

      {activeTab === 'tap' && <TapView />}
      {activeTab === 'leaderboard' && <LeaderboardView />}
      {activeTab === 'friends' && (
        <main className="main-content">
          <h2 style={{ color: 'var(--accent)' }}>Share & Earn!</h2>
          <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Invite your friends and earn bonus tap multipliers.</p>
        </main>
      )}

      <footer className="bottom-nav">
        <div className={`nav-item ${activeTab === 'tap' ? 'active' : ''}`} onClick={() => setActiveTab('tap')}>
          <Home size={24} />
          <span>Tap</span>
        </div>
        <div className={`nav-item ${activeTab === 'leaderboard' ? 'active' : ''}`} onClick={() => setActiveTab('leaderboard')}>
          <Trophy size={24} />
          <span>Leaderboard</span>
        </div>
        <div className={`nav-item ${activeTab === 'friends' ? 'active' : ''}`} onClick={() => setActiveTab('friends')}>
          <Users size={24} />
          <span>Friends</span>
        </div>
      </footer>
    </div>
  );
}

export default App;
