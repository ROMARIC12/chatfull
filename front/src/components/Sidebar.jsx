import React from 'react';
import {
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Avatar,
  Typography,
  Box,
} from '@mui/material';
import {
  Chat as ChatIcon,
  PeopleAlt as PeopleIcon,
  Call as CallIcon,
  Settings as SettingsIcon,
  ExitToApp as LogoutIcon,
  Contacts as ContactsIcon, // NOUVEAU : Importez l'icône Contacts
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useChat } from '../contexts/ChatContext';

const drawerWidth = 80; // Fixed width for icons only

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { notifications, selectChat, setMessages } = useChat(); // Utiliser selectChat

  const menuItems = [
    { text: 'Chats', icon: <ChatIcon />, path: '/app' },
    { text: 'Groups', icon: <PeopleIcon />, path: '/group' },
    { text: 'Contacts', icon: <ContactsIcon />, path: '/contacts' }, // NOUVEAU : Ajout de l'item Contacts
    { text: 'Calls', icon: <CallIcon />, path: '/call' },
    { text: 'Settings', icon: <SettingsIcon />, path: '/settings' },
  ];

  const handleLogout = async () => {
    await logout();
  };

  const handleNavigation = (path) => {
    selectChat(null); // Désélectionner le chat en cours
    setMessages([]); // Vider les messages
    navigate(path);
  };

  const userAvatarSrc = user?.profilePicture && user.profilePicture !== ''
    ? user.profilePicture
    : '/default-avatar.png';

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        [`& .MuiDrawer-paper`]: {
          width: drawerWidth,
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingY: 2,
          borderRight: '1px solid #e0e0e0',
          backgroundColor: '#f5f5f5',
        },
      }}
    >
      <Toolbar sx={{ justifyContent: 'center' }}>
        <Avatar src={userAvatarSrc} alt={user?.name || 'User'} sx={{ width: 48, height: 48 }} />
      </Toolbar>
      <List sx={{ width: '100%' }}>
        {menuItems.map((item) => (
          <ListItem
            button
            key={item.text}
            onClick={() => handleNavigation(item.path)}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              paddingY: 1.5,
              backgroundColor: location.pathname === item.path ? 'rgba(0, 0, 0, 0.08)' : 'transparent',
              '&:hover': {
                backgroundColor: 'rgba(0, 0, 0, 0.04)',
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: 'auto', marginBottom: 0.5 }}>
              {item.icon}
            </ListItemIcon>
            <ListItemText
              primary={item.text}
              primaryTypographyProps={{ fontSize: '0.7rem' }}
              sx={{ margin: 0 }}
            />
             {item.text === 'Chats' && notifications.length > 0 && (
                <Box
                    sx={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        backgroundColor: 'red',
                        color: 'white',
                        borderRadius: '50%',
                        width: 20,
                        height: 20,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.7rem',
                        fontWeight: 'bold',
                    }}
                >
                    {notifications.length}
                </Box>
            )}
          </ListItem>
        ))}
      </List>
      <List sx={{ width: '100%' }}>
        <ListItem
          button
          onClick={handleLogout}
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            paddingY: 1.5,
            '&:hover': {
              backgroundColor: 'rgba(0, 0, 0, 0.04)',
            },
          }}
        >
          <ListItemIcon sx={{ minWidth: 'auto', marginBottom: 0.5 }}>
            <LogoutIcon />
          </ListItemIcon>
          <ListItemText
            primary="Logout"
            primaryTypographyProps={{ fontSize: '0.7rem' }}
            sx={{ margin: 0 }}
          />
        </ListItem>
      </List>
    </Drawer>
  );
};

export default Sidebar;
