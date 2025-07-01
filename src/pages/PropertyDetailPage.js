import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'
import '../App.css';

function formatMonthYear(month, year) {
  const date = new Date(year, month - 1);
  return date.toLocaleString('default', { month: 'short', year: 'numeric' });
}

export default function PropertyDetailPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const [property, setProperty] = useState(null)
  const [expenses, setExpenses] = useState([])
  const [comments, setComments] = useState([])
  const [newComment, setNewComment] = useState('')
  const [viewMode, setViewMode] = useState('all')
  const [perUnit, setPerUnit] = useState(false)

  useEffect(() => {
    fetchProperty()
    fetchExpenses()
    fetchComments()
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
      .eq('property_id', id)
      .order('year', { ascending: false })
      .order('month', { ascending: false })

    if (error) {
      console.error('Expense fetch error:', error)
    } else {
      setExpenses(data)
    }
  }

  async function fetchComments() {
    // get recent comments
    const { data: commentData, error: commentError } = await supabase
      .from('comments')
      .select('id, content, username, created_at')
      .eq('property_id', id)
      .order('created_at', { ascending: true })

    if (commentError) {
      console.error('Comment fetch error:', commentError)
      return
    }

    // fetch avatar URLs for commenters
    const usernames = [...new Set(commentData.map(c => c.username))]
    const { data: profilesData, error: profileError } = await supabase
      .from('profiles')
      .select('username, avatar_url')
      .in('username', usernames)

    if (profileError) console.error('Profile fetch error:', profileError)

    const avatarMap = (profilesData || []).reduce((acc, p) => {
      acc[p.username] = p.avatar_url
      return acc
    }, {})

    setComments(
      commentData.map(c => ({
        ...c,
        avatar_url: avatarMap[c.username] || null
      }))
    )
  }

  async function handleAddComment(e) {
    e.preventDefault()
    const text = newComment.trim()
    if (!text) return

    const { error } = await supabase
      .from('comments')
      .insert([{ property_id: id, content: text, username: user }])

    if (error) console.error('Comment insert error:', error)
    else {
      setNewComment('')
      fetchComments()
    }
  }

  function getFilteredExpenses() {
    if (!expenses.length) return []
    let filtered = expenses
    if (viewMode === 't3') filtered = expenses.slice(0, 3)
    else if (viewMode === 't12') filtered = expenses.slice(0, 12)

    if (perUnit && property?.number_of_units) {
      return filtered.map(e => {
        const divisor = property.number_of_units || 1
        return Object.fromEntries(
          Object.entries(e).map(([key, val]) => {
            if (key === 'month' || key === 'year') return [key, val]
            return [key, typeof val === 'number' ? val / divisor : val]
          })
        )
      })
    }
    return filtered
  }

  function handleDownloadT12() {
    if (property?.t12_url) {
      const link = document.createElement('a')
      link.href = property.t12_url
      link.download = ''
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } else {
      alert('No T12 file available for this property.')
    }
  }

  return (
    <div className="container">
      {property ? (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h1 style={{ fontSize: '24px', marginBottom: '8px' }}>{property.name}</h1>
              <p><strong>Type:</strong> {property.property_type}</p>
              <p><strong>Location:</strong> {property.location}</p>
              <p><strong>Units:</strong> {property.number_of_units}</p>
              <p><strong>Vintage Year:</strong> {property.vintage_year}</p>
              <p><strong>Avg Sqft/Unit:</strong> {property.avg_sqft_per_unit}</p>
            </div>
            {property.image_url && (
              <img
                src={property.image_url}
                alt={property.name}
                style={{ width: '350px', height: 'auto', borderRadius: '8px' }}
              />
            )}
          </div>

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
                    <td>${Math.round(row.payroll || 0)}</td>
                    <td>${Math.round(row.admin || 0)}</td>
                    <td>${Math.round(row.marketing || 0)}</td>
                    <td>${Math.round(row.repairs_maintenance || 0)}</td>
                    <td>${Math.round(row.turnover || 0)}</td>
                    <td>${Math.round(row.utilities || 0)}</td>
                    <td>${Math.round(row.taxes || 0)}</td>
                    <td>${Math.round(row.insurance || 0)}</td>
                    <td>${Math.round(row.management_fees || 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Comments Section */}
          <div style={{ marginTop: '32px' }}>
            <h2>Comments</h2>
            <form onSubmit={handleAddComment} style={{ marginBottom: '16px' }}>
              <textarea
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                rows={3}
                placeholder="Leave a comment..."
                style={{ width: '100%', padding: '8px' }}
              />
              <button type="submit" style={{ marginTop: '8px' }}>Post Comment</button>
            </form>
            <div>
              {comments.map(c => (
                <div key={c.id} style={{ display: 'flex', marginBottom: '16px' }}>
                  {c.avatar_url ? (
                    <img
                      src={c.avatar_url}
                      alt={c.username}
                      style={{ width: '40px', height: '40px', borderRadius: '50%', marginRight: '12px' }}
                    />
                  ) : (
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#ccc', marginRight: '12px' }} />
                  )}
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 'bold' }}>
                      {c.username} <span style={{ fontWeight: 'normal', color: '#666', fontSize: '12px' }}>
                        {new Date(c.created_at).toLocaleString()}
                      </span>
                    </div>
                    <div style={{ marginTop: '4px' }}>{c.content}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <p>Loading property data...</p>
      )}
    </div>
  )
}
