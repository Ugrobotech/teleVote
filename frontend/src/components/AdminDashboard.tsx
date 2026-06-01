import React, { useState, useEffect } from 'react';
import { 
  KeyRound, 
  User, 
  FolderPlus, 
  LogOut, 
  CheckCircle2, 
  AlertCircle, 
  ShieldAlert,
  BarChart3,
  Search,
  Trophy,
  UserCheck,
  Plus,
  Edit,
  Trash2,
  ChevronDown,
  ChevronUp,
  MapPin,
  X
} from 'lucide-react';

// List of all 36 Nigerian states (excluding FCT)
const STATES_LIST = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno', 
  'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'Gombe', 'Imo', 
  'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Lagos', 
  'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers', 
  'Sokoto', 'Taraba', 'Yobe', 'Zamfara'
];

type Tab = 'candidates' | 'stats' | 'users' | 'subscribers' | 'leaderboard';

interface CandidateStats {
  _id: string;
  name: string;
  role: 'PRESIDENT' | 'GOVERNOR';
  state?: string;
  party: string;
  imageUrl: string;
  totalTaps: number;
  userCount: number;
}

export default function AdminDashboard() {
  const [username, setUsername] = useState(sessionStorage.getItem('admin_username') || '');
  const [password, setPassword] = useState(sessionStorage.getItem('admin_password') || '');
  const [isLoggedIn, setIsLoggedIn] = useState(!!sessionStorage.getItem('admin_username'));

  const [activeTab, setActiveTab] = useState<Tab>('candidates');
  const [loginError, setLoginError] = useState('');

  // Loaded data states
  const [candidates, setCandidates] = useState<CandidateStats[]>([]);
  const [subscribers, setSubscribers] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Expanded states list for Gubernatorial view
  const [expandedStates, setExpandedStates] = useState<Record<string, boolean>>({});

  // Search user states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchedUser, setSearchedUser] = useState<any>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');

  // Add/Edit Candidate Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState<CandidateStats | null>(null);

  // Form states
  const [formRole, setFormRole] = useState<'PRESIDENT' | 'GOVERNOR'>('PRESIDENT');
  const [formState, setFormState] = useState('');
  const [formName, setFormName] = useState('');
  const [formParty, setFormParty] = useState('');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [saveLoading, setSaveLoading] = useState(false);

  // Common Headers Helper
  const getHeaders = () => ({
    'Content-Type': 'application/json',
    'x-admin-username': username,
    'x-admin-password': password,
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setLoginError('Please enter both credentials.');
      return;
    }
    
    sessionStorage.setItem('admin_username', username);
    sessionStorage.setItem('admin_password', password);
    setIsLoggedIn(true);
    setLoginError('');
  };

  const handleLogout = () => {
    sessionStorage.removeItem('admin_username');
    sessionStorage.removeItem('admin_password');
    setUsername('');
    setPassword('');
    setIsLoggedIn(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('File is too large. Please select an image under 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setFormImageUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Fetch Candidates List (with stats)
  const fetchCandidates = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/game/admin/candidates', {
        headers: getHeaders(),
      });
      if (!res.ok) throw new Error('Unauthorized or failed to load candidates');
      const data = await res.json();
      setCandidates(data);
    } catch (err: any) {
      console.error(err);
      if (err.message.includes('Unauthorized')) handleLogout();
    } finally {
      setLoading(false);
    }
  };

  // Fetch Subscribers List
  const fetchSubscribers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/user/admin/subscribers', {
        headers: getHeaders(),
      });
      if (!res.ok) throw new Error('Failed to load subscribers');
      const data = await res.json();
      setSubscribers(data.subscribers || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Leaderboard
  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/game/leaderboard');
      const data = await res.json();
      setLeaderboard(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Trigger loading based on active tab
  useEffect(() => {
    if (!isLoggedIn) return;
    if (activeTab === 'candidates' || activeTab === 'stats') {
      fetchCandidates();
    } else if (activeTab === 'subscribers') {
      fetchSubscribers();
    } else if (activeTab === 'leaderboard') {
      fetchLeaderboard();
    }
  }, [activeTab, isLoggedIn]);

  // Search User
  const handleUserSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearchLoading(true);
    setSearchError('');
    setSearchedUser(null);

    try {
      const res = await fetch(`/api/user/admin/search?username=${searchQuery.trim()}`, {
        headers: getHeaders(),
      });
      if (!res.ok) throw new Error('Failed to search user.');
      const data = await res.json();
      if (!data.found) {
        setSearchError(`No user found with username "${searchQuery}"`);
      } else {
        setSearchedUser(data);
      }
    } catch (err: any) {
      setSearchError(err.message || 'Error occurred.');
    } finally {
      setSearchLoading(false);
    }
  };

  // Create Candidate
  const handleAddCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!formName.trim() || !formParty.trim() || !formImageUrl.trim()) {
      return setFormError('All fields are required.');
    }
    if (formRole === 'GOVERNOR' && !formState.trim()) {
      return setFormError('State is required for Gubernatorial candidates.');
    }

    setSaveLoading(true);
    try {
      const res = await fetch('/api/game/candidate', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          name: formName.trim(),
          role: formRole,
          state: formRole === 'GOVERNOR' ? formState.trim() : undefined,
          party: formParty.trim().toUpperCase(),
          imageUrl: formImageUrl.trim(),
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Failed to create candidate.');
      }

      setFormSuccess('Candidate created successfully!');
      setFormName('');
      setFormParty('');
      setFormImageUrl('');
      fetchCandidates();
      setTimeout(() => {
        setShowAddModal(false);
        setFormSuccess('');
      }, 1500);
    } catch (err: any) {
      setFormError(err.message || 'Failed.');
    } finally {
      setSaveLoading(false);
    }
  };

  // Open Edit Modal
  const openEditModal = (c: CandidateStats) => {
    setEditingCandidate(c);
    setFormName(c.name);
    setFormParty(c.party);
    setFormImageUrl(c.imageUrl);
    setFormRole(c.role);
    setFormState(c.state || '');
    setFormError('');
    setFormSuccess('');
    setShowEditModal(true);
  };

  // Save Edit Candidate
  const handleEditCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCandidate) return;

    setFormError('');
    setFormSuccess('');

    if (!formName.trim() || !formParty.trim() || !formImageUrl.trim()) {
      return setFormError('All fields are required.');
    }

    setSaveLoading(true);
    try {
      const res = await fetch(`/api/game/candidate/${editingCandidate._id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({
          name: formName.trim(),
          party: formParty.trim().toUpperCase(),
          imageUrl: formImageUrl.trim(),
          state: formRole === 'GOVERNOR' ? formState : undefined,
        }),
      });

      if (!res.ok) throw new Error('Failed to update candidate.');

      setFormSuccess('Candidate updated successfully!');
      fetchCandidates();
      setTimeout(() => {
        setShowEditModal(false);
        setEditingCandidate(null);
        setFormSuccess('');
      }, 1500);
    } catch (err: any) {
      setFormError(err.message || 'Failed.');
    } finally {
      setSaveLoading(false);
    }
  };

  // Delete Candidate
  const handleDeleteCandidate = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;

    try {
      const res = await fetch(`/api/game/candidate/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      if (!res.ok) throw new Error('Failed to delete candidate.');
      alert('Candidate deleted successfully!');
      fetchCandidates();
    } catch (err: any) {
      alert(err.message || 'Error deleting candidate.');
    }
  };

  const toggleStateExpand = (state: string) => {
    setExpandedStates(prev => ({
      ...prev,
      [state]: !prev[state]
    }));
  };

  const getCandidatesByRole = (role: 'PRESIDENT') => {
    return candidates.filter(c => c.role === role);
  };

  const getCandidatesByState = (state: string) => {
    return candidates.filter(c => c.role === 'GOVERNOR' && c.state?.toLowerCase() === state.toLowerCase());
  };

  if (!isLoggedIn) {
    return (
      <div className="main-content" style={{ display: 'flex', minHeight: '100vh', justifyContent: 'center', alignItems: 'center' }}>
        <div style={{
          width: '100%',
          maxWidth: '400px',
          padding: '2.5rem 2rem',
          background: 'var(--bg-card)',
          borderRadius: '16px',
          border: '1px solid var(--glass-border)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          textAlign: 'center'
        }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'var(--glass)',
            border: '1px solid var(--glass-border)',
            marginBottom: '1.5rem',
            color: 'var(--primary-light)'
          }}>
            <ShieldAlert size={32} />
          </div>

          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, margin: '0 0 0.5rem', color: '#fff' }}>
            Voter Pass <span className="green-text">Admin</span>
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '2rem' }}>
            Authenticate to access dashboard
          </p>

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', textAlign: 'left' }}>
            <div>
              <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem', letterSpacing: '0.5px' }}>
                Admin Username
              </label>
              <div style={{ position: 'relative' }}>
                <User size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  style={{
                    width: '100%',
                    padding: '0.8rem 1rem 0.8rem 2.5rem',
                    background: 'rgba(0,0,0,0.2)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: '8px',
                    color: '#fff',
                    outline: 'none',
                    fontSize: '0.95rem',
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem', letterSpacing: '0.5px' }}>
                Admin Password
              </label>
              <div style={{ position: 'relative' }}>
                <KeyRound size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  style={{
                    width: '100%',
                    padding: '0.8rem 1rem 0.8rem 2.5rem',
                    background: 'rgba(0,0,0,0.2)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: '8px',
                    color: '#fff',
                    outline: 'none',
                    fontSize: '0.95rem',
                  }}
                />
              </div>
            </div>

            {loginError && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0.8rem', borderRadius: '8px', background: 'rgba(231, 76, 60, 0.1)', border: '1px solid rgba(231, 76, 60, 0.2)', color: 'var(--danger)', fontSize: '0.85rem' }}>
                <AlertCircle size={16} />
                <span>{loginError}</span>
              </div>
            )}

            <button
              type="submit"
              style={{
                width: '100%',
                padding: '0.9rem',
                background: 'var(--primary)',
                border: 'none',
                borderRadius: '8px',
                color: '#fff',
                fontWeight: 700,
                fontSize: '1rem',
                cursor: 'pointer',
              }}
            >
              Sign In
            </button>
          </form>
        </div>
      </div>
    );
  }
  return (
    <div className="admin-wrapper">
      {/* HEADER */}
      <header className="admin-header">
        <h1 className="title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <ShieldAlert className="green-text" size={24} />
          <span>Voter Pass <span className="green-text">Console</span></span>
        </h1>
        
        <div className="admin-header-info">
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Logged in as: <strong>{username}</strong></span>
          <button
            onClick={handleLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(231, 76, 60, 0.1)',
              border: '1px solid rgba(231, 76, 60, 0.2)',
              borderRadius: '6px',
              color: 'var(--danger)',
              padding: '0.4rem 0.8rem',
              fontSize: '0.8rem',
              fontWeight: 650,
              cursor: 'pointer',
            }}
          >
            <LogOut size={13} />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* BODY CONTENT WITH SIDEBAR ROUTING */}
      <div className="admin-container">
        {/* SIDEBAR NAVIGATION */}
        <aside className="admin-sidebar">
          <button 
            className={`nav-tab-btn ${activeTab === 'candidates' ? 'active' : ''}`}
            onClick={() => setActiveTab('candidates')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              width: '100%',
              padding: '0.8rem 1rem',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'candidates' ? 'var(--primary)' : 'transparent',
              color: activeTab === 'candidates' ? '#fff' : 'var(--text-muted)',
              textAlign: 'left',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <FolderPlus size={18} />
            <span>Candidates</span>
          </button>
          
          <button 
            className={`nav-tab-btn ${activeTab === 'stats' ? 'active' : ''}`}
            onClick={() => setActiveTab('stats')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              width: '100%',
              padding: '0.8rem 1rem',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'stats' ? 'var(--primary)' : 'transparent',
              color: activeTab === 'stats' ? '#fff' : 'var(--text-muted)',
              textAlign: 'left',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <BarChart3 size={18} />
            <span>Statistics</span>
          </button>

          <button 
            className={`nav-tab-btn ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              width: '100%',
              padding: '0.8rem 1rem',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'users' ? 'var(--primary)' : 'transparent',
              color: activeTab === 'users' ? '#fff' : 'var(--text-muted)',
              textAlign: 'left',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <Search size={18} />
            <span>User Lookup</span>
          </button>

          <button 
            className={`nav-tab-btn ${activeTab === 'subscribers' ? 'active' : ''}`}
            onClick={() => setActiveTab('subscribers')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              width: '100%',
              padding: '0.8rem 1rem',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'subscribers' ? 'var(--primary)' : 'transparent',
              color: activeTab === 'subscribers' ? '#fff' : 'var(--text-muted)',
              textAlign: 'left',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <UserCheck size={18} />
            <span>Subscribers</span>
          </button>

          <button 
            className={`nav-tab-btn ${activeTab === 'leaderboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('leaderboard')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              width: '100%',
              padding: '0.8rem 1rem',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'leaderboard' ? 'var(--primary)' : 'transparent',
              color: activeTab === 'leaderboard' ? '#fff' : 'var(--text-muted)',
              textAlign: 'left',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <Trophy size={18} />
            <span>Leaderboard</span>
          </button>
        </aside>

        {/* WORKSPACE VIEW PANEL */}
        <main className="admin-workspace">
          {loading && (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
              <div className="loading-spinner" />
            </div>
          )}

          {!loading && (
            <>
              {/* TAB 1: CANDIDATES MANAGEMENT */}
              {activeTab === 'candidates' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>Candidate Registry</h2>
                    <button
                      onClick={() => {
                        setFormRole('PRESIDENT');
                        setFormName('');
                        setFormParty('');
                        setFormImageUrl('');
                        setFormState('');
                        setFormError('');
                        setFormSuccess('');
                        setShowAddModal(true);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: 'var(--primary)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '0.6rem 1.2rem',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                      }}
                    >
                      <Plus size={16} />
                      <span>Add Candidate</span>
                    </button>
                  </div>

                  {/* 1A. Presidential Category */}
                  <div style={{ background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--glass-border)', padding: '1.5rem', marginBottom: '2rem' }}>
                    <h3 style={{ margin: '0 0 1rem', fontSize: '1.1rem', fontWeight: 700, borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>
                      🇳🇬 Presidential Candidates
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                      {getCandidatesByRole('PRESIDENT').map(c => (
                        <div key={c._id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)' }}>
                          <img src={c.imageUrl || 'https://via.placeholder.com/60'} alt={c.name} style={{ width: '50px', height: '50px', borderRadius: '50%', objectFit: 'cover', background: '#333' }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--accent)', fontWeight: 800 }}>{c.party}</div>
                          </div>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button onClick={() => openEditModal(c)} style={{ padding: '6px', border: 'none', borderRadius: '4px', background: 'var(--glass)', color: 'var(--text-muted)', cursor: 'pointer' }}><Edit size={14} /></button>
                            <button onClick={() => handleDeleteCandidate(c._id, c.name)} style={{ padding: '6px', border: 'none', borderRadius: '4px', background: 'rgba(231, 76, 60, 0.1)', color: 'var(--danger)', cursor: 'pointer' }}><Trash2 size={14} /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 1B. Gubernatorial Category */}
                  <div style={{ background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--glass-border)', padding: '1.5rem' }}>
                    <h3 style={{ margin: '0 0 1rem', fontSize: '1.1rem', fontWeight: 700, borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>
                      🏛️ Gubernatorial Candidates (35 States, Excl. FCT)
                    </h3>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                      {STATES_LIST.map(state => {
                        const stateCandidates = getCandidatesByState(state);
                        const isExpanded = !!expandedStates[state];
                        return (
                          <div key={state} style={{ borderRadius: '8px', border: '1px solid var(--glass-border)', overflow: 'hidden' }}>
                            <div 
                              onClick={() => toggleStateExpand(state)}
                              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.8rem 1.2rem', background: isExpanded ? 'rgba(0,135,83,0.05)' : 'transparent', cursor: 'pointer' }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700 }}>
                                <MapPin size={16} className="green-text" />
                                <span>{state} State</span>
                                <span style={{ fontSize: '0.75rem', background: 'var(--glass)', color: 'var(--text-muted)', padding: '2px 8px', borderRadius: '10px' }}>
                                  {stateCandidates.length} Candidates
                                </span>
                              </div>
                              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </div>

                            {isExpanded && (
                              <div style={{ padding: '1rem', background: 'rgba(0,0,0,0.1)', borderTop: '1px solid var(--glass-border)', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
                                {stateCandidates.map(c => (
                                  <div key={c._id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px', borderRadius: '6px', background: 'var(--bg-card)', border: '1px solid var(--glass-border)' }}>
                                    <img src={c.imageUrl || 'https://via.placeholder.com/50'} alt={c.name} style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                                      <div style={{ fontSize: '0.7rem', color: 'var(--accent)', fontWeight: 800 }}>{c.party}</div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '4px' }}>
                                      <button onClick={() => openEditModal(c)} style={{ padding: '4px', border: 'none', borderRadius: '4px', background: 'var(--glass)', color: 'var(--text-muted)', cursor: 'pointer' }}><Edit size={12} /></button>
                                      <button onClick={() => handleDeleteCandidate(c._id, c.name)} style={{ padding: '4px', border: 'none', borderRadius: '4px', background: 'rgba(231, 76, 60, 0.1)', color: 'var(--danger)', cursor: 'pointer' }}><Trash2 size={12} /></button>
                                    </div>
                                  </div>
                                ))}

                                <button
                                  onClick={() => {
                                    setFormRole('GOVERNOR');
                                    setFormState(state);
                                    setFormName('');
                                    setFormParty('');
                                    setFormImageUrl('');
                                    setFormError('');
                                    setFormSuccess('');
                                    setShowAddModal(true);
                                  }}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px',
                                    border: '1px dashed var(--glass-border)',
                                    borderRadius: '6px',
                                    background: 'transparent',
                                    color: 'var(--text-muted)',
                                    cursor: 'pointer',
                                    height: '62px',
                                    fontSize: '0.8rem',
                                    fontWeight: 650
                                  }}
                                >
                                  <Plus size={14} />
                                  <span>Add Candidate for {state}</span>
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: CANDIDATE STATISTICS */}
              {activeTab === 'stats' && (
                <div style={{ background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--glass-border)', padding: '1.5rem' }}>
                  <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0 0 1.5rem' }}>Candidate Support Statistics</h2>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--glass-border)', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase' }}>
                          <th style={{ padding: '12px' }}>Candidate</th>
                          <th style={{ padding: '12px' }}>Role / State</th>
                          <th style={{ padding: '12px' }}>Party</th>
                          <th style={{ padding: '12px', textAlign: 'right' }}>Total Taps</th>
                          <th style={{ padding: '12px', textAlign: 'right' }}>Users Selecting</th>
                        </tr>
                      </thead>
                      <tbody>
                        {candidates.sort((a,b) => b.totalTaps - a.totalTaps).map(c => (
                          <tr key={c._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)', fontSize: '0.9rem' }}>
                            <td style={{ padding: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <img src={c.imageUrl || 'https://via.placeholder.com/30'} alt={c.name} style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} />
                              <strong style={{ color: '#fff' }}>{c.name}</strong>
                            </td>
                            <td style={{ padding: '12px', color: 'var(--text-muted)' }}>
                              {c.role === 'PRESIDENT' ? 'Presidential' : `${c.state} Governor`}
                            </td>
                            <td style={{ padding: '12px', color: 'var(--accent)', fontWeight: 700 }}>{c.party}</td>
                            <td style={{ padding: '12px', textAlign: 'right', fontWeight: 800, color: 'var(--primary-light)' }}>
                              {c.totalTaps.toLocaleString()}
                            </td>
                            <td style={{ padding: '12px', textAlign: 'right', fontWeight: 700, color: '#fff' }}>
                              {c.userCount.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 3: USER SEARCH / LOOKUP */}
              {activeTab === 'users' && (
                <div>
                  <div style={{ background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--glass-border)', padding: '1.5rem', marginBottom: '2rem' }}>
                    <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0 0 1rem' }}>User Profile Lookup</h2>
                    
                    <form onSubmit={handleUserSearch} style={{ display: 'flex', gap: '10px' }}>
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Enter Telegram username (without @)"
                        style={{
                          flex: 1,
                          padding: '0.8rem 1rem',
                          background: 'rgba(0,0,0,0.2)',
                          border: '1px solid var(--glass-border)',
                          borderRadius: '8px',
                          color: '#fff',
                          outline: 'none',
                          fontSize: '0.95rem',
                        }}
                      />
                      <button
                        type="submit"
                        disabled={searchLoading}
                        style={{
                          background: 'var(--primary)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '0 1.5rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        {searchLoading ? 'Searching...' : 'Search'}
                      </button>
                    </form>

                    {searchError && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0.8rem', borderRadius: '8px', background: 'rgba(231, 76, 60, 0.1)', border: '1px solid rgba(231, 76, 60, 0.2)', color: 'var(--danger)', fontSize: '0.85rem', marginTop: '1rem' }}>
                        <AlertCircle size={16} />
                        <span>{searchError}</span>
                      </div>
                    )}
                  </div>

                  {searchedUser && (
                    <div className="admin-grid">
                      {/* Left: profile details */}
                      <div style={{ background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--glass-border)', padding: '1.5rem' }}>
                        <h3 style={{ margin: '0 0 1rem', fontSize: '1.1rem', fontWeight: 700, borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>
                          Voter Profile Details
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', fontSize: '0.95rem' }}>
                          <div>Username: <strong style={{ color: '#fff' }}>@{searchedUser.user.username || 'N/A'}</strong></div>
                          <div>Full Name: <strong style={{ color: '#fff' }}>{searchedUser.user.firstName} {searchedUser.user.lastName}</strong></div>
                          <div>Telegram ID: <strong style={{ color: 'var(--text-muted)' }}>{searchedUser.user.telegramId}</strong></div>
                          <div>Home State: <strong style={{ color: '#fff' }}>{searchedUser.user.state || 'Not Complete'}</strong></div>
                          <div>Total Taps contribution: <strong style={{ color: 'var(--accent)' }}>{searchedUser.user.score.toLocaleString()} PTS</strong></div>
                          <div>Premium Membership: <strong style={{ color: searchedUser.user.isSubscriber ? 'var(--accent)' : 'var(--text-muted)' }}>{searchedUser.user.isSubscriber ? '⭐️ SUBSCRIBER' : 'FREE'}</strong></div>
                          <div>Referred By ID: <strong style={{ color: 'var(--text-muted)' }}>{searchedUser.user.referredBy || 'Direct Registration'}</strong></div>
                          <div>Referral Code: <strong>{searchedUser.user.referralCode}</strong></div>
                        </div>

                        <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--glass-border)', paddingTop: '1rem' }}>
                          <h4 style={{ margin: '0 0 0.8rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Selected Representatives</h4>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                            <div>President: <strong>{searchedUser.presidentialCandidate?.name || 'Not Selected'}</strong> {searchedUser.presidentialCandidate?.party && `(${searchedUser.presidentialCandidate?.party})`}</div>
                            <div>Governor: <strong>{searchedUser.gubernatorialCandidate?.name || 'Not Selected'}</strong> {searchedUser.gubernatorialCandidate?.party && `(${searchedUser.gubernatorialCandidate?.party})`}</div>
                          </div>
                        </div>
                      </div>

                      {/* Right: referred friends list */}
                      <div style={{ background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--glass-border)', padding: '1.5rem' }}>
                        <h3 style={{ margin: '0 0 1rem', fontSize: '1.1rem', fontWeight: 700, borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>
                          Referred Friends ({searchedUser.friends?.length || 0})
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', maxHeight: '350px', overflowY: 'auto' }}>
                          {searchedUser.friends?.map((f: any) => (
                            <div key={f._id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'rgba(0,0,0,0.15)', borderRadius: '6px', border: '1px solid var(--glass-border)' }}>
                              <div>
                                <span style={{ fontWeight: 650 }}>@{f.username || 'no_username'}</span>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '10px' }}>({f.firstName})</span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem' }}>
                                <span style={{ fontWeight: 750, color: 'var(--accent)' }}>{f.score.toLocaleString()} PTS</span>
                                {f.isSubscriber && <span style={{ color: 'var(--accent)', fontSize: '0.7rem' }}>⭐️</span>}
                              </div>
                            </div>
                          ))}
                          {(!searchedUser.friends || searchedUser.friends.length === 0) && (
                            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No referrals yet.</div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: SUBSCRIBERS LIST */}
              {activeTab === 'subscribers' && (
                <div style={{ background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--glass-border)', padding: '1.5rem' }}>
                  <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0 0 1.5rem' }}>Subscribed Premium Users ({subscribers.length})</h2>
                  
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--glass-border)', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase' }}>
                          <th style={{ padding: '12px' }}>Username</th>
                          <th style={{ padding: '12px' }}>Name</th>
                          <th style={{ padding: '12px' }}>Telegram ID</th>
                          <th style={{ padding: '12px', textAlign: 'right' }}>Total Taps Score</th>
                          <th style={{ padding: '12px', textAlign: 'right' }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {subscribers.map((s, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)', fontSize: '0.9rem' }}>
                            <td style={{ padding: '12px', color: 'var(--accent)', fontWeight: 700 }}>
                              @{s.username || 'N/A'}
                            </td>
                            <td style={{ padding: '12px', color: '#fff' }}>{s.firstName} {s.lastName}</td>
                            <td style={{ padding: '12px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{s.telegramId}</td>
                            <td style={{ padding: '12px', textAlign: 'right', fontWeight: 800, color: 'var(--primary-light)' }}>
                              {s.score?.toLocaleString()} PTS
                            </td>
                            <td style={{ padding: '12px', textAlign: 'right' }}>
                              <span style={{ fontSize: '0.75rem', background: 'rgba(242,169,0,0.1)', color: 'var(--accent)', padding: '3px 8px', borderRadius: '4px', fontWeight: 700 }}>
                                ⭐️ ACTIVE
                              </span>
                            </td>
                          </tr>
                        ))}
                        {subscribers.length === 0 && (
                          <tr>
                            <td colSpan={5} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No subscribed premium users found.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 5: GLOBAL LEADERBOARD */}
              {activeTab === 'leaderboard' && (
                <div style={{ background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--glass-border)', padding: '1.5rem' }}>
                  <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0 0 1.5rem' }}>Global User Leaderboard (Top 100)</h2>
                  
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--glass-border)', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase' }}>
                          <th style={{ padding: '12px' }}>Rank</th>
                          <th style={{ padding: '12px' }}>Username</th>
                          <th style={{ padding: '12px' }}>Name</th>
                          <th style={{ padding: '12px', textAlign: 'right' }}>Total Taps Score</th>
                        </tr>
                      </thead>
                      <tbody>
                        {leaderboard.map((l, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)', fontSize: '0.9rem' }}>
                            <td style={{ padding: '12px', fontWeight: 800, color: idx < 3 ? 'var(--accent)' : 'var(--text-muted)' }}>
                              #{idx + 1}
                            </td>
                            <td style={{ padding: '12px', color: '#fff' }}>
                              @{l.user?.username || 'N/A'}
                            </td>
                            <td style={{ padding: '12px', color: 'var(--text-muted)' }}>{l.user?.firstName} {l.user?.lastName}</td>
                            <td style={{ padding: '12px', textAlign: 'right', fontWeight: 800, color: 'var(--primary-light)' }}>
                              {l.tapCount?.toLocaleString()} PTS
                            </td>
                          </tr>
                        ))}
                        {leaderboard.length === 0 && (
                          <tr>
                            <td colSpan={4} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No leaderboard entries found.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* ==================== ADD CANDIDATE MODAL OVERLAY ==================== */}
      {showAddModal && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-content">
            <button 
              onClick={() => setShowAddModal(false)}
              style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>

            <h3 style={{ margin: '0 0 1.5rem', fontSize: '1.3rem', fontWeight: 800 }}>Register New Candidate</h3>

            <form onSubmit={handleAddCandidate} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              <div>
                <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.4rem' }}>Election Category</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <button 
                    type="button" 
                    onClick={() => setFormRole('PRESIDENT')} 
                    style={{ padding: '0.6rem', borderRadius: '6px', border: formRole === 'PRESIDENT' ? '2px solid var(--primary)' : '1px solid var(--glass-border)', background: formRole === 'PRESIDENT' ? 'rgba(0,135,83,0.1)' : 'transparent', color: formRole === 'PRESIDENT' ? 'var(--primary-light)' : 'var(--text-muted)', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Presidential
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setFormRole('GOVERNOR')} 
                    style={{ padding: '0.6rem', borderRadius: '6px', border: formRole === 'GOVERNOR' ? '2px solid var(--primary)' : '1px solid var(--glass-border)', background: formRole === 'GOVERNOR' ? 'rgba(0,135,83,0.1)' : 'transparent', color: formRole === 'GOVERNOR' ? 'var(--primary-light)' : 'var(--text-muted)', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Gubernatorial
                  </button>
                </div>
              </div>

              {formRole === 'GOVERNOR' && (
                <div>
                  <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.4rem' }}>State</label>
                  <select
                    value={formState}
                    onChange={(e) => setFormState(e.target.value)}
                    style={{ width: '100%', padding: '0.7rem 1rem', background: '#0a0a0a', border: '1px solid var(--glass-border)', borderRadius: '6px', color: '#fff', outline: 'none' }}
                  >
                    <option value="">-- Select State --</option>
                    {STATES_LIST.map(st => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.4rem' }}>Candidate Name</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Enter full name"
                  style={{ width: '100%', padding: '0.7rem 1rem', background: '#0a0a0a', border: '1px solid var(--glass-border)', borderRadius: '6px', color: '#fff', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.4rem' }}>Political Party</label>
                <input
                  type="text"
                  value={formParty}
                  onChange={(e) => setFormParty(e.target.value)}
                  placeholder="e.g. APC, PDP, LP"
                  style={{ width: '100%', padding: '0.7rem 1rem', background: '#0a0a0a', border: '1px solid var(--glass-border)', borderRadius: '6px', color: '#fff', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.4rem' }}>Candidate Photo</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                    id="add-candidate-file-input"
                  />
                  <label 
                    htmlFor="add-candidate-file-input"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      padding: '0.8rem',
                      borderRadius: '6px',
                      border: '1px dashed var(--glass-border)',
                      background: 'rgba(255,255,255,0.01)',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      textAlign: 'center',
                    }}
                  >
                    <span>Choose Photo File 📸</span>
                  </label>

                  {formImageUrl && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 10px', background: 'rgba(0,0,0,0.2)', borderRadius: '6px', border: '1px solid var(--glass-border)' }}>
                      <img src={formImageUrl} alt="Preview" style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }} />
                      <span style={{ fontSize: '0.75rem', color: 'var(--primary-light)', fontWeight: 650, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                        {formImageUrl.startsWith('data:') ? 'Image uploaded (Base64)' : formImageUrl}
                      </span>
                      <button 
                        type="button" 
                        onClick={() => setFormImageUrl('')}
                        style={{ border: 'none', background: 'transparent', color: 'var(--danger)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700 }}
                      >
                        Remove
                      </button>
                    </div>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ height: '1px', flex: 1, background: 'var(--glass-border)' }} />
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Or Paste Image URL</span>
                    <div style={{ height: '1px', flex: 1, background: 'var(--glass-border)' }} />
                  </div>

                  <input
                    type="text"
                    value={formImageUrl.startsWith('data:') ? '' : formImageUrl}
                    onChange={(e) => setFormImageUrl(e.target.value)}
                    placeholder="Paste direct HTTP/HTTPS link"
                    style={{ width: '100%', padding: '0.7rem 1rem', background: '#0a0a0a', border: '1px solid var(--glass-border)', borderRadius: '6px', color: '#fff', outline: 'none', fontSize: '0.9rem' }}
                  />
                </div>
              </div>

              {formError && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0.6rem', borderRadius: '6px', background: 'rgba(231, 76, 60, 0.1)', border: '1px solid rgba(231, 76, 60, 0.2)', color: 'var(--danger)', fontSize: '0.8rem' }}>
                  <AlertCircle size={14} />
                  <span>{formError}</span>
                </div>
              )}

              {formSuccess && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0.6rem', borderRadius: '6px', background: 'rgba(0,135,83,0.1)', border: '1px solid rgba(0,135,83,0.2)', color: 'var(--primary-light)', fontSize: '0.8rem' }}>
                  <CheckCircle2 size={14} />
                  <span>{formSuccess}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={saveLoading}
                style={{ 
                  width: '100%', 
                  padding: '0.8rem', 
                  background: saveLoading ? 'var(--text-muted)' : 'var(--primary)', 
                  border: 'none', 
                  borderRadius: '6px', 
                  color: '#fff', 
                  fontWeight: 700, 
                  cursor: saveLoading ? 'not-allowed' : 'pointer', 
                  marginTop: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                {saveLoading ? (
                  <>
                    <span className="spinner-small" style={{ borderTopColor: '#fff', width: '16px', height: '16px' }} />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Submit Candidate</span>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ==================== EDIT CANDIDATE MODAL OVERLAY ==================== */}
      {showEditModal && editingCandidate && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-content">
            <button 
              onClick={() => {
                setShowEditModal(false);
                setEditingCandidate(null);
              }}
              style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>

            <h3 style={{ margin: '0 0 1.5rem', fontSize: '1.3rem', fontWeight: 800 }}>Edit Candidate Details</h3>

            <form onSubmit={handleEditCandidate} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', margin: 0 }}>Candidate Name</label>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Old: <strong style={{ color: '#fff' }}>{editingCandidate.name}</strong></span>
                </div>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Enter full name"
                  style={{ width: '100%', padding: '0.7rem 1rem', background: '#0a0a0a', border: '1px solid var(--glass-border)', borderRadius: '6px', color: '#fff', outline: 'none' }}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', margin: 0 }}>Political Party</label>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Old: <strong style={{ color: '#fff' }}>{editingCandidate.party}</strong></span>
                </div>
                <input
                  type="text"
                  value={formParty}
                  onChange={(e) => setFormParty(e.target.value)}
                  placeholder="e.g. APC, PDP, LP"
                  style={{ width: '100%', padding: '0.7rem 1rem', background: '#0a0a0a', border: '1px solid var(--glass-border)', borderRadius: '6px', color: '#fff', outline: 'none' }}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', margin: 0 }}>Candidate Photo</label>
                  {editingCandidate.imageUrl && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Old:</span>
                      <img src={editingCandidate.imageUrl} alt="Old" style={{ width: '20px', height: '20px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--glass-border)', background: '#333' }} />
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                    id="edit-candidate-file-input"
                  />
                  <label 
                    htmlFor="edit-candidate-file-input"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      padding: '0.8rem',
                      borderRadius: '6px',
                      border: '1px dashed var(--glass-border)',
                      background: 'rgba(255,255,255,0.01)',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      textAlign: 'center',
                    }}
                  >
                    <span>Choose Photo File 📸</span>
                  </label>

                  {formImageUrl && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 10px', background: 'rgba(0,0,0,0.2)', borderRadius: '6px', border: '1px solid var(--glass-border)' }}>
                      <img src={formImageUrl} alt="Preview" style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }} />
                      <span style={{ fontSize: '0.75rem', color: 'var(--primary-light)', fontWeight: 650, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                        {formImageUrl.startsWith('data:') ? 'Image uploaded (Base64)' : formImageUrl}
                      </span>
                      <button 
                        type="button" 
                        onClick={() => setFormImageUrl('')}
                        style={{ border: 'none', background: 'transparent', color: 'var(--danger)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700 }}
                      >
                        Remove
                      </button>
                    </div>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ height: '1px', flex: 1, background: 'var(--glass-border)' }} />
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Or Paste Image URL</span>
                    <div style={{ height: '1px', flex: 1, background: 'var(--glass-border)' }} />
                  </div>

                  <input
                    type="text"
                    value={formImageUrl.startsWith('data:') ? '' : formImageUrl}
                    onChange={(e) => setFormImageUrl(e.target.value)}
                    placeholder="Paste direct HTTP/HTTPS link"
                    style={{ width: '100%', padding: '0.7rem 1rem', background: '#0a0a0a', border: '1px solid var(--glass-border)', borderRadius: '6px', color: '#fff', outline: 'none', fontSize: '0.9rem' }}
                  />
                </div>
              </div>

              {formError && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0.6rem', borderRadius: '6px', background: 'rgba(231, 76, 60, 0.1)', border: '1px solid rgba(231, 76, 60, 0.2)', color: 'var(--danger)', fontSize: '0.8rem' }}>
                  <AlertCircle size={14} />
                  <span>{formError}</span>
                </div>
              )}

              {formSuccess && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0.6rem', borderRadius: '6px', background: 'rgba(0,135,83,0.1)', border: '1px solid rgba(0,135,83,0.2)', color: 'var(--primary-light)', fontSize: '0.8rem' }}>
                  <CheckCircle2 size={14} />
                  <span>{formSuccess}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={saveLoading}
                style={{ 
                  width: '100%', 
                  padding: '0.8rem', 
                  background: saveLoading ? 'var(--text-muted)' : 'var(--primary)', 
                  border: 'none', 
                  borderRadius: '6px', 
                  color: '#fff', 
                  fontWeight: 700, 
                  cursor: saveLoading ? 'not-allowed' : 'pointer', 
                  marginTop: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                {saveLoading ? (
                  <>
                    <span className="spinner-small" style={{ borderTopColor: '#fff', width: '16px', height: '16px' }} />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Save Changes</span>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
