import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './LoginPage.css';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const { signIn } = useAuth();

  const onSubmit = async e => {
    e.preventDefault();
    try {
      await signIn({ username, password });
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
        <input
          type="text"
          placeholder="Name"
          value={username}
          onChange={e => setUsername(e.target.value)}
          className="login-input"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="login-input"
          required
        />
        <button type="submit" className="login-button">Unlock</button>
      </form>
    </div>
  );
}