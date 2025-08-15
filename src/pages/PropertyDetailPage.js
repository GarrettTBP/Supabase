import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import './PropertyDetailPage.css';

function formatMonthYear(month, year) {
  const date = new Date(year, month - 1);
  return date.toLocaleString('default', { month: 'short', year: 'numeric' });
}

function formatMoney(n) {
  if (n == null || Number.isNaN(n)) return '$0';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

// shared colgroup so totals row lines up perfectly with the main table
function ColGroup() {
  return (
    <colgroup>
      <col className="col-date" />
      <col className="col-num" />
      <col className="col-num" />
      <col className="col-num" />
      <col className="col-num" />
      <col className="col-num" />
      <col className="col-num" />
      <col className="col-num" />
      <col className="col-num" />
      <col className="col-num" />
    </colgroup>
  );
}

export default function PropertyDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user, role } = useAuth();

  const [property, setProperty] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [viewMode, setViewMode] = useState('all');
  const [perUnit, setPerUnit] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    name: '',
    property_type: '',
    location: '',
    number_of_units: '',
    vintage_year: '',
    avg_sqft_per_unit: '',
    image_url: ''
  });

  const [avatarUrl, setAvatarUrl] = useState('');

  const WEBHOOK_URL = 'https://garretttbp.app.n8n.cloud/webhook-test/update-property-webhook';

  useEffect(() => {
    fetchProperty();
    fetchExpenses();
    fetchComments();
  }, [id]);

  useEffect(() => {
    async function loadAvatar() {
      if (!user) return;
      const { data, error } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('username', user)
        .single();
      if (!error && data) setAvatarUrl(data.avatar_url || '');
    }
    loadAvatar();
  }, [user]);

  async function fetchProperty() {
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .eq('id', id)
      .single();

    if (error) console.error('Property fetch error:', error);
    else {
      setProperty(data);
      setEditData({
        name: data.name || '',
        property_type: data.property_type || '',
        location: data.location || '',
        number_of_units: data.number_of_units || '',
        vintage_year: data.vintage_year || '',
        avg_sqft_per_unit: data.avg_sqft_per_unit || '',
        image_url: data.image_url || ''
      });
    }
  }

  async function fetchExpenses() {
    const { data, error } = await supabase
      .from('monthly_expenses')
      .select('*')
      .eq('property_id', id)
      .order('year', { ascending: false })
      .order('month', { ascending: false });

    if (error) console.error('Expense fetch error:', error);
    else setExpenses(data);
  }

  async function fetchComments() {
    const { data: commentData, error: commentError } = await supabase
      .from('comments')
      .select('id, content, username, created_at')
      .eq('property_id', id)
      .order('created_at', { ascending: true });

    if (commentError) {
      console.error('Comment fetch error:', commentError);
      return;
    }

    const usernames = [...new Set(commentData.map((c) => c.username))];
    const { data: profilesData, error: profileError } = await supabase
      .from('profiles')
      .select('username, avatar_url')
      .in('username', usernames);

    if (profileError) console.error('Profile fetch error:', profileError);

    const avatarMap = (profilesData || []).reduce((acc, p) => {
      acc[p.username] = p.avatar_url;
      return acc;
    }, {});

    setComments(
      (commentData || []).map((c) => ({
        ...c,
        avatar_url: avatarMap[c.username] || null,
      }))
    );
  }

  async function handleAddComment(e) {
    e.preventDefault();
    const text = newComment.trim();
    if (!text) return;

    const { error } = await supabase
      .from('comments')
      .insert([{ property_id: id, content: text, username: user }]);

    if (error) console.error('Comment insert error:', error);
    else {
      setNewComment('');
      fetchComments();
    }
  }

  function getFilteredExpenses() {
    if (!expenses.length) return [];
    let filtered = expenses;
    if (viewMode === 't3') filtered = expenses.slice(0, 3);
    else if (viewMode === 't12') filtered = expenses.slice(0, 12);

    if (perUnit && property?.number_of_units) {
      return filtered.map((e) => {
        const divisor = property.number_of_units || 1;
        return Object.fromEntries(
          Object.entries(e).map(([key, val]) => {
            if (key === 'month' || key === 'year') return [key, val];
            return [key, typeof val === 'number' ? val / divisor : val];
          })
        );
      });
    }
    return filtered;
  }

  function handleDownloadT12() {
    if (property?.t12_url) {
      const link = document.createElement('a');
      link.href = property.t12_url;
      link.download = '';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      alert('No T12 file available for this property.');
    }
  }

  async function handleEditSave() {
    try {
      const payload = { id, ...editData };
      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (result.success) {
        setIsEditing(false);
        fetchProperty();
      } else {
        alert('Failed to update property: ' + (result.message || 'Unknown error'));
      }
    } catch (err) {
      console.error('Error posting to webhook:', err);
    }
  }

  // Sidebar nav items based on role
  const sideLinks = [];
  sideLinks.push({ label: 'Dashboard', to: '/dashboard' });
  if (role === 'acquisitions' || role === 'admin') {
    sideLinks.push(
      { label: 'Property List', to: '/properties' },
      { label: 'Filter Properties', to: '/filter' },
      { label: 'All Properties Map', to: '/map' },
    );
  }
  if (role === 'asset_management' || role === 'admin') {
    sideLinks.push({ label: 'Owned Properties', to: '/owned-properties' });
  }
  if (role === 'admin') {
    sideLinks.push({ label: 'Mapping Page', to: '/mapping' });
  }
  // Compute totals for current filtered rows when T3/T12 is active
  function getTotalsForCurrentView() {
    if (viewMode === 'all') return null;
    const rows = getFilteredExpenses();
    const keys = ['payroll','admin','marketing','repairs_maintenance','turnover','utilities','taxes','insurance','management_fees'];
    const totals = Object.fromEntries(keys.map(k => [k, rows.reduce((acc, r) => acc + (Number(r[k]) || 0), 0)]));
    return { keys, totals };
  }

  return (
    <div className="pd-wrap">
      {/* Sidebar */}
      <aside className="pd-sidebar">
        <div className="pd-brand">
          <img src="/logo.png" className="pd-logo" alt="Trailbreak" />
        </div>
        <div className="pd-user">
          {avatarUrl ? (
            <img src={avatarUrl} className="pd-avatar" alt="Profile" />
          ) : (
            <div className="pd-avatar placeholder" />
          )}
          <div className="pd-role">{role?.replace('_', ' ') || ''}</div>
        </div>

        <nav className="pd-nav">
          {sideLinks.map((l) => (
            <button
              key={l.to}
              className={`pd-nav-item ${pathname === l.to ? 'active' : ''}`}
              onClick={() => navigate(l.to)}
            >
              {l.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main */}
      <main className="pd-content">
        {!property ? (
          <div className="pd-loading">Loading property data…</div>
        ) : (
          <>
            <header className="pd-header">
              <h1 className="pd-title">{property.name}</h1>
              <div className="pd-actions">
                <button className="btn" onClick={() => setIsEditing((v) => !v)}>
                  {isEditing ? 'Cancel' : 'Edit'}
                </button>
                <button className="btn outline" onClick={handleDownloadT12}>Download T12</button>
              </div>
            </header>

            <section className="pd-hero">
              <div className="card pd-meta">
                <dl className="meta-grid">
                  <div>
                    <dt>Type</dt>
                    <dd>{property.property_type}</dd>
                  </div>
                  <div>
                    <dt>Location</dt>
                    <dd>{property.location}</dd>
                  </div>
                  <div>
                    <dt>Units</dt>
                    <dd>{property.number_of_units}</dd>
                  </div>
                  <div>
                    <dt>Vintage Year</dt>
                    <dd>{property.vintage_year}</dd>
                  </div>
                  <div>
                    <dt>Avg SqFt / Unit</dt>
                    <dd>{property.avg_sqft_per_unit}</dd>
                  </div>
                </dl>
              </div>

              {property.image_url && (
                <div className="card pd-image">
                  <img src={property.image_url} alt={property.name} />
                </div>
              )}
            </section>

            {isEditing && (
              <section className="card pd-edit">
                <h3>Edit Property</h3>
                <div className="edit-grid">
                  <input type="text" placeholder="Name" value={editData.name} onChange={(e) => setEditData({ ...editData, name: e.target.value })} />
                  <input type="text" placeholder="Type" value={editData.property_type} onChange={(e) => setEditData({ ...editData, property_type: e.target.value })} />
                  <input type="text" placeholder="Location" value={editData.location} onChange={(e) => setEditData({ ...editData, location: e.target.value })} />
                  <input type="number" placeholder="Units" value={editData.number_of_units} onChange={(e) => setEditData({ ...editData, number_of_units: e.target.value })} />
                  <input type="number" placeholder="Vintage Year" value={editData.vintage_year} onChange={(e) => setEditData({ ...editData, vintage_year: e.target.value })} />
                  <input type="number" placeholder="Avg SqFt/Unit" value={editData.avg_sqft_per_unit} onChange={(e) => setEditData({ ...editData, avg_sqft_per_unit: e.target.value })} />
                  <input type="text" placeholder="Image URL" value={editData.image_url} onChange={(e) => setEditData({ ...editData, image_url: e.target.value })} />
                </div>
                <div className="pd-edit-actions">
                  <button className="btn primary" onClick={handleEditSave}>Save Changes</button>
                </div>
              </section>
            )}

            <section className="card pd-expenses">
              <div className="section-header">
                <h2>Monthly Expenses</h2>
                <div className="segmented">
                  <button className={`chip ${viewMode === 't3' ? 'active' : ''}`} onClick={() => setViewMode('t3')}>T3</button>
                  <button className={`chip ${viewMode === 't12' ? 'active' : ''}`} onClick={() => setViewMode('t12')}>T12</button>
                  <button className={`chip ${viewMode === 'all' ? 'active' : ''}`} onClick={() => setViewMode('all')}>All</button>
                  <span className="divider" />
                  <button className={`chip unit ${perUnit ? 'active' : ''}`} onClick={() => setPerUnit((v) => !v)}>
                    Per Unit
                  </button>
                </div>
              </div>

              {viewMode !== 'all' && (() => { const t = getTotalsForCurrentView(); if (!t) return null; const x = t.totals; return ( <div className="table-wrap totals-wrap"><table className="data-table totals-table">
                  <ColGroup /><tbody><tr><th>Total {viewMode.toUpperCase()}</th><td>{formatMoney(Math.round(x.payroll||0))}</td><td>{formatMoney(Math.round(x.admin||0))}</td><td>{formatMoney(Math.round(x.marketing||0))}</td><td>{formatMoney(Math.round(x.repairs_maintenance||0))}</td><td>{formatMoney(Math.round(x.turnover||0))}</td><td>{formatMoney(Math.round(x.utilities||0))}</td><td>{formatMoney(Math.round(x.taxes||0))}</td><td>{formatMoney(Math.round(x.insurance||0))}</td><td>{formatMoney(Math.round(x.management_fees||0))}</td></tr></tbody></table></div> ); })()}

              <div className="table-wrap">
                <table className="data-table">
                  <ColGroup />
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Payroll</th>
                      <th>Admin</th>
                      <th>Marketing</th>
                      <th>Repairs & Maint.</th>
                      <th>Turnover</th>
                      <th>Utilities</th>
                      <th>Taxes</th>
                      <th>Insurance</th>
                      <th>Mgmt Fees</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getFilteredExpenses().map((row, idx) => (
                      <tr key={idx}>
                        <td>{formatMonthYear(row.month, row.year)}</td>
                        <td>{formatMoney(Math.round(row.payroll || 0))}</td>
                        <td>{formatMoney(Math.round(row.admin || 0))}</td>
                        <td>{formatMoney(Math.round(row.marketing || 0))}</td>
                        <td>{formatMoney(Math.round(row.repairs_maintenance || 0))}</td>
                        <td>{formatMoney(Math.round(row.turnover || 0))}</td>
                        <td>{formatMoney(Math.round(row.utilities || 0))}</td>
                        <td>{formatMoney(Math.round(row.taxes || 0))}</td>
                        <td>{formatMoney(Math.round(row.insurance || 0))}</td>
                        <td>{formatMoney(Math.round(row.management_fees || 0))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="card pd-comments">
              <h2>Comments</h2>
              <form onSubmit={handleAddComment} className="comment-form">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  rows={3}
                  placeholder="Leave a comment…"
                />
                <button type="submit" className="btn primary">Post Comment</button>
              </form>

              <div className="comment-list">
                {comments.map((c) => (
                  <div key={c.id} className="comment-item">
                    {c.avatar_url ? (
                      <img src={c.avatar_url} alt={c.username} className="comment-avatar" />
                    ) : (
                      <div className="comment-avatar placeholder" />)
                    }
                    <div className="comment-body">
                      <div className="comment-meta">
                        <strong>{c.username}</strong>
                        <span className="time">{new Date(c.created_at).toLocaleString()}</span>
                      </div>
                      <div className="comment-text">{c.content}</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}