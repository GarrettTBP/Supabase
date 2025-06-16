import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import '../App.css';

function formatMonthYear(month, year) {
  const date = new Date(year, month - 1); // month is 0-indexed
  return date.toLocaleString('default', { month: 'short', year: 'numeric' }); // e.g. "Mar 2024"
}


export default function PropertyDetailPage() {
  const { id } = useParams()
  const [property, setProperty] = useState(null)
  const [expenses, setExpenses] = useState([])
  const [viewMode, setViewMode] = useState('all') // 't3', 't12', 'all'
  const [perUnit, setPerUnit] = useState(false)

  useEffect(() => {
    fetchProperty()
    fetchExpenses()
  }, [id])

  async function fetchProperty() {
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .eq('id', id)
      .single()

    if (error) console.error('Property fetch error:', error)
    else setProperty(data)
  }

async function fetchExpenses() {
  const { data, error } = await supabase
    .from('monthly_expenses')
    .select('*')
    .eq('property_id', id) // use dynamic route param
    .order('year', { ascending: false })
    .order('month', { ascending: false })

  if (error) {
    console.error('Expense fetch error:', error)
  } else {
    console.log('✅ Fetched expenses:', data)
    setExpenses(data)
  }
}



  function getFilteredExpenses() {
    if (!expenses || expenses.length === 0) return []

    let filtered = expenses
    if (viewMode === 't3') filtered = expenses.slice(0, 3)
    else if (viewMode === 't12') filtered = expenses.slice(0, 12)

    if (perUnit && property?.number_of_units) {
      return filtered.map(e => {
        const divisor = property.number_of_units || 1
        return Object.fromEntries(
  Object.entries(e).map(([key, val]) => {
    if (key === 'month' || key === 'year') return [key, val]; // keep as-is
    return [key, typeof val === 'number' ? val / divisor : val];
  })
)

      })
    }
    return filtered
  }

  function handleDownloadT12() {
    // Placeholder for actual T12 file link or logic
    alert('T12 download functionality coming soon!')
  }

  return (
    <div className="container">
      {property ? (
        <>
          <h1 style={{ fontSize: '24px', marginBottom: '8px' }}>{property.name}</h1>
          <p><strong>Type:</strong> {property.property_type}</p>
          <p><strong>Location:</strong> {property.location}</p>
          <p><strong>Units:</strong> {property.number_of_units}</p>
          <p><strong>Vintage Year:</strong> {property.vintage_year}</p>
          <p><strong>Avg Sqft/Unit:</strong> {property.avg_sqft_per_unit}</p>

          <div style={{ marginTop: '24px' }}>
            <h2>Monthly Expenses</h2>

            <div style={{ marginBottom: '12px' }}>
              <button onClick={() => setViewMode('t3')}>T3</button>
              <button onClick={() => setViewMode('t12')}>T12</button>
              <button onClick={() => setViewMode('all')}>All</button>
              <button onClick={() => setPerUnit(prev => !prev)}>
                {perUnit ? 'Show Total Expenses' : 'Show Per Unit'}
              </button>
              <button onClick={handleDownloadT12}>Link to T12</button>
            </div>

            <table border="1" cellPadding="8">
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
                    <td>{row.payroll?.toFixed(2)}</td>
                    <td>{row.admin?.toFixed(2)}</td>
                    <td>{row.marketing?.toFixed(2)}</td>
                    <td>{row.repairs_maintenance?.toFixed(2)}</td>
                    <td>{row.turnover?.toFixed(2)}</td>
                    <td>{row.utilities?.toFixed(2)}</td>
                    <td>{row.taxes?.toFixed(2)}</td>
                    <td>{row.insurance?.toFixed(2)}</td>
                    <td>{row.management_fees?.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <p>Loading property data...</p>
      )}
    </div>
  )
} 
