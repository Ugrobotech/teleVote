import { useState, useEffect } from 'react';
import { Trophy, Award, Zap, Globe, Star } from 'lucide-react';

const API_BASE = '/api';

interface LeaderboardItem {
  _id: string;
  user: {
    username: string;
    firstName: string;
    lastName: string;
    telegramId: string;
    score: number;
  };
  candidate?: {
    name: string;
    role: string;
  };
  tapCount: number;
  isGlobal?: boolean;
}

interface LeaderboardContainerProps {
  profile: any;
}

export default function LeaderboardContainer({ profile }: LeaderboardContainerProps) {
  const user = profile?.user || {};
  const presidentialId = user.presidentialCandidate?._id;
  const gubernatorialId = user.gubernatorialCandidate?._id;

  const [activeSubTab, setActiveSubTab] = useState<'global' | 'presidential' | 'gubernatorial'>('global');
  const [loading, setLoading] = useState(true);
  const [list, setList] = useState<LeaderboardItem[]>([]);

  useEffect(() => {
    let url = `${API_BASE}/game/leaderboard`;
    
    if (activeSubTab === 'presidential' && presidentialId) {
      url = `${API_BASE}/game/leaderboard?candidateId=${presidentialId}`;
    } else if (activeSubTab === 'gubernatorial' && gubernatorialId) {
      url = `${API_BASE}/game/leaderboard?candidateId=${gubernatorialId}`;
    }

    setLoading(true);
    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        setList(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to fetch leaderboard:', err);
        setLoading(false);
      });
  }, [activeSubTab, presidentialId, gubernatorialId]);

  const getRankBadge = (index: number) => {
    switch (index) {
      case 0:
        return <span className="rank-medal gold">🥇</span>;
      case 1:
        return <span className="rank-medal silver">🥈</span>;
      case 2:
        return <span className="rank-medal bronze">🥉</span>;
      default:
        return <span className="rank-number">#{index + 1}</span>;
    }
  };

  const getDisplayName = (itemUser: any) => {
    if (!itemUser) return 'Anonymous Voter';
    if (itemUser.firstName) {
      return `${itemUser.firstName} ${itemUser.lastName || ''}`.trim();
    }
    return itemUser.username ? `@${itemUser.username}` : `User ${itemUser.telegramId?.slice(-4)}`;
  };

  return (
    <main className="main-content leaderboard-main">
      {/* Sub Tabs */}
      <div className="leaderboard-tabs">
        <button
          className={`sub-tab-btn ${activeSubTab === 'global' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('global')}
        >
          <Globe size={16} />
          Global
        </button>
        <button
          className={`sub-tab-btn ${activeSubTab === 'presidential' ? 'active' : ''} ${!presidentialId ? 'disabled' : ''}`}
          onClick={() => presidentialId && setActiveSubTab('presidential')}
          disabled={!presidentialId}
        >
          <Award size={16} />
          Presidential
        </button>
        <button
          className={`sub-tab-btn ${activeSubTab === 'gubernatorial' ? 'active' : ''} ${!gubernatorialId ? 'disabled' : ''}`}
          onClick={() => gubernatorialId && setActiveSubTab('gubernatorial')}
          disabled={!gubernatorialId}
        >
          <Zap size={16} />
          Governor
        </button>
      </div>

      {/* Leaderboard Heading */}
      <div className="leaderboard-header-section">
        <Trophy size={28} className="trophy-brand-icon" />
        {activeSubTab === 'global' && <h2>Top Nigerian Supporters</h2>}
        {activeSubTab === 'presidential' && (
          <h2>Top for {user.presidentialCandidate?.name || 'Candidate'}</h2>
        )}
        {activeSubTab === 'gubernatorial' && (
          <h2>Top for {user.gubernatorialCandidate?.name || 'Governor'}</h2>
        )}
        <p className="leaderboard-desc">
          Updated live. Keep tapping to push your candidate to the top!
        </p>
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="leaderboard-loading">
          <div className="spinner-small"></div>
          <span>Loading leaderboard...</span>
        </div>
      ) : (
        <div className="leaderboard-list">
          {list.length === 0 ? (
            <div className="leaderboard-empty">
              <Star size={36} className="empty-star" />
              <p>No taps recorded yet. Be the first!</p>
            </div>
          ) : (
            list.map((item, idx) => {
              const isCurrentUser = item.user?.telegramId === user.telegramId;
              return (
                <div
                  key={item._id || idx}
                  className={`leaderboard-item ${isCurrentUser ? 'current-user-row' : ''}`}
                >
                  <div className="item-left">
                    {getRankBadge(idx)}
                    <div className="item-name-group">
                      <span className="display-name">{getDisplayName(item.user)}</span>
                      {isCurrentUser && <span className="you-tag">YOU</span>}
                    </div>
                  </div>
                  <div className="item-right">
                    <span className="taps-value">{(item.tapCount || 0).toLocaleString()}</span>
                    <span className="taps-unit">taps</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </main>
  );
}
