import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import './DashboardPage.css';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, role } = useAuth(); // `user` is your username string

  const [avatarUrl, setAvatarUrl] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showAllFeatures, setShowAllFeatures] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      if (!user) return;
      const { data, error } = await supabase
        .from('profiles')
        .select('avatar_url, username')
        .eq('username', user)
        .single();

      if (!error && data) {
        setAvatarUrl(data.avatar_url || '');
        // Use the first token of username as a friendly first name fallback
        const first = (data.username || user || '').trim().split(' ')[0];
        setDisplayName(first || 'there');
      } else {
        // graceful fallback
        const first = (user || '').trim().split(' ')[0];
        setDisplayName(first || 'there');
      }
    }
    loadProfile();
  }, [user]);

  // Primary quick actions (big cards)
// Primary quick actions (big cards)
const primaryActions = [
  { label: 'Quick Export', onClick: () => navigate('/quick-export'), hint: 'Export to Excel' },
  { label: 'Visualize Data', onClick: () => navigate('/filter'), hint: 'Go to Data Filter Page' },
  { label: 'Property List', onClick: () => navigate('/properties'), hint: 'Go to Property List page' },
];


  // All features (small buttons) pulled from your existing routes + role rules
  const allFeatures = [];
  // acquisitions
  if (role === 'acquisitions' || role === 'admin') {
    
  }
  // asset management
  if (role === 'asset_management' || role === 'admin') {
    allFeatures.push(
      { label: 'Owned Properties', to: '/owned-properties' }
    );
  }
  // admin-only
  if (role === 'admin') {
    allFeatures.push(
      { label: 'Mapping Page', to: '/mapping' }
    );
  }

  return (
    <div className="dash-wrap">
      {/* Top row: logo left, profile avatar right */}
      <header className="dash-header">
        <div className="brand">
          <img src="/logo.png" alt="Trailbreak Partners" className="logo" />
        </div>

        <div className="profile">
          {avatarUrl ? (
            <img src={avatarUrl} alt="Profile" className="avatar" />
          ) : (
            <div className="avatar placeholder" />
          )}
        </div>
      </header>

      {/* Greeting */}
      <section className="greeting">
        <h1>
          Hi, <span className="name">{displayName}</span>
        </h1>
        <div className="return">
          <span className="muted">Return to:</span>{' '}
          <button className="linklike" onClick={() => navigate('/')}>Login page</button>
        </div>
      </section>

      {/* Primary buttons */}
      <section className="primary-actions">
        {primaryActions.map((a) => (
          <button key={a.label} className="card-btn" onClick={a.onClick} aria-label={a.hint}>
            <div className="card-title">{a.label}</div>
            <div className="card-hint">{a.hint}</div>
          </button>
        ))}
      </section>

      {/* All Features */}
      <section className="all-features">
        <button className="features-trigger" onClick={() => setShowAllFeatures((s) => !s)}>
          All Features {showAllFeatures ? '▲' : '▼'}
        </button>

        {showAllFeatures && (
          <div className="more-actions">
            {allFeatures.map((f) => (
              <button key={f.to} className="card-btn" onClick={() => navigate(f.to)}>
                <div className="card-title">{f.label}</div>
                <div className="card-hint">&nbsp;</div>
              </button>
            ))}
            {allFeatures.length === 0 && (
              <div className="empty">No features available for your role yet.</div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}