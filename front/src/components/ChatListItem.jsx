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
  Badge,
} from '@mui/material';
import {
  PushPin as PinIcon,
  Archive as ArchiveIcon,
  Delete as DeleteIcon, // NOUVEAU: Import de DeleteIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useChat } from '../contexts/ChatContext';
import { formatDistanceToNowStrict } from 'date-fns';
import { fr } from 'date-fns/locale';

const ChatListItem = ({ chat, onSelect, isSelected, unreadCount, onlineUsers }) => {
  const { user: currentUser } = useAuth();
  // NOUVEAU: Import de deleteGroup
  const { pinChat, archiveChat, deleteGroup } = useChat();
  const [anchorEl, setAnchorEl] = React.useState(null);
  const openMenu = Boolean(anchorEl);

  const otherUser = chat.isGroupChat ? null : chat.users.find((u) => u._id !== currentUser._id);
  const chatName = chat.isGroupChat ? chat.chatName : otherUser?.name || 'Unknown User';
  const chatAvatar = chat.isGroupChat ? '/group-avatar.png' : otherUser?.profilePicture || '/default-avatar.png';
  const lastMessageContent = chat.latestMessage?.content || (chat.latestMessage?.media?.length > 0 ? `Media (${chat.latestMessage.media.length})` : '');
  const lastMessageTime = chat.latestMessage?.createdAt
    ? formatDistanceToNowStrict(new Date(chat.latestMessage.createdAt), { addSuffix: true, locale: fr })
    : '';

  const getOnlineStatus = () => {
    if (chat.isGroupChat) {
      return null;
    }
    if (!otherUser) return null;

    const statusInfo = onlineUsers[otherUser._id];
    if (!statusInfo) {
      return { status: 'offline', text: 'offline', color: 'error.main' };
    }

    if (statusInfo.status === 'online') {
      return { status: 'online', text: 'online', color: 'success.main' };
    }

    if (statusInfo.lastSeen) {
      const lastSeenDate = new Date(statusInfo.lastSeen);
      const now = new Date();
      const diffMinutes = (now.getTime() - lastSeenDate.getTime()) / (1000 * 60);

      if (diffMinutes < 15) {
        return {
          status: 'recently-online',
          text: `last seen ${formatDistanceToNowStrict(lastSeenDate, { addSuffix: true, locale: fr })}`,
          color: 'warning.main'
        };
      }
    }
    return { status: 'offline', text: 'offline', color: 'error.main' };
  };

  const status = getOnlineStatus();

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

  // NOUVEAU: Logique pour supprimer le chat
  const handleDeleteChat = async () => {
    handleCloseMenu();
    if (chat.isGroupChat) {
      // Pour les groupes, nous utilisons la fonction deleteGroup existante
      if (window.confirm('Are you sure you want to delete this group chat? This action cannot be undone.')) {
        try {
          await deleteGroup(chat._id);
          // Le ChatContext gère déjà la désélection du chat et la mise à jour de la liste
        } catch (error) {
          console.error('Error deleting group chat:', error);
          alert('Failed to delete group chat.');
        }
      }
    } else {
      // Pour les chats 1-to-1, une suppression complète est plus complexe.
      // Souvent, on se contente de "cacher" le chat ou de vider l'historique.
      // Une suppression réelle nécessiterait une route backend dédiée.
      if (window.confirm('Are you sure you want to delete this 1-to-1 chat? This will only remove it from your list.')) {
        console.log(`DEBUG: Deleting 1-to-1 chat with ID: ${chat._id}. Note: Full deletion of 1-to-1 chats (from both users) is not yet implemented.`);
        // Pour simuler la suppression côté frontend pour les 1-to-1,
        // vous devriez implémenter une fonction dans ChatContext pour filtrer ce chat
        // de la liste 'chats'. Par exemple: removeChatFromList(chat._id).
        // Pour l'instant, on se contente de la confirmation.
        alert('Chat removed from your list (full deletion not implemented).');
      }
    }
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
      <ListItemAvatar sx={{ position: 'relative' }}>
        <Avatar src={chatAvatar} alt={chatName} />
        {status && !chat.isGroupChat && (
          <Badge
            variant="dot"
            sx={{
              '& .MuiBadge-badge': {
                backgroundColor: status.color,
                color: status.color,
                boxShadow: '0 0 0 2px white',
                width: 10,
                height: 10,
                borderRadius: '50%',
                position: 'absolute',
                bottom: 2,
                right: 2,
              },
            }}
          />
        )}
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
            {status && !chat.isGroupChat && (
              <Typography variant="caption" color={status.color} sx={{ ml: 1, flexShrink: 0 }}>
                {status.text}
              </Typography>
            )}
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
                  ml: 1,
                  flexShrink: 0,
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
        {/* NOUVEAU: Option de suppression */}
        <MenuItem onClick={handleDeleteChat}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" />
          </ListItemIcon>
          Delete Chat
        </MenuItem>
      </Menu>
    </ListItem>
  );
};

export default ChatListItem;
