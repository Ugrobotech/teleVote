import { useState, useEffect } from 'react';
import { Trophy, Users, Home, Palette } from 'lucide-react';
import OnboardingFlow from './components/OnboardingFlow';
import TapContainer from './components/TapContainer';
import LeaderboardContainer from './components/LeaderboardContainer';
import FriendsContainer from './components/FriendsContainer';
import PosterGenerator from './components/PosterGenerator';
import PremiumOverlay from './components/PremiumOverlay';
import AdminDashboard from './components/AdminDashboard';
import './index.css';

const API_BASE = '/api';

// Initialize the Telegram SDK early
const tg = (window as any).Telegram?.WebApp;
if (tg) {
  tg.ready();
  tg.expand();
}

function getTelegramUser() {
  const user = tg?.initDataUnsafe?.user;
  
  // Parse referral code if passed from startParam
  const startParam = tg?.initDataUnsafe?.start_param || '';
  
  return {
    telegramId: user?.id?.toString() || '',
    username: user?.username || '',
    firstName: user?.first_name || '',
    lastName: user?.last_name || '',
    referredByCode: startParam,
  };
}

interface GameViewProps {
  telegramId: string;
  profile: any;
  onProfileUpdate: (updatedProfile: any) => void;
  onOpenPremium: () => void;
}

type Tab = 'tap' | 'leaderboard' | 'friends' | 'poster';

function GameView({
  telegramId,
  profile,
  onProfileUpdate,
  onOpenPremium,
}: GameViewProps) {
  const [activeTab, setActiveTab] = useState<Tab>('tap');

  return (
    <>
      <header className="header">
        <h1 className="title">Tap For <span className="green-text">Candidate</span></h1>
      </header>

      {activeTab === 'tap' && (
        <TapContainer
          telegramId={telegramId}
          profile={profile}
          onProfileUpdate={onProfileUpdate}
        />
      )}
      {activeTab === 'leaderboard' && (
        <LeaderboardContainer profile={profile} />
      )}
      {activeTab === 'friends' && (
        <FriendsContainer
          telegramId={telegramId}
          profile={profile}
          onOpenPremium={onOpenPremium}
        />
      )}
      {activeTab === 'poster' && (
        <PosterGenerator profile={profile} />
      )}

      <footer className="bottom-nav">
        <div className={`nav-item ${activeTab === 'tap' ? 'active' : ''}`} onClick={() => setActiveTab('tap')}>
          <Home size={22} />
          <span>Tap</span>
        </div>
        <div className={`nav-item ${activeTab === 'leaderboard' ? 'active' : ''}`} onClick={() => setActiveTab('leaderboard')}>
          <Trophy size={22} />
          <span>Ranks</span>
        </div>
        <div className={`nav-item ${activeTab === 'friends' ? 'active' : ''}`} onClick={() => setActiveTab('friends')}>
          <Users size={22} />
          <span>Friends</span>
        </div>
        <div className={`nav-item ${activeTab === 'poster' ? 'active' : ''}`} onClick={() => setActiveTab('poster')}>
          <Palette size={22} />
          <span>Poster</span>
        </div>
      </footer>
    </>
  );
}

type AppState = 'loading' | 'onboarding' | 'game';

function App() {
  const [appState, setAppState] = useState<AppState>('loading');
  const [telegramUser, setTelegramUser] = useState(getTelegramUser());
  const [profile, setProfile] = useState<any>(null);
  const [isPremiumOpen, setIsPremiumOpen] = useState(false);

  const fetchProfile = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/user/profile?telegramId=${id}`);
      const data = await res.json();
      if (data.exists) {
        setProfile(data);
        if (data.onboardingComplete) {
          setAppState('game');
        } else {
          setAppState('onboarding');
        }
      } else {
        setAppState('onboarding');
      }
    } catch (err) {
      console.error('Failed to load profile:', err);
      setAppState('onboarding');
    }
  };

  useEffect(() => {
    const initUser = async () => {
      const user = getTelegramUser();
      
      // For local testing outside Telegram context
      if (!user.telegramId) {
        console.warn('No Telegram context — setting dev testing credentials');
        const devUser = {
          telegramId: 'dev_test_voter_1',
          username: 'dev_tester',
          firstName: 'General',
          lastName: 'Voter',
          referredByCode: '',
        };
        setTelegramUser(devUser);
        
        // Register dev user
        await fetch(`${API_BASE}/user/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(devUser),
        });

        await fetchProfile(devUser.telegramId);
        return;
      }

      setTelegramUser(user);

      try {
        // Register user (and check referral code deep link parameter)
        await fetch(`${API_BASE}/user/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            telegramId: user.telegramId,
            username: user.username,
            firstName: user.firstName,
            lastName: user.lastName,
            referredByCode: user.referredByCode,
          }),
        });

        await fetchProfile(user.telegramId);
      } catch (err) {
        console.error('Failed to register/load user status:', err);
        setAppState('onboarding');
      }
    };

    initUser();
  }, []);

  const handleOnboardingComplete = async () => {
    setAppState('loading');
    await fetchProfile(telegramUser.telegramId);
  };

  const handleProfileUpdate = (updatedProfile: any) => {
    setProfile(updatedProfile);
  };

  if (window.location.pathname === '/admin') {
    return <AdminDashboard />;
  }

  return (
    <div className="app-container">
      {appState === 'loading' && (
        <div className="loading-screen">
          <div className="loading-spinner" />
          <p className="loading-text">Loading Voter Pass...</p>
        </div>
      )}

      {appState === 'onboarding' && (
        <OnboardingFlow
          telegramId={telegramUser.telegramId}
          username={telegramUser.username}
          firstName={telegramUser.firstName}
          onComplete={handleOnboardingComplete}
        />
      )}

      {appState === 'game' && (
        <GameView
          telegramId={telegramUser.telegramId}
          profile={profile}
          onProfileUpdate={handleProfileUpdate}
          onOpenPremium={() => setIsPremiumOpen(true)}
        />
      )}

      {isPremiumOpen && (
        <PremiumOverlay
          telegramId={telegramUser.telegramId}
          onClose={() => setIsPremiumOpen(false)}
          onProfileUpdate={handleProfileUpdate}
        />
      )}
    </div>
  );
}

export default App;
