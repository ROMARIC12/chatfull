import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Avatar,
  CircularProgress,
  Alert,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from '@mui/material';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../contexts/AuthContext';
// Pas besoin d'axios ici car la logique est déplacée vers AuthContext
// import axios from 'axios';

const SettingsPage = () => {
  const { user, setUser, updateProfile } = useAuth(); // AJOUTÉ updateProfile
  const [name, setName] = useState(user?.name || '');
  const [status, setStatus] = useState(user?.status || 'offline');
  const [profilePicturePreview, setProfilePicturePreview] = useState(user?.profilePicture || '/default-avatar.png'); // Renommé pour la clarté
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false); // Géré localement pour le bouton
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // API_URL n'est plus nécessaire ici, car updateProfile gère l'appel API
  // const API_URL = import.meta.env.VITE_API_BASE_URL + '/users';

  const handleFileChange = (e) => {
    if (e.target.files[0]) {
      setFile(e.target.files[0]);
      setProfilePicturePreview(URL.createObjectURL(e.target.files[0])); // Show preview
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Appel à la fonction updateProfile du AuthContext
      await updateProfile(name, status, file);
      setSuccess('Profile updated successfully!');
      setFile(null); // Clear file input after successful upload
    } catch (err) {
      // L'erreur est déjà une string grâce à AuthContext
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', width: '100vw', height: '100vh' }}>
      <Sidebar />
      <Box
        sx={{
          flexGrow: 1,
          padding: 2, // Ajout de padding pour éviter que le contenu ne touche les bords sur mobile
          boxSizing: 'border-box', // S'assurer que le padding est inclus dans la largeur/hauteur
          display: 'flex',
          flexDirection: 'column', // Important pour centrer verticalement avec justifyContent
          justifyContent: 'center', // Centre verticalement le contenu
          alignItems: 'center',   // Centre horizontalement le contenu
          backgroundColor: '#f4f6f8',
        }}
      >
        <Paper
          elevation={3}
          sx={{
            padding: 4,
            borderRadius: 2,
            maxWidth: 600,
            width: '100%',
            boxSizing: 'border-box',
            flexShrink: 0, // Empêche le Paper de rétrécir si l'espace est limité
          }}
        >
          <Typography variant="h4" component="h1" gutterBottom align="center" sx={{ fontWeight: 'bold', color: 'primary.main', mb: 3 }}>
            Settings
          </Typography>
          {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <form onSubmit={handleSubmit}>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
              <Avatar src={profilePicturePreview} sx={{ width: 120, height: 120, mb: 2 }} />
              <input
                accept="image/*"
                style={{ display: 'none' }}
                id="profile-picture-upload"
                type="file"
                onChange={handleFileChange}
              />
              <label htmlFor="profile-picture-upload">
                <Button variant="outlined" component="span">
                  Change Profile Picture
                </Button>
              </label>
            </Box>
            <TextField
              label="Name"
              variant="outlined"
              fullWidth
              margin="normal"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <FormControl fullWidth margin="normal">
              <InputLabel id="status-select-label">Status</InputLabel>
              <Select
                labelId="status-select-label"
                id="status-select"
                value={status}
                label="Status"
                onChange={(e) => setStatus(e.target.value)}
              >
                <MenuItem value="online">Online</MenuItem>
                <MenuItem value="offline">Offline</MenuItem>
              </Select>
            </FormControl>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              fullWidth
              sx={{ mt: 3, py: 1.5 }}
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : 'Update Profile'}
            </Button>
          </form>
        </Paper>
      </Box>
    </Box>
  );
};

export default SettingsPage;
