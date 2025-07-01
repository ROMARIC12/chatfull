import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import HomePage from './pages/HomePage';
import SettingsPage from './pages/SettingsPage';
import GroupPage from './pages/GroupPage';
import ContactsPage from './pages/ContactsPage';
import LoadingSpinner from './components/LoadingSpinner';

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  return user ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/" element={<Navigate to="/app" />} /> {/* Default redirect */}
      <Route
        path="/app"
        element={
          <PrivateRoute>
            <HomePage />
          </PrivateRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <PrivateRoute>
            <SettingsPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/contacts"
        element={
          <PrivateRoute>
            < ContactsPage/>
          </PrivateRoute>
        }
      />
      <Route
        path="/group"
        element={
          <PrivateRoute>
            <GroupPage />
          </PrivateRoute>
        }
      />
      {/* Add other private routes as needed */}
      <Route path="*" element={<Navigate to="/app" />} /> {/* Catch-all for undefined routes */}
    </Routes>
  );
}

export default App;