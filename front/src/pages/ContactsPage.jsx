import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemAvatar,
  Avatar,
  ListItemText,
  CircularProgress,
  Alert,
  TextField,
  InputAdornment,
  IconButton
} from '@mui/material';
import { Search as SearchIcon, Chat as ChatIcon } from '@mui/icons-material';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../contexts/AuthContext';
import { useChat } from '../contexts/ChatContext';
import axios from 'axios';

const ContactsPage = () => {
  const { user } = useAuth();
  const { createChat, selectChat } = useChat(); // Utiliser selectChat pour la stabilité
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

  useEffect(() => {
    const fetchAllUsers = async () => {
      if (!user || !user.token) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const config = {
          headers: { Authorization: `Bearer ${user.token}` },
        };
        const { data } = await axios.get(`${API_BASE_URL}/users/all`, config);
        setAllUsers(data);
      } catch (err) {
        console.error('Failed to fetch all users:', err);
        setError(err.response?.data?.message || 'Failed to load contacts.');
      } finally {
        setLoading(false);
      }
    };
    fetchAllUsers();
  }, [user, API_BASE_URL]);

  const handleCreatePrivateChat = async (targetUserId) => {
    try {
      // createChat est déjà conçu pour sélectionner le chat après création
      await createChat(targetUserId);
    } catch (err) {
      console.error('Error creating private chat:', err);
      setError(err.response?.data?.message || 'Failed to start chat.');
    }
  };

  const filteredUsers = allUsers.filter(u =>
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Box sx={{ display: 'flex', width: '100vw', height: '100vh' }}>
      <Sidebar />
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ padding: 2, borderBottom: '1px solid #e0e0e0' }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>Contacts</Typography>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Search contacts by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            size="small"
            sx={{ mt: 2 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
        </Box>

        <List sx={{ flexGrow: 1, overflowY: 'auto', padding: 2 }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <Alert severity="error">{error}</Alert>
          ) : filteredUsers.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
              No contacts found.
            </Typography>
          ) : (
            filteredUsers.map((contact) => (
              <ListItem
                key={contact._id}
                sx={{
                  mb: 1,
                  borderRadius: 1,
                  border: '1px solid #e0e0e0',
                }}
                secondaryAction={
                  <IconButton edge="end" aria-label="chat" onClick={() => handleCreatePrivateChat(contact._id)}>
                    <ChatIcon />
                  </IconButton>
                }
              >
                <ListItemAvatar>
                  <Avatar src={contact.profilePicture || '/default-avatar.png'} />
                </ListItemAvatar>
                <ListItemText
                  primary={<Typography variant="subtitle1" fontWeight="bold">{contact.name}</Typography>}
                  secondary={
                    <>
                      <Typography component="span" variant="body2" color="text.secondary">
                        {contact.email}
                      </Typography>
                      <Typography component="span" variant="caption" color="text.disabled" sx={{ display: 'block' }}>
                        Status: {contact.status}
                      </Typography>
                    </>
                  }
                />
              </ListItem>
            ))
          )}
        </List>
      </Box>
    </Box>
  );
};

export default ContactsPage;
