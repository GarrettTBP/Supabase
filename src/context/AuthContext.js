// src/context/AuthContext.js
import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);

  // 1) on mount, load saved session
  useEffect(() => {
    const saved = localStorage.getItem('auth');
    if (saved) {
      const { username, role } = JSON.parse(saved);
      setUser(username);
      setRole(role);
    }
  }, []);

  // 2) signIn now takes remember flag
  const signIn = async ({ username, password }, remember = false) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('username', username)
      .eq('password', password)
      .single();

    if (error || !data) {
      throw new Error('Incorrect name or password');
    }

    setUser(username);
    setRole(data.role);

    if (remember) {
      localStorage.setItem(
        'auth',
        JSON.stringify({ username, role: data.role })
      );
    }
  };

  const signOut = () => {
    setUser(null);
    setRole(null);
    localStorage.removeItem('auth');
  };

  return (
    <AuthContext.Provider value={{ user, role, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
