import React, { useState } from 'react';
import {
  Box,
  Typography,
  Divider,
  List,
  InputBase,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import { Search as SearchIcon, Add as AddIcon, Archive as ArchiveIcon } from '@mui/icons-material';
import ChatListItem from './ChatListItem';
import { useChat } from '../contexts/ChatContext';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext'; // NOUVEAU: Import de useSocket
import axios from 'axios';

const ChatList = () => {
  const { chats, setChats, selectedChat, setSelectedChat, notifications, setNotifications, createChat } = useChat();
  const { user } = useAuth();
  const { onlineUsers } = useSocket(); // NOUVEAU: Accès à onlineUsers
  const [searchTerm, setSearchTerm] = useState('');
  const [openNewChatDialog, setOpenNewChatDialog] = useState(false);
  const [newChatPhone, setNewChatPhone] = useState('');
  const [newChatError, setNewChatError] = useState('');

  const handleSelectChat = (chat) => {
    setSelectedChat(chat);
    // Remove notifications for this chat
    setNotifications(prev => prev.filter(notif => notif.chat._id !== chat._id));
  };

  const filteredChats = chats.filter((chat) => {
    const chatName = chat.isGroupChat
      ? chat.chatName
      : chat.users.find((u) => u._id !== user._id)?.name || 'Unknown User';
    return chatName.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const pinnedChats = filteredChats.filter(chat => chat.isPinned && !chat.isArchived);
  const allChats = filteredChats.filter(chat => !chat.isPinned && !chat.isArchived);
  const archivedChats = chats.filter(chat => chat.isArchived);


  const handleCreateNewChat = async () => {
    setNewChatError('');
    try {
        const config = {
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${user.token}`,
            },
        };
        // First, try to find the user by phone number
        const { data: contactUser } = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/users/search?phone=${newChatPhone}`, config);

        if (contactUser && contactUser._id) {
            await createChat(contactUser._id);
            setOpenNewChatDialog(false);
            setNewChatPhone('');
        } else {
            setNewChatError('User with this phone number not found.');
        }
    } catch (error) {
        console.error('Error creating new chat:', error);
        setNewChatError(error.response?.data?.message || 'Failed to create chat.');
    }
  };


  return (
    <Box sx={{ width: '350px', borderRight: '1px solid #e0e0e0', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ padding: 2, borderBottom: '1px solid #eee' }}>
        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>Chats</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', backgroundColor: '#f0f2f5', borderRadius: 2, paddingX: 1, marginTop: 1 }}>
          <SearchIcon sx={{ color: 'text.secondary' }} />
          <InputBase
            placeholder="Search or start new chat"
            sx={{ marginLeft: 1, flexGrow: 1 }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <IconButton onClick={() => setOpenNewChatDialog(true)}>
            <AddIcon />
          </IconButton>
        </Box>
      </Box>

      <List sx={{ flexGrow: 1, overflowY: 'auto' }}>
        {pinnedChats.length > 0 && (
            <>
                <Typography variant="subtitle2" sx={{ paddingX: 2, paddingTop: 1, color: 'text.secondary' }}>Pinned</Typography>
                {pinnedChats.map((chat) => (
                    <ChatListItem
                        key={chat._id}
                        chat={chat}
                        onSelect={() => handleSelectChat(chat)}
                        isSelected={selectedChat?._id === chat._id}
                        unreadCount={notifications.filter(n => n.chat._id === chat._id).length}
                        onlineUsers={onlineUsers} // NOUVEAU: Passe onlineUsers
                    />
                ))}
                <Divider />
            </>
        )}

        <Typography variant="subtitle2" sx={{ paddingX: 2, paddingTop: 1, color: 'text.secondary' }}>All Chats</Typography>
        {allChats.length === 0 && (
            <Typography variant="body2" sx={{ paddingX: 2, color: 'text.secondary' }}>
                No active chats. Start a new one!
            </Typography>
        )}
        {allChats.map((chat) => (
          <ChatListItem
            key={chat._id}
            chat={chat}
            onSelect={() => handleSelectChat(chat)}
            isSelected={selectedChat?._id === chat._id}
            unreadCount={notifications.filter(n => n.chat._id === chat._id).length}
            onlineUsers={onlineUsers} // NOUVEAU: Passe onlineUsers
          />
        ))}

        {archivedChats.length > 0 && (
            <>
                <Divider sx={{ marginTop: 2 }} />
                <Typography variant="subtitle2" sx={{ paddingX: 2, paddingTop: 1, color: 'text.secondary' }}>Archived</Typography>
                {archivedChats.map((chat) => (
                    <ChatListItem
                        key={chat._id}
                        chat={chat}
                        onSelect={() => handleSelectChat(chat)}
                        isSelected={selectedChat?._id === chat._id}
                        unreadCount={notifications.filter(n => n.chat._id === chat._id).length}
                        onlineUsers={onlineUsers} // NOUVEAU: Passe onlineUsers
                    />
                ))}
            </>
        )}
      </List>

      {/* New Chat Dialog */}
      <Dialog open={openNewChatDialog} onClose={() => setOpenNewChatDialog(false)}>
        <DialogTitle>Start New Chat</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Phone Number of User"
            type="tel"
            fullWidth
            variant="outlined"
            value={newChatPhone}
            onChange={(e) => setNewChatPhone(e.target.value)}
            error={!!newChatError}
            helperText={newChatError}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenNewChatDialog(false)}>Cancel</Button>
          <Button onClick={handleCreateNewChat} variant="contained">Create Chat</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ChatList;
