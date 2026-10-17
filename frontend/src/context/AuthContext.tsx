import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../api/auth';

interface Staff {
  id: string;
  username: string;
  name: string;
}

interface AuthContextType {
  staff: Staff | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [staff, setStaff] = useState<Staff | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(() => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('staff');
    setStaff(null);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    const savedStaff = localStorage.getItem('staff');

    if (token && savedStaff) {
      try {
        setStaff(JSON.parse(savedStaff));
        // Verifikasi token masih valid
        authApi.getMe().catch(() => logout());
      } catch {
        logout();
      }
    }
    setIsLoading(false);
  }, [logout]);

  const login = async (username: string, password: string) => {
    const response = await authApi.login(username, password);
    localStorage.setItem('access_token', response.accessToken);
    localStorage.setItem('staff', JSON.stringify(response.staff));
    setStaff(response.staff);
  };

  return (
    <AuthContext.Provider value={{ staff, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth harus digunakan dalam AuthProvider');
  return ctx;
};
