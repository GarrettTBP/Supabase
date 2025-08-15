import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Select from 'react-select';
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';
import ExcelJS from 'exceljs';
import './QuickExportPage.css';

const MONEY_KEYS = [
  'payroll','admin','marketing','repairs_maintenance','turnover',
  'utilities','taxes','insurance','management_fees'
];
const LABELS = {
  payroll:'Payroll', admin:'Admin', marketing:'Marketing',
  repairs_maintenance:'Repairs & Maint.', turnover:'Turnover',
  utilities:'Utilities', taxes:'Taxes', insurance:'Insurance',
  management_fees:'Mgmt Fees'
};

function firstOfMonth(y, m) {
  return new Date(y, m - 1, 1); // JS months are 0-based
}

export default function QuickExportPage() {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // sidebar avatar
  const [avatarUrl, setAvatarUrl] = useState('');

  // raw data
  const [rows, setRows] = useState([]); // monthly_expenses joined with properties(*)

  // facets
  const [states, setStates] = useState([]);
  const [stateCities, setStateCities] = useState({});
  const [types, setTypes] = useState([]);
  const [vintages, setVintages] = useState([]);
  const [months, setMonths] = useState([]); // [{value:'2024-01-01', label:'Jan 2024'}, ...]

  // filters
  const [selectedState, setSelectedState] = useState(null);
  const [selectedCities, setSelectedCities] = useState([]);
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [selectedVintages, setSelectedVintages] = useState([]);
  const [unitRange, setUnitRange] = useState([0, 2000]);
  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);

  // load avatar
  useEffect(() => {
    async function loadAvatar() {
      if (!user) return;
      const { data } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('username', user)
        .single();
      if (data?.avatar_url) setAvatarUrl(data.avatar_url);
    }
    loadAvatar();
  }, [user]);

  // load expenses + properties
  useEffect(() => {
    async function fetchAll() {
      const { data, error } = await supabase
        .from('monthly_expenses')
        .select('*, properties(*)');
      if (error) {
        console.error(error);
        return;
      }
      setRows(data || []);

      // facets
      const stSet = new Set();
      const scMap = {};
      const typeSet = new Set();
      const decSet = new Set();
      const monthSet = new Set();

      (data || []).forEach(r => {
        const loc = r.properties?.location || '';
        const [cityRaw, stateRaw] = loc.split(',');
        const city = (cityRaw || '').trim();
        const st = (stateRaw || '').trim();

        if (st) {
          stSet.add(st);
          if (!scMap[st]) scMap[st] = new Set();
          if (city) scMap[st].add(city);
        }

        if (r.properties?.property_type) typeSet.add(r.properties.property_type);
        const dec = Math.floor((r.properties?.vintage_year || 0) / 10) * 10;
        if (!Number.isNaN(dec)) decSet.add(dec);

        const d = firstOfMonth(r.year, r.month);
        monthSet.add(d.toISOString().slice(0, 10));
      });

      setStates(Array.from(stSet).sort());
      setStateCities(Object.fromEntries(
        Object.entries(scMap).map(([st, s]) => [st, Array.from(s).sort()])
      ));
      setTypes(Array.from(typeSet).sort());
      setVintages(Array.from(decSet).sort((a,b)=>a-b));

      const monthArr = Array.from(monthSet)
        .sort()
        .map(iso => {
          const d = new Date(iso);
          const label = d.toLocaleString('default', { month: 'short', year: 'numeric' });
          return { value: iso, label };
        });
      setMonths(monthArr);
      if (monthArr.length) {
        setFromDate(monthArr[0].value);
        setToDate(monthArr[monthArr.length - 1].value);
      }
    }
    fetchAll();
  }, []);

  // sidebar links
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

  const filtered = useMemo(() => {
    if (!rows.length) return [];
    const from = fromDate ? new Date(fromDate) : null;
    const to = toDate ? new Date(toDate) : null;

    return rows.filter(r => {
      // date
      const d = firstOfMonth(r.year, r.month);
      if (from && d < from) return false;
      if (to && d > to) return false;

      // state/city
      const loc = r.properties?.location || '';
      const [cityRaw, stateRaw] = loc.split(',');
      const city = (cityRaw || '').trim();
      const st = (stateRaw || '').trim();

      if (selectedState && st !== selectedState) return false;
      if (selectedCities.length && !selectedCities.includes(city)) return false;

      // type
      if (selectedTypes.length && !selectedTypes.includes(r.properties?.property_type)) return false;

      // vintage
      const dec = Math.floor((r.properties?.vintage_year || 0) / 10) * 10;
      if (selectedVintages.length && !selectedVintages.includes(dec)) return false;

      // units
      const u = r.properties?.number_of_units || 0;
      if (u < unitRange[0] || u > unitRange[1]) return false;

      return true;
    });
  }, [rows, selectedState, selectedCities, selectedTypes, selectedVintages, unitRange, fromDate, toDate]);

  async function handleExport() {
    if (!filtered.length) {
      alert('No rows match the current filters.');
      return;
    }

    // 1) Load template
    const res = await fetch(process.env.PUBLIC_URL + '/templates/Excel_Export_Template.xlsx');
    const arrayBuffer = await res.arrayBuffer();
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(arrayBuffer);

    // 2) Rebuild the Data sheet and the DataTable (so structured refs work)
    const existing = wb.getWorksheet('Data');
    if (existing) wb.removeWorksheet(existing.id);
    const ws = wb.addWorksheet('Data');

    const headers = [
      'Name','Type','City','State','Units','Vintage Year','Avg SqFt Per Unit',
      'Date', 'Payroll','Admin','Marketing','Repairs & Maint','Turnover',
      'Utilities','Taxes','Insurance','Mgmt Fees'
    ];

    // build rows
    const dataRows = filtered.map(r => {
      const loc = r.properties?.location || '';
      const [cityRaw, stateRaw] = loc.split(',');
      const city = (cityRaw || '').trim();
      const st = (stateRaw || '').trim();
      return [
        r.properties?.name || '',
        r.properties?.property_type || '',
        city,
        st,
        r.properties?.number_of_units || 0,
        r.properties?.vintage_year || 0,
        r.properties?.avg_sqft_per_unit || 0,
        firstOfMonth(r.year, r.month),     // as a true Date
        r.payroll || 0,
        r.admin || 0,
        r.marketing || 0,
        r.repairs_maintenance || 0,
        r.turnover || 0,
        r.utilities || 0,
        r.taxes || 0,
        r.insurance || 0,
        r.management_fees || 0,
      ];
    });

    ws.addTable({
      name: 'DataTable',
      ref: 'A1',
      headerRow: true,
      totalsRow: false,
      style: { theme: 'TableStyleMedium2', showRowStripes: true },
      columns: headers.map(h => ({ name: h })),
      rows: dataRows
    });

    // 3) Formats
    ws.getColumn(8).numFmt = 'yyyy-mm-dd'; // Date
    [9,10,11,12,13,14,15,16,17].forEach(i => { // money columns
      const col = ws.getColumn(i);
      if (col) col.numFmt = '$#,##0';
    });
    ws.getColumn(5).numFmt = '0';   // Units
    ws.getColumn(6).numFmt = '0';   // Vintage Year
    ws.getColumn(7).numFmt = '0';   // Avg SqFt / Unit

    // 4) Download
    const out = await wb.xlsx.writeBuffer();
    const blob = new Blob([out], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const stamp = new Date().toISOString().slice(0,10);
    a.href = url;
    a.download = `Trailbreak_Export_${stamp}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  // options for selects
  const stateOptions = states.map(s => ({ value: s, label: s }));
  const cityOptions = (selectedState ? stateCities[selectedState] || [] : [])
    .map(c => ({ value: c, label: c }));
  const typeOptions = types.map(t => ({ value: t, label: t }));
  const vintageOptions = vintages.map(v => ({ value: v, label: `${v}s` }));

  return (
    <div className="qe-wrap">
      {/* Sidebar */}
      <aside className="qe-sidebar">
        <div className="qe-brand"><img src="/logo.png" className="qe-logo" alt="Trailbreak" /></div>
        <div className="qe-user">
          {avatarUrl ? <img src={avatarUrl} className="qe-avatar" alt="Profile" /> : <div className="qe-avatar placeholder" />}
          <div className="qe-role">{role?.replace('_',' ') || ''}</div>
        </div>
        <nav className="qe-nav">
          {sideLinks.map(l => (
            <button key={l.to} className={`qe-nav-item ${pathname === l.to ? 'active' : ''}`} onClick={() => navigate(l.to)}>
              {l.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Content */}
      <main className="qe-content">
        <header className="qe-header">
          <h1 className="qe-title">Quick Export</h1>
          <div className="qe-actions">
            <button className="btn" onClick={handleExport}>Export to Excel</button>
          </div>
        </header>

        <section className="card qe-filters">
          <div className="qe-grid">
            <div className="qe-group">
              <label>State</label>
              <Select
                classNamePrefix="rs"
                isClearable
                options={stateOptions}
                value={selectedState ? { value: selectedState, label: selectedState } : null}
                onChange={(v) => { setSelectedState(v ? v.value : null); setSelectedCities([]); }}
                placeholder="Select a state…"
                menuPortalTarget={document.body}
                menuPosition="fixed"
                styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }}
              />
            </div>

            <div className="qe-group">
              <label>City</label>
              <Select
                classNamePrefix="rs"
                isMulti
                isDisabled={!selectedState}
                options={cityOptions}
                value={selectedCities.map(c => ({ value:c, label:c }))}
                onChange={(vals) => setSelectedCities(vals.map(v => v.value))}
                placeholder={selectedState ? 'Select city…' : 'Select state first…'}
                menuPortalTarget={document.body}
                menuPosition="fixed"
                styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }}
              />
            </div>

            <div className="qe-group">
              <label>Property Type</label>
              <Select
                isMulti
                options={typeOptions}
                value={selectedTypes.map(t => ({ value:t, label:t }))}
                onChange={(vals) => setSelectedTypes(vals.map(v => v.value))}
                menuPortalTarget={document.body}
                menuPosition="fixed"
                styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }}
              />
            </div>

            <div className="qe-group">
              <label>Vintage Decade</label>
              <Select
                isMulti
                options={vintageOptions}
                value={selectedVintages.map(v => ({ value:v, label:`${v}s` }))}
                onChange={(vals) => setSelectedVintages(vals.map(v => v.value))}
                menuPortalTarget={document.body}
                menuPosition="fixed"
                styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }}
              />
            </div>

            <div className="qe-group">
              <label>Units</label>
              <Slider range min={0} max={2000} defaultValue={[0,2000]} onAfterChange={setUnitRange} />
              <div className="hint">{unitRange[0]} – {unitRange[1]}</div>
            </div>

            <div className="qe-group">
              <label>From</label>
              <Select
                options={months}
                value={months.find(m => m.value === fromDate) || null}
                onChange={(v) => setFromDate(v?.value || null)}
                menuPortalTarget={document.body}
                menuPosition="fixed"
                styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }}
              />
            </div>

            <div className="qe-group">
              <label>To</label>
              <Select
                options={months}
                value={months.find(m => m.value === toDate) || null}
                onChange={(v) => setToDate(v?.value || null)}
                menuPortalTarget={document.body}
                menuPosition="fixed"
                styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }}
              />
            </div>
          </div>
        </section>

        <section className="card qe-preview">
          <div className="preview-head">
            <div className="count">{filtered.length.toLocaleString()} rows</div>
            <div className="muted">Template will fill the <b>Data</b> sheet’s <b>DataTable</b>.</div>
          </div>

          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Property</th>
                  <th>Date</th>
                  {MONEY_KEYS.map(k => <th key={k}>{LABELS[k]}</th>)}
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 100).map((r, i) => (
                  <tr key={i}>
                    <td><Link className="table-link" to={`/property/${r.property_id}`}>{r.properties?.name}</Link></td>
                    <td>{firstOfMonth(r.year, r.month).toLocaleString('default', { month:'short', year:'numeric' })}</td>
                    {MONEY_KEYS.map(k => <td key={k}>${Math.round(r[k] || 0).toLocaleString()}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filtered.length > 100 && (
            <div className="muted" style={{ marginTop: 8 }}>
              Showing first 100 rows for preview.
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
