import React, { useState } from 'react';
import { 
  Drawer, Box, Avatar, Typography, IconButton, 
  TextField, Button, Divider, List, ListItem, 
  ListItemText, ListItemAvatar, Badge, useTheme 
} from '@mui/material';
import { 
  Edit, ArrowBack, CameraAlt, Check, 
  Block, Report, Delete, Star 
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

const ProfileDrawer = ({ open, onClose }) => {
  const { user, updateProfile } = useAuth();
  const [editMode, setEditMode] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [status, setStatus] = useState(user?.status || '');
  const theme = useTheme();

  const handleSave = async () => {
    await updateProfile({ name, status });
    setEditMode(false);
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { width: '100%', maxWidth: 400 } }}
    >
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* En-tête */}
        <Box sx={{ 
          bgcolor: theme.palette.primary.main, 
          color: 'white', 
          p: 2, 
          display: 'flex', 
          alignItems: 'center' 
        }}>
          <IconButton color="inherit" onClick={onClose}>
            <ArrowBack />
          </IconButton>
          <Typography variant="h6" sx={{ ml: 2 }}>
            Profil
          </Typography>
          {editMode ? (
            <Button 
              color="inherit" 
              sx={{ ml: 'auto' }} 
              onClick={handleSave}
            >
              Enregistrer
            </Button>
          ) : (
            <Button 
              color="inherit" 
              sx={{ ml: 'auto' }} 
              onClick={() => setEditMode(true)}
            >
              Modifier
            </Button>
          )}
        </Box>
        
        {/* Contenu du profil */}
        <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
          {/* Photo de profil */}
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 4 }}>
            <Badge
              overlap="circular"
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              badgeContent={
                <IconButton color="primary" sx={{ bgcolor: 'white' }}>
                  <CameraAlt fontSize="small" />
                </IconButton>
              }
            >
              <Avatar 
                src={user?.profilePic} 
                sx={{ width: 150, height: 150 }} 
              />
            </Badge>
            
            {editMode ? (
              <>
                <TextField
                  margin="normal"
                  fullWidth
                  label="Nom"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  sx={{ mt: 3 }}
                />
                <TextField
                  margin="normal"
                  fullWidth
                  label="Statut"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                />
              </>
            ) : (
              <>
                <Typography variant="h6" sx={{ mt: 2 }}>
                  {user?.name}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {user?.status}
                </Typography>
              </>
            )}
          </Box>
          
          {/* Informations utilisateur */}
          <List>
            <ListItem>
              <ListItemText 
                primary="Email" 
                secondary={user?.email} 
              />
              <IconButton>
                <Star />
              </IconButton>
            </ListItem>
          </List>
          
          <Divider />
          
          {/* Actions */}
          <List>
            <ListItem button>
              <ListItemAvatar>
                <Avatar sx={{ bgcolor: 'grey.100' }}>
                  <Block color="error" />
                </Avatar>
              </ListItemAvatar>
              <ListItemText primary="Bloquer" />
            </ListItem>
            <ListItem button>
              <ListItemAvatar>
                <Avatar sx={{ bgcolor: 'grey.100' }}>
                  <Report color="error" />
                </Avatar>
              </ListItemAvatar>
              <ListItemText primary="Signaler" />
            </ListItem>
            <ListItem button>
              <ListItemAvatar>
                <Avatar sx={{ bgcolor: 'grey.100' }}>
                  <Delete color="error" />
                </Avatar>
              </ListItemAvatar>
              <ListItemText primary="Supprimer la discussion" />
            </ListItem>
          </List>
        </Box>
      </Box>
    </Drawer>
  );
};

export default ProfileDrawer;