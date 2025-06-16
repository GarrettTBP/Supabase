import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { PieChart, Pie, Cell, Tooltip, Legend } from 'recharts'

export default function PropertyFilterPage() {
  const [properties, setProperties] = useState([])
  const [filtered, setFiltered] = useState([])
  const [filters, setFilters] = useState({ decades: [], locations: [], types: [], unitsRange: 1000 })
  const [viewMode, setViewMode] = useState('all')
  const [perUnit, setPerUnit] = useState(false)

  useEffect(() => {
    fetchProperties()
  }, [])

  async function fetchProperties() {
    const { data, error } = await supabase.from('monthly_expenses_with_properties').select('*')
    if (error) console.error('Fetch error:', error)
    else {
      console.log('Fetched data:', data)
      setProperties(data)
      setFiltered(data)
    }
  }

  function getDecade(year) {
    return year ? `${Math.floor(year / 10) * 10}s` : ''
  }

  function handleFilterChange(e) {
    const { name, value, type, checked } = e.target

    if (type === 'checkbox') {
      const newSet = filters[name].includes(value)
        ? filters[name].filter((v) => v !== value)
        : [...filters[name], value]
      setFilters({ ...filters, [name]: newSet })
    } else if (name === 'unitsRange') {
      setFilters({ ...filters, unitsRange: parseInt(value) })
    }
  }

  useEffect(() => {
    let result = properties
    if (filters.decades.length > 0) {
      result = result.filter(p => filters.decades.includes(getDecade(p.vintage_year)))
    }
    if (filters.locations.length > 0) {
      result = result.filter(p => filters.locations.includes(p.location))
    }
    if (filters.types.length > 0) {
      result = result.filter(p => filters.types.includes(p.property_type))
    }
    result = result.filter(p => p.number_of_units <= filters.unitsRange)
    setFiltered(result)
  }, [filters, properties])

  function getFilteredExpenses() {
    let grouped = {}
    for (let row of filtered) {
      const id = row.property_id
      if (!grouped[id]) grouped[id] = []
      grouped[id].push(row)
    }

    const sorted = Object.values(grouped).flatMap(rows => {
      const sortedRows = [...rows].sort((a, b) => b.year - a.year || b.month - a.month)
      let sliced = viewMode === 't3' ? sortedRows.slice(0, 3) : viewMode === 't12' ? sortedRows.slice(0, 12) : sortedRows

      if (perUnit && sliced.length > 0) {
        sliced = sliced.map(e => {
          const units = e.number_of_units || 1
          return Object.fromEntries(
            Object.entries(e).map(([k, v]) => [k, typeof v === 'number' ? v / units : v])
          )
        })
      }
      return sliced
    })

    return sorted
  }

  const uniqueDecades = [...new Set(properties.map(p => getDecade(p.vintage_year)).filter(Boolean))]
  const uniqueLocations = [...new Set(properties.map(p => p.location).filter(Boolean))]

  const avgExpensesByCategory = (() => {
    const data = getFilteredExpenses()
    const categories = ['payroll', 'admin', 'marketing', 'repairs_maintenance', 'turnover', 'utilities', 'taxes', 'insurance', 'management_fees']
    const totals = {}
    let totalWeightedSqft = 0

    for (let row of data) {
      const sqft = row.avg_sqft_per_unit || 1
      totalWeightedSqft += sqft
      for (let cat of categories) {
        if (!totals[cat]) totals[cat] = 0
        totals[cat] += (row[cat] || 0) * sqft
      }
    }

    return categories.map(cat => ({ name: cat.replace('_', ' '), value: totals[cat] / (totalWeightedSqft || 1) }))
  })()

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A28CF6', '#FF6B6B', '#8884D8', '#FF4444', '#22B573']

  return (
    <div style={{ padding: '24px', fontFamily: 'Arial' }}>
      <h1 style={{ marginBottom: '20px' }}>📊 Filter Properties</h1>

      <div style={{ display: 'flex', gap: '24px', marginBottom: '24px' }}>
        <div>
          <label><strong>Vintage Decade:</strong></label><br />
          <select multiple name="decades" onChange={e => {
            const options = [...e.target.selectedOptions].map(o => o.value)
            setFilters({ ...filters, decades: options })
          }}>
            {uniqueDecades.length === 0 ? <option disabled>No options</option> :
              uniqueDecades.map(decade => <option key={decade} value={decade}>{decade}</option>)}
          </select>
        </div>

        <div>
          <label><strong>Location:</strong></label><br />
          <select multiple name="locations" onChange={e => {
            const options = [...e.target.selectedOptions].map(o => o.value)
            setFilters({ ...filters, locations: options })
          }}>
            {uniqueLocations.length === 0 ? <option disabled>No options</option> :
              uniqueLocations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
          </select>
        </div>

        <div>
          <strong>Property Type:</strong><br />
          {['Garden', 'High Rise'].map(type => (
            <label key={type} style={{ marginLeft: '10px' }}>
              <input type="checkbox" name="types" value={type} onChange={handleFilterChange} /> {type}
            </label>
          ))}
        </div>

        <div>
          <strong>Max Number of Units:</strong><br />
          <input type="range" name="unitsRange" min="0" max="1000" value={filters.unitsRange} onChange={handleFilterChange} style={{ width: '300px' }} />
          <span style={{ marginLeft: '10px' }}>{filters.unitsRange}</span>
        </div>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <button onClick={() => setViewMode('t3')}>T3</button>
        <button onClick={() => setViewMode('t12')}>T12</button>
        <button onClick={() => setViewMode('all')}>All</button>
        <button onClick={() => setPerUnit(prev => !prev)}>
          {perUnit ? 'Show Total Expenses' : 'Show Per Unit'}
        </button>
      </div>

      <table border="1" cellPadding="8" style={{ width: '100%', marginBottom: '24px' }}>
        <thead>
          <tr>
            <th>Name</th>
            <th>Month</th>
            <th>Year</th>
            <th>Payroll</th>
            <th>Admin</th>
            <th>Marketing</th>
            <th>Repairs</th>
            <th>Turnover</th>
            <th>Utilities</th>
            <th>Taxes</th>
            <th>Insurance</th>
            <th>Mgmt Fees</th>
          </tr>
        </thead>
        <tbody>
          {getFilteredExpenses().map((e, i) => (
            <tr key={i}>
              <td>{e.name}</td>
              <td>{e.month}</td>
              <td>{e.year}</td>
              <td>{e.payroll?.toFixed(2)}</td>
              <td>{e.admin?.toFixed(2)}</td>
              <td>{e.marketing?.toFixed(2)}</td>
              <td>{e.repairs_maintenance?.toFixed(2)}</td>
              <td>{e.turnover?.toFixed(2)}</td>
              <td>{e.utilities?.toFixed(2)}</td>
              <td>{e.taxes?.toFixed(2)}</td>
              <td>{e.insurance?.toFixed(2)}</td>
              <td>{e.management_fees?.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Average Expense Breakdown (Weighted by Avg Sqft/Unit)</h2>
      <PieChart width={600} height={300}>
        <Pie
          data={avgExpensesByCategory}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={100}
          fill="#8884d8"
          label
        >
          {avgExpensesByCategory.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </div>
  )
}
