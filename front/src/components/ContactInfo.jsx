import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Avatar,
  Divider,
  List,
  ListItem,
  ListItemText,
  Button,
  Switch,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  CircularProgress,
  IconButton,
  ListItemAvatar, // <--- AJOUTEZ CECI
  MenuItem, // Assurez-vous que MenuItem est aussi importé si utilisé dans le Select
  Select, // Assurez-vous que Select est aussi importé si utilisé
  FormControl, // Assurez-vous que FormControl est aussi importé si utilisé
  InputLabel // Assurez-vous que InputLabel est aussi importé si utilisé
} from '@mui/material';
import {
  Call as CallIcon,
  Videocam as VideocamIcon,
  Search as SearchIcon,
  PersonAdd as PersonAddIcon,
  ExitToApp as ExitToAppIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  VerifiedUser as AdminIcon,
  Group as GroupIcon,
} from '@mui/icons-material';
import { useChat } from '../contexts/ChatContext';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

const ContactInfo = () => {
  const { user: currentUser } = useAuth();
  const { selectedChat, updateGroup, addGroupMember, removeGroupMember, deleteGroup, transferGroupAdmin, fetchMessages } = useChat();
  const [openGroupEditDialog, setOpenGroupEditDialog] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [groupParticipants, setGroupParticipants] = useState([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  const [newMemberPhone, setNewMemberPhone] = useState(''); // Considérez de renommer en newMemberEmail
  const [newMemberError, setNewMemberError] = useState('');
  const [transferAdminId, setTransferAdminId] = useState('');
  const [openTransferAdminDialog, setOpenTransferAdminDialog] = useState(false);

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

  const isGroupAdmin = selectedChat?.isGroupChat && selectedChat?.groupAdmin?._id === currentUser._id;
  const isSelectedChatUser = !selectedChat?.isGroupChat && selectedChat?.users.find(u => u._id !== currentUser._id);

  useEffect(() => {
    if (selectedChat?.isGroupChat) {
      setGroupName(selectedChat.chatName);
      setGroupDescription(selectedChat.chatDescription || '');
      fetchGroupParticipants();
    } else {
      setGroupParticipants([]);
    }
  }, [selectedChat]);

  const fetchGroupParticipants = async () => {
    if (!selectedChat || !selectedChat.isGroupChat) return;
    setLoadingParticipants(true);
    try {
      const config = { headers: { Authorization: `Bearer ${currentUser.token}` } };
      const { data } = await axios.get(`${API_BASE_URL}/groups/${selectedChat._id}/participants`, config);
      setGroupParticipants(data);
    } catch (error) {
      console.error('Failed to fetch group participants:', error);
    } finally {
      setLoadingParticipants(false);
    }
  };

  const handleUpdateGroup = async () => {
    try {
      await updateGroup(selectedChat._id, groupName, groupDescription);
      setOpenGroupEditDialog(false);
    } catch (error) {
      console.error('Error updating group:', error);
    }
  };

  const handleAddMember = async () => {
    setNewMemberError('');
    try {
        const config = {
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${currentUser.token}`,
            },
        };
        // First, find the user by email address
        const { data: userToAdd } = await axios.get(`${API_BASE_URL}/users/search?email=${newMemberPhone}`, config); // newMemberPhone est en fait l'email

        if (userToAdd && userToAdd._id) {
            await addGroupMember(selectedChat._id, userToAdd._id);
            setNewMemberPhone('');
            fetchGroupParticipants(); // Re-fetch participants to update list
        } else {
            setNewMemberError('User with this email not found.');
        }
    } catch (error) {
        console.error('Error adding member:', error);
        setNewMemberError(error.response?.data?.message || 'Failed to add member.');
    }
  };

  const handleRemoveMember = async (memberId) => {
    try {
      await removeGroupMember(selectedChat._id, memberId);
      if (memberId === currentUser._id) { // If current user removed themselves/left
          setSelectedChat(null);
          fetchMessages(null); // Clear messages
      } else {
          fetchGroupParticipants(); // Re-fetch participants to update list
      }
    } catch (error) {
      console.error('Error removing member:', error);
    }
  };

  const handleDeleteGroup = async () => {
    if (window.confirm('Are you sure you want to delete this group? This action cannot be undone.')) {
      try {
        await deleteGroup(selectedChat._id);
        setSelectedChat(null);
        fetchMessages(null);
      } catch (error) {
        console.error('Error deleting group:', error);
      }
    }
  };

  const handleTransferAdmin = async () => {
    if (!transferAdminId) {
        alert('Please select a new admin.');
        return;
    }
    if (window.confirm('Are you sure you want to transfer admin rights? You will no longer be an admin.')) {
        try {
            await transferGroupAdmin(selectedChat._id, transferAdminId);
            setOpenTransferAdminDialog(false);
            fetchGroupParticipants(); // Update roles in the list
        } catch (error) {
            console.error('Error transferring admin:', error);
        }
    }
  };

  if (!selectedChat) {
    return (
      <Box sx={{ width: '350px', borderLeft: '1px solid #e0e0e0', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          No chat selected
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '350px', borderLeft: '1px solid #e0e0e0', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ padding: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', borderBottom: '1px solid #eee' }}>
        <Avatar
          src={selectedChat.isGroupChat ? '/group-avatar.png' : isSelectedChatUser?.profilePicture || '/default-avatar.png'}
          sx={{ width: 80, height: 80, mb: 1 }}
        />
        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
          {selectedChat.isGroupChat ? selectedChat.chatName : isSelectedChatUser?.name}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {selectedChat.isGroupChat ? `${selectedChat.users.length} members` : isSelectedChatUser?.email}
        </Typography>
        <Box sx={{ display: 'flex', mt: 2 }}>
          <IconButton sx={{ mx: 1 }}>
            <CallIcon />
          </IconButton>
          <IconButton sx={{ mx: 1 }}>
            <VideocamIcon />
          </IconButton>
          <IconButton sx={{ mx: 1 }}>
            <SearchIcon />
          </IconButton>
        </Box>
      </Box>

      <Box sx={{ flexGrow: 1, overflowY: 'auto', padding: 2 }}>
        {selectedChat.isGroupChat && (
          <>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Group Info</Typography>
                {isGroupAdmin && (
                    <IconButton size="small" onClick={() => setOpenGroupEditDialog(true)}>
                        <EditIcon fontSize="small" />
                    </IconButton>
                )}
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {selectedChat.chatDescription || 'No description provided.'}
            </Typography>
            <Divider sx={{ mb: 2 }} />

            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                Participants ({groupParticipants.length})
            </Typography>
            {loadingParticipants ? (
                <CircularProgress size={24} />
            ) : (
                <List dense>
                    {groupParticipants.map((member) => (
                        <ListItem key={member._id} secondaryAction={
                            isGroupAdmin && member._id !== currentUser._id ? (
                                <Button size="small" color="error" onClick={() => handleRemoveMember(member._id)}>
                                    Remove
                                </Button>
                            ) : null
                        }>
                            <ListItemAvatar> {/* Ceci est le composant qui manquait */}
                                <Avatar src={member.profilePicture || '/default-avatar.png'} />
                            </ListItemAvatar>
                            <ListItemText
                                primary={member.name + (member._id === currentUser._id ? ' (You)' : '')}
                                secondary={
                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                        {member.isAdmin && <Chip label="Admin" size="small" color="primary" sx={{ mr: 0.5 }} />}
                                        <Typography variant="caption" color="text.secondary">
                                            {member.email} - {member.status}
                                        </Typography>
                                    </Box>
                                }
                            />
                        </ListItem>
                    ))}
                </List>
            )}

            {isGroupAdmin && (
                <Box sx={{ mt: 2, mb: 2, display: 'flex', alignItems: 'center' }}>
                    <TextField
                        size="small"
                        placeholder="Add member by email"
                        value={newMemberPhone}
                        onChange={(e) => setNewMemberPhone(e.target.value)}
                        error={!!newMemberError}
                        helperText={newMemberError}
                        sx={{ flexGrow: 1, mr: 1 }}
                    />
                    <Button variant="contained" onClick={handleAddMember} startIcon={<PersonAddIcon />}>
                        Add
                    </Button>
                </Box>
            )}

            {isGroupAdmin && (
                <Button variant="outlined" fullWidth startIcon={<GroupIcon />} sx={{ mb: 1 }} onClick={() => setOpenTransferAdminDialog(true)}>
                    Transfer Admin Rights
                </Button>
            )}

            <Button
                variant="outlined"
                color="error"
                fullWidth
                startIcon={<ExitToAppIcon />}
                sx={{ mt: 2 }}
                onClick={() => handleRemoveMember(currentUser._id)}
            >
                Leave Group
            </Button>

            {isGroupAdmin && (
                <Button
                    variant="contained"
                    color="error"
                    fullWidth
                    startIcon={<DeleteIcon />}
                    sx={{ mt: 1 }}
                    onClick={handleDeleteGroup}
                >
                    Delete Group
                </Button>
            )}

            <Divider sx={{ my: 2 }} />
          </>
        )}

        <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }} onClick={() => console.log("Implement media modal here")}>
          Media, Links & Docs
        </Typography>
        {/* Placeholder for Media, Links & Docs - add actual media display later */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
          {/* Example media items (replace with dynamic data from chatMedia in ChatWindow) */}
          <img src="https://via.placeholder.com/60" alt="media" style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 4 }} />
          <img src="https://via.placeholder.com/60" alt="media" style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 4 }} />
        </Box>
        <Divider sx={{ mb: 2 }} />

        <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
          Mute Notifications
        </Typography>
        <Switch defaultChecked />
      </Box>

      {/* Group Edit Dialog */}
      <Dialog open={openGroupEditDialog} onClose={() => setOpenGroupEditDialog(false)}>
        <DialogTitle>Edit Group Info</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Group Name"
            type="text"
            fullWidth
            variant="outlined"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Group Description"
            type="text"
            fullWidth
            multiline
            rows={3}
            variant="outlined"
            value={groupDescription}
            onChange={(e) => setGroupDescription(e.target.value)}
            sx={{ mb: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenGroupEditDialog(false)}>Cancel</Button>
          <Button onClick={handleUpdateGroup} variant="contained">Save Changes</Button>
        </DialogActions>
      </Dialog>

      {/* Transfer Admin Dialog */}
      <Dialog open={openTransferAdminDialog} onClose={() => setOpenTransferAdminDialog(false)}>
        <DialogTitle>Transfer Admin Rights</DialogTitle>
        <DialogContent>
            <Typography sx={{ mb: 2 }}>Select a new administrator from the group members. You will no longer be an admin after this action.</Typography>
            <TextField
                select
                label="New Admin"
                value={transferAdminId}
                onChange={(e) => setTransferAdminId(e.target.value)}
                fullWidth
                variant="outlined"
            >
                {groupParticipants.filter(p => p._id !== currentUser._id).map((member) => (
                    <MenuItem key={member._id} value={member._id}>
                        {member.name}
                    </MenuItem>
                ))}
            </TextField>
        </DialogContent>
        <DialogActions>
            <Button onClick={() => setOpenTransferAdminDialog(false)}>Cancel</Button>
            <Button onClick={handleTransferAdmin} variant="contained" color="warning">Transfer Admin</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ContactInfo;
