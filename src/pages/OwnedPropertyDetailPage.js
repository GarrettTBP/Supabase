import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import './PropertyListPage.css';

export default function OwnedPropertyDetailPage() {
  const { id } = useParams();
  const [detail, setDetail] = useState(null);

  useEffect(() => {
    fetchDetail();
  }, []);

  async function fetchDetail() {
    const { data, error } = await supabase
      .from('owned_property_details')
      .select(
        `unit_count, operation_start_date, exit_month_assumption, owned_properties(name, image_url, property_type)`
      )
      .eq('property_id', id)
      .single();

    if (error || !data) {
      console.error('Error fetching property details:', error);
    } else {
      setDetail(data);
    }
  }

  if (!detail) return <div>Loading...</div>;

  const {
    unit_count,
    operation_start_date,
    exit_month_assumption,
    owned_properties: { name, image_url, property_type }
  } = detail;

  const opDate = new Date(operation_start_date);
  const now = new Date();
  // calculate months elapsed since operation start (no +1)
  const monthNumber =
    (now.getFullYear() - opDate.getFullYear()) * 12 +
    (now.getMonth() - opDate.getMonth());

  return (
    <div className="page-container detail-container">
      <h1 className="page-title">{name}</h1>
      <div className="detail-content" style={{ display: 'flex', gap: '24px' }}>
        <div className="detail-info" style={{ flex: 1 }}>
          <div><strong>Type:</strong> {property_type}</div>
          <div><strong>Units:</strong> {unit_count}</div>
          <div><strong>Operation Start:</strong> {operation_start_date}</div>
          <div><strong>Month #:</strong> {monthNumber}</div>
          <div><strong>Exit Month Assumption:</strong> {exit_month_assumption}</div>
        </div>
        <div className="detail-image" style={{ flex: 1 }}>
          <img
            src={image_url || 'https://via.placeholder.com/300x200.png?text=No+Image'}
            alt={name}
            style={{ width: '100%', borderRadius: '8px' }}
          />
        </div>
      </div>
    </div>
  );
}