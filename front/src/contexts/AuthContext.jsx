import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const API_URL = import.meta.env.VITE_API_BASE_URL + '/auth';

  useEffect(() => {
    const fetchUser = async () => {
      const userInfo = JSON.parse(localStorage.getItem('userInfo'));
      if (userInfo && userInfo.token) {
        try {
          setUser(userInfo);
          axios.defaults.headers.common['Authorization'] = `Bearer ${userInfo.token}`;
        } catch (error) {
          console.error('Token validation failed:', error);
          localStorage.removeItem('userInfo');
          setUser(null);
        }
      }
      setLoading(false);
    };
    fetchUser();
  }, []);

  const login = async (email, password) => { // Attendre 'email'
    try {
      setLoading(true);
      const config = {
        headers: {
          'Content-Type': 'application/json',
        },
      };
      const { data } = await axios.post(`${API_URL}/login`, { email, password }, config);
      localStorage.setItem('userInfo', JSON.stringify(data));
      setUser(data);
      axios.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
      setLoading(false);
      navigate('/app');
    } catch (error) {
      setLoading(false);
      // CORRECTION ICI : message d'erreur plus précis
      throw error.response && error.response.data.message
        ? error.response.data.message
        : 'Invalid email or password'; // Message par défaut
    }
  };

  const register = async (name, email, password) => { // Attendre 'email'
    try {
      setLoading(true);
      const config = {
        headers: {
          'Content-Type': 'application/json',
        },
      };
      const { data } = await axios.post(`${API_URL}/register`, { name, email, password }, config);
      localStorage.setItem('userInfo', JSON.stringify(data));
      setUser(data);
      axios.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
      setLoading(false);
      navigate('/app');
    } catch (error) {
      setLoading(false);
      throw error.response && error.response.data.message
        ? error.response.data.message
        : 'Registration failed'; // Message par défaut
    }
  };

  const logout = async () => {
    try {
      await axios.post(`${API_URL}/logout`);
    } catch (error) {
      console.error('Logout failed on server:', error);
    } finally {
      localStorage.removeItem('userInfo');
      setUser(null);
      delete axios.defaults.headers.common['Authorization'];
      navigate('/login');
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
