import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './LoginPage.css';


export default function LoginPage() {
  const [pwd, setPwd] = useState('');
  const navigate = useNavigate();
  const PASSWORD = 'TBP1719';

  const onSubmit = e => {
    e.preventDefault();
    if (pwd === PASSWORD) {
      navigate('/properties');    // or wherever your main app lives
    } else {
      alert('Incorrect password');
      setPwd('');
    }
  };

  return (
    <div className="login-page">
        <img
    src="/logo.png"
    alt="Logo"
    className="login-logo"
  />
      <form className="login-form" onSubmit={onSubmit}>
        <input
          type="password"
          placeholder="Enter password"
          value={pwd}
          onChange={e => setPwd(e.target.value)}
          className="login-input"
        />
        <button type="submit" className="login-button">
          Unlock
        </button>
      </form>
    </div>
  );
}
