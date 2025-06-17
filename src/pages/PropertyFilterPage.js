import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import Select from 'react-select';
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';
import './PropertyFilterPage.css';
import { Link } from 'react-router-dom';
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
import './PropertyFilterPage.css';

const COLORS = [
  '#8884d8', '#82ca9d', '#ffc658', '#ff7f50',
  '#8dd1e1', '#a4de6c', '#d0ed57', '#d8854f'
];

const EXPENSE_KEYS = [
  'payroll',
  'admin',
  'marketing',
  'repairs_maintenance',
  'turnover',
  'utilities',
  'taxes',
  'insurance',
  'management_fees'
];

export default function PropertyFilterPage() {
  /* ---------- state ---------- */
  const [allExpenses, setAllExpenses] = useState([]);
  const [filtered,     setFiltered]   = useState([]);
  const [filteredNoUnit, setFilteredNoUnit] = useState([]);

  const [vintages,  setVintages]  = useState([]);
  const [locations, setLocations] = useState([]);
  const [types,     setTypes]     = useState([]);

  const [selectedVintages, setSelectedVintages] = useState([]);
  const [selectedLocations, setSelectedLocations] = useState([]);
  const [selectedTypes,     setSelectedTypes]     = useState([]);
  const [unitRange, setUnitRange] = useState([0, 1000]);
  const [viewMode,  setViewMode]  = useState('all');
  const [perUnit,   setPerUnit]   = useState(false);

  const [selectedCat, setSelectedCat] = useState('payroll');

  /* ---------- fetch ---------- */
  useEffect(() => {
    const fetchData = async () => {
      const { data, error } = await supabase
        .from('monthly_expenses')
        .select('*, properties(*)');
      if (error) return console.error(error);

      setAllExpenses(data);
      setFiltered(data);

      setVintages(Array.from(
        new Set(data.map(r => Math.floor(r.properties.vintage_year / 10) * 10))
      ));
      setLocations(Array.from(
        new Set(data.map(r => r.properties.location))
      ));
      setTypes(Array.from(
        new Set(data.map(r => r.properties.property_type))
      ));
    };
    fetchData();
  }, []);

  /* ---------- filter / view logic ---------- */
  useEffect(() => {
    let data = allExpenses.filter(r => {
    const decade = Math.floor(r.properties.vintage_year / 10) * 10;
    const inVintage  = !selectedVintages.length || selectedVintages.includes(decade);
    const inLocation = !selectedLocations.length || selectedLocations.includes(r.properties.location);
    const inType     = !selectedTypes.length     || selectedTypes.includes(r.properties.property_type);
    const inUnits    = r.properties.number_of_units >= unitRange[0] &&
                       r.properties.number_of_units <= unitRange[1];
    return inVintage && inLocation && inType && inUnits;
  });

  if (viewMode === 't3' || viewMode === 't12') {
    const grouped = data.reduce((acc, r) => {
      (acc[r.property_id] ??= []).push(r);
      return acc;
    }, {});
    data = Object.values(grouped).flatMap(group => {
      const sorted = group.sort((a, b) =>
        b.year !== a.year ? b.year - a.year : b.month - a.month
      );
      if (viewMode === 't3') return sorted.slice(0, 3);
      const slice = sorted.slice(0, 12);
      const combined = slice.reduce((acc, r) => {
        for (const k in r) {
          if (typeof r[k] === 'number') acc[k] = (acc[k] || 0) + r[k];
          else if (!acc[k]) acc[k] = r[k];
        }
        return acc;
      }, {});
      combined.properties = slice[0].properties;
      combined.number_of_units = slice[0].properties?.number_of_units ?? 1;
      return [combined];
    });
  }

  // 2) **capture** raw filtered data (before per-unit)
  setFilteredNoUnit(data);

  // 3) apply per-unit toggle only to the displayed rows
  if (perUnit) {
    data = data.map(r => {
      const units = r.properties?.number_of_units || 1;
      const divided = {};
      for (const [k, v] of Object.entries(r)) {
        divided[k] = typeof v === 'number' && !['month', 'year'].includes(k)
          ? v / units
          : v;
      }
      divided.properties = r.properties;
      return divided;
    });
  }

  // 4) update the displayed table/chart data
  setFiltered(data);
}, [
  allExpenses,
  selectedVintages,
  selectedLocations,
  selectedTypes,
  unitRange,
  viewMode,
  perUnit
]);

  /* ---------- weighted averages (per-unit, weighted by avg_sqft_unit) ---------- */
  // find and replace your existing weightedAvg useMemo with this:
const weightedAvg = useMemo(() => {
  const numerator   = {};
  const denominator = {};

  // init
  EXPENSE_KEYS.forEach(key => {
    numerator[key]   = 0;
    denominator[key] = 0;
  });

  // accumulate on the raw (no-unit) data
  filteredNoUnit.forEach(record => {
    const sqft  = record.properties?.avg_sqft_per_unit || 0;
    const units = record.properties?.number_of_units     || 1;

    EXPENSE_KEYS.forEach(key => {
      const costPerUnit = record[key] ? record[key] / units : 0;
      numerator[key]   += costPerUnit * sqft;
      denominator[key] += sqft;
    });
  });

  // finalize each category
  return EXPENSE_KEYS.reduce((out, key) => {
    out[key] = denominator[key] > 0
      ? Math.round(numerator[key] / denominator[key])
      : 0;
    return out;
  }, {});
}, [filteredNoUnit]);



  /* ---------- pie data ---------- */
  const pieData = useMemo(
    () =>
      EXPENSE_KEYS.map(k => ({
        name: k,
        value: Math.round(filtered.reduce((s, r) => s + (r[k] || 0), 0))
      })),
    [filtered]
  );

  /* ---------- box-plot data ---------- */
  const boxPlotData = useMemo(() => {
    const grouped = filtered.reduce((acc, r) => {
      (acc[r.properties.name] ??= []).push(r[selectedCat] || 0);
      return acc;
    }, {});

    return Object.entries(grouped).map(([name, arr]) => {
      const sorted = arr.sort((a, b) => a - b);
      const len = sorted.length;
      const q1 = sorted[Math.floor(0.25 * (len - 1))];
      const median = sorted[Math.floor(0.5 * (len - 1))];
      const q3 = sorted[Math.floor(0.75 * (len - 1))];
      return {
        name,
        min: sorted[0],
        Q1:  q1,
        median,
        Q3:  q3,
        max: sorted[len - 1]
      };
    });
  }, [filtered, selectedCat]);

  /* ---------- render ---------- */
  return (
    <div className="filter-page">
      <h1 className="filter-title">Property Filters</h1>

      {/* -------- filter bar -------- */}
      <div className="filter-controls">
  <div>
    <label>Vintage:</label>
    <Select
      isMulti
      options={vintages.map(v => ({ value: v, label: `${v}s` }))}
      onChange={vals => setSelectedVintages(vals.map(v => v.value))}
      menuPortalTarget={document.body}
      menuPosition="fixed"
      styles={{ menuPortal: base => ({ ...base, zIndex: 1000 }) }}
    />
  </div>
  <div>
    <label>Location:</label>
    <Select
      isMulti
      options={locations.map(l => ({ value: l, label: l }))}
      onChange={vals => setSelectedLocations(vals.map(v => v.value))}
      menuPortalTarget={document.body}
      menuPosition="fixed"
      styles={{ menuPortal: base => ({ ...base, zIndex: 1000 }) }}
    />
  </div>
  <div>
    <label>Property Type:</label>
    <Select
      isMulti
      options={types.map(t => ({ value: t, label: t }))}
      onChange={vals => setSelectedTypes(vals.map(v => v.value))}
      menuPortalTarget={document.body}
      menuPosition="fixed"
      styles={{ menuPortal: base => ({ ...base, zIndex: 1000 }) }}
    />
  </div>
  <div>
    <label>Units:</label>
    <Slider
      range
      min={0}
      max={1000}
      defaultValue={[0, 1000]}
      onAfterChange={setUnitRange}
    />
  </div>
  <div className="view-toggle">
    {['t3', 't12', 'all'].map(m => (
      <button key={m} onClick={() => setViewMode(m)}>
        {m.toUpperCase()}
      </button>
    ))}
    <button onClick={() => setPerUnit(p => !p)}>
      {perUnit ? 'Show Totals' : 'Show Per Unit'}
    </button>
  </div>
</div>


      {/* -------- dashboard layout: table on left; stats & pie on right -------- */}
<div className="dashboard-layout">
  {/* left column: table */}
  <div className="table-container">
    <table className="expense-table">
      <thead>
        <tr>
          <th>Property</th>
          <th>Date</th>
          {EXPENSE_KEYS.map(k => (
            <th key={k}>{k.replace('_', ' ')}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {filtered.map((row, idx) => (
          <tr key={idx}>
            <td>
  <Link
    to={`/property/${row.property_id}`}
    className="table-link"
  >
    {row.properties?.name}
  </Link>
</td>

            <td>
              {row.month && row.year
                ? `${row.month}/${row.year}`
                : 'T12 Total'}
            </td>
            {EXPENSE_KEYS.map(k => (
              <td key={k}>
                {row[k] != null
                  ? `$${Math.round(row[k]).toLocaleString()}`
                  : ''}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>

  {/* right column: stats (“blue boxes”) above pie chart */}
  <div>
    <div className="stats-grid">
  {EXPENSE_KEYS.map(key => (
    <div key={key} className="stat-box">
      <div className="stat-label">
        {key.replace('_', ' ')}
      </div>
      <div className="stat-value">
        ${weightedAvg[key].toLocaleString()}
      </div>
    </div>
  ))}
</div>


    <div className="chart-container">
      <h2 className="chart-title">Expense Breakdown</h2>
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie
            dataKey="value"
            data={pieData}
            outerRadius={90}
            labelLine={false}
            label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
          >
            {pieData.map((d, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Legend
            verticalAlign="middle"
            align="right"
            layout="vertical"
            wrapperStyle={{ fontSize: 12 }}
          />
          <Tooltip formatter={v => `$${Number(v).toLocaleString()}`} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  </div>
</div>


      {/* -------- distribution plot -------- */}
      <div className="boxplot-section">
        <div className="boxplot-header">
          <h2>Distribution by Expense Category</h2>
          <Select
            className="boxplot-select"
            options={EXPENSE_KEYS.map(k => ({ value: k, label: k }))}
            value={{ value: selectedCat, label: selectedCat }}
            onChange={v => setSelectedCat(v.value)}
          />
        </div>

        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={boxPlotData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" hide />
            <YAxis
              tickFormatter={v => `$${v / 1000}k`}
              width={70}
            />
            <Tooltip
              formatter={v => `$${Math.round(v).toLocaleString()}`}
            />

            {/* median line */}
            <Line
              type="monotone"
              dataKey="median"
              stroke="#000"
              dot={{ r: 3 }}
              strokeWidth={2}
            />

            {/* min-to-Q3 whisker */}
            <ErrorBar
              dataKey="Q1"
              width={4}
              stroke="#8884d8"
              direction="y"
              data={boxPlotData.map(d => ({
                x: d.name,
                y: d.Q1,
                value: [d.min, d.Q3]
              }))}
            />

            {/* Q3-to-max whisker */}
            <ErrorBar
              dataKey="Q3"
              width={4}
              stroke="#82ca9d"
              direction="y"
              data={boxPlotData.map(d => ({
                x: d.name,
                y: d.Q3,
                value: [d.Q3, d.max]
              }))}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
