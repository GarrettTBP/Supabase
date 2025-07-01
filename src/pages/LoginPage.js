import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './LoginPage.css';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const navigate = useNavigate();
  const { signIn } = useAuth();

  const onSubmit = async e => {
    e.preventDefault();
    try {
      await signIn({ username, password }, remember);
      navigate('/properties');
    } catch (error) {
      alert(error.message);
      setPassword('');
    }
  };

  return (
    <div className="login-page">
      <img src="/logo.png" alt="Logo" className="login-logo" />
      <form className="login-form" onSubmit={onSubmit}>
        <div className="login-field">
          <label htmlFor="username">Name</label>
          <input
            id="username"
            type="text"
            placeholder="Name"
            value={username}
            onChange={e => setUsername(e.target.value)}
            className="login-input"
            required
          />
        </div>

        <div className="login-field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="login-input"
            required
          />
        </div>

        <label className="remember-me">
          <input
            type="checkbox"
            checked={remember}
            onChange={e => setRemember(e.target.checked)}
          />{' '}
          Remember me
        </label>

        <button type="submit" className="login-button">
          Unlock
        </button>
      </form>
    </div>
  );
}