import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import Select from 'react-select';
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';
import './PropertyFilterPage.css';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Line,
  ErrorBar
} from 'recharts';

const COLORS = ['#8884d8','#82ca9d','#ffc658','#ff7f50','#8dd1e1','#a4de6c','#d0ed57','#d8854f'];

const EXPENSE_KEYS = [
  'payroll','admin','marketing','repairs_maintenance','turnover','utilities','taxes','insurance','management_fees'
];

const LABELS = {
  payroll: 'Payroll',
  admin: 'Admin',
  marketing: 'Marketing',
  repairs_maintenance: 'Repairs & Maint.',
  turnover: 'Turnover',
  utilities: 'Utilities',
  taxes: 'Taxes',
  insurance: 'Insurance',
  management_fees: 'Mgmt Fees',
};

function formatMoney(n){
  const v = Number(n||0);
  return `$${Math.round(v).toLocaleString()}`;
}

function formatMonthYear(m, y){
  if(!m || !y) return 'T12 Total';
  const d = new Date(y, m-1);
  return d.toLocaleString('default', { month:'short', year:'numeric' });
}

// Shared <colgroup> so table columns align consistently
function ColGroup(){
  return (
    <colgroup>
      <col className="col-prop" />
      <col className="col-date" />
      {EXPENSE_KEYS.map((k) => <col key={k} className="col-num" />)}
    </colgroup>
  );
}

export default function PropertyFilterPage(){
  /* ---------- state ---------- */
  const [allExpenses, setAllExpenses] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [filteredNoUnit, setFilteredNoUnit] = useState([]);

  const [vintages, setVintages] = useState([]);
  const [types, setTypes] = useState([]);

  // State → City cascade
  const [states, setStates] = useState([]);                // ["CO","AZ",...]
  const [stateCities, setStateCities] = useState({});      // { CO:["Denver","Lakewood"], ... }
  const [selectedState, setSelectedState] = useState(null);
  const [selectedCities, setSelectedCities] = useState([]);

  const [selectedVintages, setSelectedVintages] = useState([]);
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [unitRange, setUnitRange] = useState([0, 1000]);
  const [viewMode, setViewMode] = useState('all');
  const [perUnit, setPerUnit] = useState(false);

  const [selectedCat, setSelectedCat] = useState('payroll');

  // Sidebar needs
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user, role } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState('');

  useEffect(() => {
    async function loadAvatar(){
      if(!user) return;
      const { data, error } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('username', user)
        .single();
      if(!error && data) setAvatarUrl(data.avatar_url || '');
    }
    loadAvatar();
  }, [user]);

  /* ---------- fetch ---------- */
  useEffect(() => {
    const fetchData = async () => {
      const { data, error } = await supabase
        .from('monthly_expenses')
        .select('*, properties(*)');
      if (error) return console.error(error);

      setAllExpenses(data);
      setFiltered(data);

      // basic facets
      setVintages(Array.from(new Set(data.map(r => Math.floor((r.properties.vintage_year||0)/10)*10))).filter(v => !Number.isNaN(v)));
      setTypes(Array.from(new Set(data.map(r => r.properties.property_type).filter(Boolean))));

      // build State → Cities map from "City, ST"
      const stateSet = new Set();
      const scMap = {};
      data.forEach(r => {
        const loc = r.properties?.location || '';
        const [cityRaw, stateRaw] = loc.split(',');
        const city = (cityRaw||'').trim();
        const st   = (stateRaw||'').trim();
        if(!st) return;
        stateSet.add(st);
        if(!scMap[st]) scMap[st] = new Set();
        if(city) scMap[st].add(city);
      });
      setStates(Array.from(stateSet).sort());
      setStateCities(Object.fromEntries(Object.entries(scMap).map(([st,set]) => [st, Array.from(set).sort()])));
    };
    fetchData();
  }, []);

  /* ---------- filter / view logic ---------- */
  useEffect(() => {
    let data = allExpenses.filter(r => {
      const decade = Math.floor((r.properties.vintage_year||0)/10)*10;
      const inVintage = !selectedVintages.length || selectedVintages.includes(decade);
      const inType    = !selectedTypes.length     || selectedTypes.includes(r.properties.property_type);

      const [cityRaw, stateRaw] = (r.properties.location||'').split(',');
      const rowCity  = (cityRaw||'').trim();
      const rowState = (stateRaw||'').trim();
      const stateOK  = !selectedState || rowState === selectedState;
      const cityOK   = !selectedCities.length || selectedCities.includes(rowCity);

      const units = r.properties.number_of_units || 0;
      const inUnits = units >= unitRange[0] && units <= unitRange[1];

      return inVintage && inType && stateOK && cityOK && inUnits;
    });

    if(viewMode === 't3' || viewMode === 't12'){
      const grouped = data.reduce((acc, r) => { (acc[r.property_id]??=[]).push(r); return acc; }, {});
      data = Object.values(grouped).flatMap(group => {
        const sorted = group.sort((a,b) => b.year!==a.year ? b.year-a.year : b.month-a.month);
        if(viewMode==='t3') return sorted.slice(0,3);
        const slice = sorted.slice(0,12);
        const combined = slice.reduce((acc,r) => {
          for(const k in r){
            if(typeof r[k] === 'number') acc[k] = (acc[k]||0) + r[k];
            else if(!acc[k]) acc[k] = r[k];
          }
          return acc;
        },{});
        combined.properties = slice[0].properties;
        return [combined];
      });
    }

    // capture raw filtered data (before per-unit)
    setFilteredNoUnit(data);

    if(perUnit){
      data = data.map(r => {
        const units = r.properties?.number_of_units || 1;
        const divided = {};
        for(const [k,v] of Object.entries(r)){
          divided[k] = typeof v === 'number' && !['month','year'].includes(k) ? v/units : v;
        }
        divided.properties = r.properties;
        return divided;
      });
    }

    setFiltered(data);
  }, [allExpenses, selectedVintages, selectedTypes, selectedState, selectedCities, unitRange, viewMode, perUnit]);

  /* ---------- weighted averages (per-unit, weighted by avg_sqft_unit) ---------- */
  const weightedAvg = useMemo(() => {
    const numerator = {}, denom = {};
    EXPENSE_KEYS.forEach(k => { numerator[k]=0; denom[k]=0; });
    filteredNoUnit.forEach(rec => {
      const sqft  = rec.properties?.avg_sqft_per_unit || 0;
      const units = rec.properties?.number_of_units || 1;
      EXPENSE_KEYS.forEach(k => {
        const perUnitCost = rec[k] ? rec[k]/units : 0;
        numerator[k] += perUnitCost * sqft;
        denom[k]     += sqft;
      });
    });
    return EXPENSE_KEYS.reduce((out,k)=>{
      out[k] = denom[k]>0 ? Math.round(numerator[k]/denom[k]) : 0;
      return out;
    },{});
  }, [filteredNoUnit]);

  /* ---------- pie data ---------- */
  const pieData = useMemo(() => (
    EXPENSE_KEYS.map(k => ({ name: LABELS[k], value: Math.round(filtered.reduce((s,r)=> s+(r[k]||0), 0)) }))
  ), [filtered]);

  /* ---------- box-plot data ---------- */
  const boxPlotData = useMemo(() => {
    const grouped = filtered.reduce((acc, r) => { (acc[r.properties.name]??=[]).push(r[selectedCat]||0); return acc; }, {});
    return Object.entries(grouped).map(([name, arr]) => {
      const sorted = arr.slice().sort((a,b)=>a-b);
      const len = sorted.length || 1;
      const q1 = sorted[Math.floor(0.25*(len-1))]||0;
      const median = sorted[Math.floor(0.5*(len-1))]||0;
      const q3 = sorted[Math.floor(0.75*(len-1))]||0;
      return { name, min: sorted[0]||0, Q1:q1, median, Q3:q3, max: sorted[len-1]||0 };
    });
  }, [filtered, selectedCat]);

  // build options for selects
  const stateOptions = states.map(st => ({ value: st, label: st }));
  const cityOptions  = (selectedState ? stateCities[selectedState] || [] : []).map(c => ({ value:c, label:c }));

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

  // export CSV of current table
  function downloadCSV(){
    const header = ['Property','Date', ...EXPENSE_KEYS.map(k=>LABELS[k])];
    const rows = filtered.map(r => [
      r.properties?.name,
      r.month && r.year ? `${r.month}/${r.year}` : 'T12 Total',
      ...EXPENSE_KEYS.map(k => Math.round(r[k]||0))
    ]);
    const csv = [header, ...rows].map(a=>a.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'filtered_expenses.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="pf-wrap">
      {/* Sidebar */}
      <aside className="pf-sidebar">
        <div className="pf-brand"><img src="/logo.png" className="pf-logo" alt="Trailbreak" /></div>
        <div className="pf-user">
          {avatarUrl ? (<img src={avatarUrl} className="pf-avatar" alt="Profile" />) : (<div className="pf-avatar placeholder" />)}
          <div className="pf-role">{role?.replace('_',' ') || ''}</div>
        </div>
        <nav className="pf-nav">
          {sideLinks.map((l) => (
            <button key={l.to} className={`pf-nav-item ${pathname === l.to ? 'active' : ''}`} onClick={() => navigate(l.to)}>
              {l.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <main className="pf-content">
        <header className="pf-header">
          <h1 className="pf-title">Property Filters</h1>
          <div className="pf-actions">
            <button className="btn outline" onClick={()=>{setSelectedVintages([]); setSelectedTypes([]); setSelectedState(null); setSelectedCities([]); setUnitRange([0,1000]); setViewMode('all'); setPerUnit(false);}}>Reset</button>
            <button className="btn" onClick={downloadCSV}>Export CSV</button>
          </div>
        </header>

        {/* Filters */}
        <section className="card pf-filters">
          <div className="pf-grid">
            <div className="pf-group">
              <label>Vintage Decade</label>
              <Select menuPortalTarget={document.body} menuPosition="fixed" styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }} isMulti options={vintages.map(v=>({value:v,label:`${v}s`}))} onChange={vals=>setSelectedVintages(vals.map(v=>v.value))} />
            </div>

            <div className="pf-group">
              <label>State</label>
              <Select menuPortalTarget={document.body} menuPosition="fixed" styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }} classNamePrefix="rs" isClearable options={stateOptions}
                value={selectedState ? { value:selectedState, label:selectedState } : null}
                onChange={(val)=>{ setSelectedState(val?val.value:null); setSelectedCities([]); }}
                placeholder="Select a state…" />
            </div>

            <div className="pf-group">
              <label>City</label>
              <Select menuPortalTarget={document.body} menuPosition="fixed" styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }} classNamePrefix="rs" isMulti isDisabled={!selectedState} options={cityOptions}
                value={selectedCities.map(c=>({value:c,label:c}))}
                onChange={(vals)=>setSelectedCities(vals.map(v=>v.value))}
                placeholder={selectedState ? 'Select city…' : 'Select state first…'} />
            </div>

            <div className="pf-group">
              <label>Property Type</label>
              <Select menuPortalTarget={document.body} menuPosition="fixed" styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }} isMulti options={types.map(t=>({value:t,label:t}))} onChange={vals=>setSelectedTypes(vals.map(v=>v.value))} />
            </div>

            <div className="pf-group units">
              <label>Units</label>
              <Slider range min={0} max={1000} defaultValue={[0,1000]} onAfterChange={setUnitRange} />
            </div>

            <div className="pf-group view">
              <label>View</label>
              <div className="segmented">
                {['t3','t12','all'].map(m=> (
                  <button key={m} className={`chip ${viewMode===m?'active':''}`} onClick={()=>setViewMode(m)}>{m.toUpperCase()}</button>
                ))}
                <span className="divider" />
                <button className={`chip unit ${perUnit?'active':''}`} onClick={()=>setPerUnit(p=>!p)}>Per Unit</button>
              </div>
            </div>
          </div>
        </section>

        {/* Dashboard grid */}
        <section className="pf-grid-main">
          {/* Left: Table */}
          <div className="card table-card">
            <div className="table-wrap">
              <table className="data-table">
                <ColGroup />
                <thead>
                  <tr>
                    <th>Property</th>
                    <th>Date</th>
                    {EXPENSE_KEYS.map(k => (
                      <th key={k}>{LABELS[k]}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row, idx) => (
                    <tr key={idx}>
                      <td>
                        <Link to={`/property/${row.property_id}`} className="table-link">{row.properties?.name}</Link>
                      </td>
                      <td>{formatMonthYear(row.month, row.year)}</td>
                      {EXPENSE_KEYS.map(k => (
                        <td key={k}>{formatMoney(row[k])}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right: KPIs + Pie chart */}
          <div>
            <div className="stats-grid">
              {EXPENSE_KEYS.map(k => (
                <div key={k} className="stat-box">
                  <div className="stat-label">{LABELS[k]}</div>
                  <div className="stat-value">{formatMoney(weightedAvg[k])}</div>
                </div>
              ))}
            </div>

            <div className="card chart-card">
              <h2 className="chart-title">Expense Breakdown</h2>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie dataKey="value" data={pieData} outerRadius={90} labelLine={false} label={({percent})=>`${(percent*100).toFixed(0)}%`}>
                    {pieData.map((d,i)=>(<Cell key={i} fill={COLORS[i%COLORS.length]} />))}
                  </Pie>
                  <Legend verticalAlign="middle" align="right" layout="vertical" wrapperStyle={{ fontSize: 12 }} />
                  <Tooltip formatter={v=>formatMoney(v)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        {/* Box plot section */}
        <section className="card boxplot-card">
          <div className="boxplot-header">
            <h2>Distribution by Expense Category</h2>
            <Select menuPortalTarget={document.body} menuPosition="fixed" styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }} className="boxplot-select" options={EXPENSE_KEYS.map(k=>({value:k,label:LABELS[k]}))}
                    value={{ value:selectedCat, label:LABELS[selectedCat] }} onChange={v=>setSelectedCat(v.value)} />
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={boxPlotData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" hide />
              <YAxis tickFormatter={v=>`$${(v/1000).toFixed(0)}k`} width={70} />
              <Tooltip formatter={v=>formatMoney(v)} />
              <Line type="monotone" dataKey="median" stroke="#000" dot={{ r: 3 }} strokeWidth={2} />
              <ErrorBar dataKey="Q1" width={4} stroke="#8884d8" direction="y"
                data={boxPlotData.map(d=>({ x:d.name, y:d.Q1, value:[d.min,d.Q3] }))} />
              <ErrorBar dataKey="Q3" width={4} stroke="#82ca9d" direction="y"
                data={boxPlotData.map(d=>({ x:d.name, y:d.Q3, value:[d.Q3,d.max] }))} />
            </ComposedChart>
          </ResponsiveContainer>
        </section>
      </main>
    </div>
  );
}