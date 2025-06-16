import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import Select from 'react-select';
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';
import { PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import './PropertyFilterPage.css';

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7f50', '#8dd1e1', '#a4de6c', '#d0ed57', '#d8854f'];

export default function PropertyFilterPage() {
  const [allExpenses, setAllExpenses] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [vintages, setVintages] = useState([]);
  const [locations, setLocations] = useState([]);
  const [types, setTypes] = useState([]);
  const [selectedVintages, setSelectedVintages] = useState([]);
  const [selectedLocations, setSelectedLocations] = useState([]);
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [unitRange, setUnitRange] = useState([0, 1000]);
  const [viewMode, setViewMode] = useState('all');
  const [perUnit, setPerUnit] = useState(false);

  useEffect(() => {
    fetchProperties();
  }, []);

  async function fetchProperties() {
    const { data, error } = await supabase.from('monthly_expenses').select('*, properties(*)');
    if (error) return console.error('Fetch error:', error);

    setAllExpenses(data);
    setFiltered(data);

    const allVintages = Array.from(new Set(data.map(row => Math.floor(row.properties.vintage_year / 10) * 10)));
    const allLocations = Array.from(new Set(data.map(row => row.properties.location)));
    const allTypes = Array.from(new Set(data.map(row => row.properties.property_type)));

    setVintages(allVintages);
    setLocations(allLocations);
    setTypes(allTypes);
  }
useEffect(() => {
  let data = allExpenses.filter(row => {
    const vintageDecade = Math.floor(row.properties.vintage_year / 10) * 10;
    const inVintage = selectedVintages.length === 0 || selectedVintages.includes(vintageDecade);
    const inLocation = selectedLocations.length === 0 || selectedLocations.includes(row.properties.location);
    const inType = selectedTypes.length === 0 || selectedTypes.includes(row.properties.property_type);
    const inUnits = row.properties.number_of_units >= unitRange[0] && row.properties.number_of_units <= unitRange[1];
    return inVintage && inLocation && inType && inUnits;
  });

  if (viewMode === 't3' || viewMode === 't12') {
    const grouped = data.reduce((acc, row) => {
      const pid = row.property_id;
      if (!acc[pid]) acc[pid] = [];
      acc[pid].push(row);
      return acc;
    }, {});

    data = Object.values(grouped).flatMap(group => {
      const sorted = group.sort((a, b) => {
        if (b.year !== a.year) return b.year - a.year;
        return b.month - a.month;
      });

      if (viewMode === 't3') return sorted.slice(0, 3);

      if (viewMode === 't12') {
        const slice = sorted.slice(0, 12);
        const combined = slice.reduce((acc, row) => {
          for (const key in row) {
            if (typeof row[key] === 'number') {
              acc[key] = (acc[key] || 0) + row[key];
            } else if (!acc[key]) {
              acc[key] = row[key];
            }
          }
          return acc;
        }, {});
        combined.properties = slice[0].properties;
        combined.number_of_units = slice[0].properties?.number_of_units || 1;
        return [combined];
      }

      return group;
    });
  }

  if (perUnit) {
    data = data.map(row => {
      const units = row.properties?.number_of_units || row.number_of_units || 1;
      const divided = {};
      for (const [key, value] of Object.entries(row)) {
        if (typeof value === 'number' && !['month', 'year'].includes(key)) {
          divided[key] = value / units;
        } else {
          divided[key] = value;
        }
      }
      divided.properties = row.properties; // maintain property reference
      return divided;
    });
  }

  setFiltered(data);
}, [selectedVintages, selectedLocations, selectedTypes, unitRange, viewMode, perUnit, allExpenses]);


  const pieData = ['payroll', 'admin', 'marketing', 'repairs_maintenance', 'turnover', 'utilities', 'taxes', 'insurance', 'management_fees']
  .map(key => {
    const total = filtered.reduce((sum, row) => sum + (row[key] || 0), 0);
    return {
      name: key,
      value: Math.round(total),
      label: `$${Math.round(total).toLocaleString()}`
    };
  });

  return (
    <div className="filter-page">
      <h1>Property Filters</h1>

      <div className="filter-controls">
        <div>
          <label>Vintage:</label>
          <Select isMulti options={vintages.map(v => ({ value: v, label: v + 's' }))} onChange={vals => setSelectedVintages(vals.map(v => v.value))} />
        </div>
        <div>
          <label>Location:</label>
          <Select isMulti options={locations.map(l => ({ value: l, label: l }))} onChange={vals => setSelectedLocations(vals.map(v => v.value))} />
        </div>
        <div>
          <label>Property Type:</label>
          <Select isMulti options={types.map(t => ({ value: t, label: t }))} onChange={vals => setSelectedTypes(vals.map(v => v.value))} />
        </div>
        <div>
          <label>Units:</label>
          <Slider range min={0} max={1000} defaultValue={[0, 1000]} onAfterChange={val => setUnitRange(val)} />
        </div>
        <div className="view-toggle">
          <button onClick={() => setViewMode('t3')}>T3</button>
          <button onClick={() => setViewMode('t12')}>T12</button>
          <button onClick={() => setViewMode('all')}>All</button>
          <button onClick={() => setPerUnit(prev => !prev)}>{perUnit ? 'Show Totals' : 'Show Per Unit'}</button>
        </div>
      </div>

      <table className="expense-table">
        <thead>
          <tr>
            <th>Property</th>
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
          {filtered.map((row, idx) => (
          <tr key={idx}>
            <td>{row.properties?.name}</td>
            <td>{row.month && row.year ? `${row.month}/${row.year}` : 'T12 Total'}</td>
            <td>{row.payroll != null ? `$${Math.round(row.payroll).toLocaleString()}` : ''}</td>
            <td>{row.admin != null ? `$${Math.round(row.admin).toLocaleString()}` : ''}</td>
            <td>{row.marketing != null ? `$${Math.round(row.marketing).toLocaleString()}` : ''}</td>
            <td>{row.repairs_maintenance != null ? `$${Math.round(row.repairs_maintenance).toLocaleString()}` : ''}</td>
            <td>{row.turnover != null ? `$${Math.round(row.turnover).toLocaleString()}` : ''}</td>
            <td>{row.utilities != null ? `$${Math.round(row.utilities).toLocaleString()}` : ''}</td>
            <td>{row.taxes != null ? `$${Math.round(row.taxes).toLocaleString()}` : ''}</td>
            <td>{row.insurance != null ? `$${Math.round(row.insurance).toLocaleString()}` : ''}</td>
            <td>{row.management_fees != null ? `$${Math.round(row.management_fees).toLocaleString()}` : ''}</td>
          </tr>
          ))}
        </tbody>
      </table>

      <h2>Expense Breakdown (Pie Chart)</h2>
      <PieChart width={400} height={300}>
        <Pie dataKey="value" 
             data={pieData} 
             cx="50%"
             cy="50%" 
             outerRadius={100} 
             fill="#8884d8"
             label={({ name, value }) => `${name}: $${value.toLocaleString()}`}
             >
          {pieData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </div>
  );
}

