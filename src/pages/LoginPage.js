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

  const onSubmit = async (e) => {
    e.preventDefault();
    try {
      await signIn({ username, password }, remember);
      navigate('/dashboard');
    } catch (error) {
      alert(error.message);
      setPassword('');
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand">
          <img src="/logo.png" alt="Trailbreak Partners" className="login-logo" />
          <h1 className="login-title">Welcome back</h1>
          
        </div>

        <form className="login-form" onSubmit={onSubmit}>
          <div className="login-field">
            <label htmlFor="username">Name</label>
            <input
              id="username"
              type="text"
              placeholder="Name"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
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
              onChange={(e) => setPassword(e.target.value)}
              className="login-input"
              required
            />
          </div>

          <div className="login-row">
            <label className="remember-me">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              />{' '}
              Remember me
            </label>
            {/* optional: forgot link for future */}
            {/* <button type="button" className="forgot">Forgot password?</button> */}
          </div>

          <button type="submit" className="login-button">Sign in</button>
        </form>
      </div>

      <div className="login-footer">© {new Date().getFullYear()} Trailbreak Partners</div>
    </div>
  );
}