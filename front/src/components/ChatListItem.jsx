import React from 'react';
import {
  ListItem,
  ListItemAvatar,
  Avatar,
  ListItemText,
  Typography,
  Box,
  Menu,
  MenuItem,
  ListItemIcon,
} from '@mui/material';
import {
  PushPin as PinIcon,
  Archive as ArchiveIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useChat } from '../contexts/ChatContext';
import { formatDistanceToNowStrict } from 'date-fns';
import { fr } from 'date-fns/locale'; // Import French locale

const ChatListItem = ({ chat, onSelect, isSelected, unreadCount }) => {
  const { user: currentUser } = useAuth();
  const { pinChat, archiveChat } = useChat();
  const [anchorEl, setAnchorEl] = React.useState(null);
  const openMenu = Boolean(anchorEl);

  const otherUser = chat.isGroupChat ? null : chat.users.find((u) => u._id !== currentUser._id);
  const chatName = chat.isGroupChat ? chat.chatName : otherUser?.name || 'Unknown User';
  const chatAvatar = chat.isGroupChat ? '/group-avatar.png' : otherUser?.profilePicture || '/default-avatar.png';
  const lastMessageContent = chat.latestMessage?.content || (chat.latestMessage?.media?.length > 0 ? `Media (${chat.latestMessage.media.length})` : '');
  const lastMessageTime = chat.latestMessage?.createdAt
    ? formatDistanceToNowStrict(new Date(chat.latestMessage.createdAt), { addSuffix: true, locale: fr })
    : '';

  const handleContextMenu = (event) => {
    event.preventDefault();
    setAnchorEl(event.currentTarget);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
  };

  const handlePinToggle = async () => {
    await pinChat(chat._id);
    handleCloseMenu();
  };

  const handleArchiveToggle = async () => {
    await archiveChat(chat._id);
    handleCloseMenu();
  };

  const handleDeleteChat = () => {
    console.log(`Delete chat: ${chat._id}`);
    handleCloseMenu();
  };


  return (
    <ListItem
      button
      onClick={onSelect}
      onContextMenu={handleContextMenu}
      sx={{
        backgroundColor: isSelected ? '#e0e0e0' : 'transparent',
        '&:hover': {
          backgroundColor: '#f0f0f0',
        },
        paddingY: 1.5,
        paddingX: 2,
      }}
    >
      <ListItemAvatar>
        <Avatar src={chatAvatar} alt={chatName} />
      </ListItemAvatar>
      <ListItemText
        primary={
          <Typography component="div" variant="subtitle1" sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 'bold' }}>
            {chatName}
            <Typography variant="caption" color="text.secondary">
              {lastMessageTime}
            </Typography>
          </Typography>
        }
        secondary={
          <Typography component="div" variant="body2" sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography component="span" color="text.secondary" noWrap sx={{ maxWidth: '80%' }}>
              {lastMessageContent}
            </Typography>
            {unreadCount > 0 && (
              <Box
                sx={{
                  backgroundColor: 'primary.main',
                  color: 'white',
                  borderRadius: '50%',
                  width: 20,
                  height: 20,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem',
                  fontWeight: 'bold',
                }}
              >
                {unreadCount}
              </Box>
            )}
          </Typography>
        }
      />
      <Menu
        anchorEl={anchorEl}
        open={openMenu}
        onClose={handleCloseMenu}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <MenuItem onClick={handlePinToggle}>
          <ListItemIcon>
            <PinIcon fontSize="small" />
          </ListItemIcon>
          {chat.isPinned ? 'Unpin Chat' : 'Pin Chat'}
        </MenuItem>
        <MenuItem onClick={handleArchiveToggle}>
          <ListItemIcon>
            <ArchiveIcon fontSize="small" />
          </ListItemIcon>
          {chat.isArchived ? 'Unarchive Chat' : 'Archive Chat'}
        </MenuItem>
      </Menu>
    </ListItem>
  );
};

export default ChatListItem;
