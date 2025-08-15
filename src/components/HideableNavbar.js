import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';

export default function HideableNavbar() {
  const { user, role, signOut } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [avatarUrl, setAvatarUrl] = useState(null);

  useEffect(() => {
    async function loadAvatar() {
      if (!user) return;
      const { data, error } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('username', user)
        .single();
      if (!error && data) {
        setAvatarUrl(data.avatar_url);
      }
    }
    loadAvatar();
  }, [user]);

  // Hide on login, dashboard, property list, filter, quick export, and property detail
  if (
    !user ||
    pathname === '/' ||
    pathname === '/dashboard' ||
    pathname === '/properties' ||
    pathname === '/filter' ||
    pathname === '/quick-export' ||           // ⬅️ Quick Export page (sidebar-only)
    pathname.startsWith('/property/')
  ) {
    return null;
  }

  const handleLogout = () => {
    signOut();
    navigate('/');
  };

  const acqLinks = [
    { to: '/properties', label: 'Property List' },
    { to: '/filter',     label: 'Filter Properties' },
  ];
  const assetLinks = [
    { to: '/owned-properties', label: 'Owned Properties' },
  ];

  let links = [];
  if (role === 'admin') {
    links = [...acqLinks, ...assetLinks];
    links.push({ to: '/mapping', label: 'Mapping Page' });
    links.push({ to: '/map',     label: 'All Properties Map' });
  } else if (role === 'acquisitions') {
    links = acqLinks;
    links.push({ to: '/map', label: 'All Properties Map' });
  } else if (role === 'asset_management') {
    links = assetLinks;
  }

  return (
    <nav style={{
      display: 'flex',
      padding: '12px 24px',
      backgroundColor: '#333',
      color: 'white',
      alignItems: 'center',
      justifyContent: 'space-between'
    }}>
      <div style={{ fontWeight: 'bold', fontSize: '20px' }}>
        {role === 'admin' ? 'Admin Dashboard'
         : role === 'acquisitions' ? 'Acquisitions Dashboard'
         : 'Asset Management'}
      </div>

      <div style={{ display: 'flex', gap: '16px' }}>
        {links.map((l) => (
          <Link
            key={l.to}
            to={l.to}
            style={{ color: 'white', textDecoration: 'none' }}
          >
            {l.label}
          </Link>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {avatarUrl && (
          <img
            src={avatarUrl}
            alt="Profile"
            style={{ width: '32px', height: '32px', borderRadius: '50%' }}
          />
        )}
        <button
          onClick={handleLogout}
          style={{
            background: 'transparent',
            border: '1px solid white',
            color: 'white',
            padding: '6px 12px',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Log out
        </button>
      </div>
    </nav>
  );
}
