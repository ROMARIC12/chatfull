import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const API_URL = import.meta.env.VITE_API_BASE_URL; // Base URL for API calls

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

  const login = async (email, password) => {
    try {
      setLoading(true);
      const config = {
        headers: {
          'Content-Type': 'application/json',
        },
      };
      const { data } = await axios.post(`${API_URL}/auth/login`, { email, password }, config);
      localStorage.setItem('userInfo', JSON.stringify(data));
      setUser(data);
      axios.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
      setLoading(false);
      navigate('/app');
    } catch (error) {
      setLoading(false);
      throw error.response && error.response.data.message
        ? error.response.data.message
        : 'Invalid email or password';
    }
  };

  const register = async (name, email, password) => {
    try {
      setLoading(true);
      const config = {
        headers: {
          'Content-Type': 'application/json',
        },
      };
      const { data } = await axios.post(`${API_URL}/auth/register`, { name, email, password }, config);
      localStorage.setItem('userInfo', JSON.stringify(data));
      setUser(data);
      axios.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
      setLoading(false);
      navigate('/app');
    } catch (error) {
      setLoading(false);
      throw error.response && error.response.data.message
        ? error.response.data.message
        : 'Registration failed';
    }
  };

  const logout = async () => {
    try {
      // Assuming your backend has a logout endpoint
      await axios.post(`${API_URL}/auth/logout`);
    } catch (error) {
      console.error('Logout failed on server:', error);
    } finally {
      localStorage.removeItem('userInfo');
      setUser(null);
      delete axios.defaults.headers.common['Authorization'];
      navigate('/login');
    }
  };

  // NOUVEAU: Fonction pour mettre à jour le profil de l'utilisateur
  const updateProfile = async (name, status, file) => {
    if (!user || !user.token) {
      throw new Error('User not authenticated.');
    }

    const formData = new FormData();
    formData.append('name', name);
    formData.append('status', status);
    if (file) {
      formData.append('profilePicture', file);
    }

    try {
      setLoading(true);
      const config = {
        headers: {
          'Content-Type': 'multipart/form-data', // Important pour les FormData
          Authorization: `Bearer ${user.token}`,
        },
      };
      const { data } = await axios.put(`${API_URL}/users/profile`, formData, config);
      
      // Mettre à jour l'utilisateur dans le contexte et le localStorage
      const updatedUser = { ...user, ...data };
      setUser(updatedUser);
      localStorage.setItem('userInfo', JSON.stringify(updatedUser));
      setLoading(false);
      return data; // Retourne les données mises à jour
    } catch (error) {
      setLoading(false);
      console.error('Error updating profile:', error);
      throw error.response?.data?.message || 'Failed to update profile';
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, setUser, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
