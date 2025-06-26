import { createContext, useContext, useState } from 'react';
import { supabase } from '../supabaseClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);

  const signIn = async ({ username, password }) => {
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
  };

  const signOut = () => {
    setUser(null);
    setRole(null);
  };

  return (
    <AuthContext.Provider value={{ user, role, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);