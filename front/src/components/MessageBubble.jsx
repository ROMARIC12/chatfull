import React from 'react';
import { Box, Typography, Avatar, Paper } from '@mui/material';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Check,
  DoneAll,
  Description,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

const MessageBubble = ({ message, isOwnMessage }) => {
  const { user } = useAuth();

  const bubbleStyle = {
    padding: 1.2,
    borderRadius: 2,
    maxWidth: '70%',
    wordBreak: 'break-word',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    marginBottom: 1,
    boxShadow: '0px 1px 2px rgba(0,0,0,0.1)',
  };

  const ownMessageStyle = {
    alignSelf: 'flex-end',
    backgroundColor: '#dcf8c6', // Light green for own messages
    borderBottomRightRadius: 0,
  };

  const otherMessageStyle = {
    alignSelf: 'flex-start',
    backgroundColor: '#ffffff', // White for other messages
    borderBottomLeftRadius: 0,
  };

  const senderNameStyle = {
    fontWeight: 'bold',
    fontSize: '0.75rem',
    marginBottom: 0.5,
    color: '#34b7f1', // A distinct color for sender name in groups
  };

  const timeStyle = {
    fontSize: '0.65rem',
    color: 'text.secondary',
    alignSelf: 'flex-end',
    marginTop: 0.5,
    display: 'flex',
    alignItems: 'center',
    marginLeft: 1, // Space for status icon
  };

  const renderMedia = (media) => {
    return media.map((m, index) => (
      <Box key={index} sx={{ my: 0.5, border: '1px solid #e0e0e0', borderRadius: 1, overflow: 'hidden' }}>
        {m.type === 'image' && (
          <img
            src={m.url}
            alt={m.fileName}
            style={{ maxWidth: '100%', maxHeight: '250px', borderRadius: 4, display: 'block' }}
            onError={(e) => { e.target.onerror = null; e.target.src = 'https://placehold.co/150x100/E0E0E0/000000?text=Image+Error'; }} // Fallback image
          />
        )}
        {m.type === 'video' && (
          <video controls style={{ maxWidth: '100%', maxHeight: '250px', borderRadius: 4, display: 'block' }}>
            <source src={m.url} type={m.mimetype} /> {/* Assurez-vous que m.mimetype est disponible */}
            Your browser does not support the video tag.
          </video>
        )}
        {m.type === 'audio' && (
          <audio controls style={{ width: '100%', borderRadius: 4, display: 'block' }}>
            <source src={m.url} type={m.mimetype} /> {/* Assurez-vous que m.mimetype est disponible */}
            Your browser does not support the audio element.
          </audio>
        )}
        {m.type === 'document' && (
          <Box sx={{ display: 'flex', alignItems: 'center', p: 1, backgroundColor: '#f0f0f0' }}>
            <Description sx={{ mr: 1, color: 'text.secondary' }} />
            <a href={m.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: 'primary.main' }}>
              <Typography variant="body2">{m.fileName}</Typography>
            </a>
          </Box>
        )}
        {/* Afficher le nom du fichier sous le média */}
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', p: 0.5 }}>
          {m.fileName}
        </Typography>
      </Box>
    ));
  };

  const getReadStatusIcon = () => {
    if (!isOwnMessage) return null;

    if (message.chat.isGroupChat) {
        const totalParticipants = message.chat.users.length;
        const readersCountExcludingSender = message.readBy.filter(id => id !== message.sender._id).length;
        const allOthersRead = readersCountExcludingSender === (totalParticipants - 1);

        if (allOthersRead) {
            return <DoneAll sx={{ fontSize: 14, color: '#4fc3f7', ml: 0.5 }} />;
        } else if (readersCountExcludingSender > 0) {
            return <DoneAll sx={{ fontSize: 14, color: 'text.secondary', ml: 0.5 }} />;
        } else {
            return <Check sx={{ fontSize: 14, color: 'text.secondary', ml: 0.5 }} />;
        }
    } else {
        const otherUser = message.chat.users.find(u => u._id !== user._id);
        const hasOtherUserRead = otherUser && message.readBy.includes(otherUser._id);
        if (hasOtherUserRead) {
            return <DoneAll sx={{ fontSize: 14, color: '#4fc3f7', ml: 0.5 }} />;
        } else {
            return <Check sx={{ fontSize: 14, color: 'text.secondary', ml: 0.5 }} />;
        }
    }
  };


  return (
    <Box sx={{ display: 'flex', justifyContent: isOwnMessage ? 'flex-end' : 'flex-start' }}>
      {!isOwnMessage && (
        <Avatar src={message.sender?.profilePicture || '/default-avatar.png'} alt={message.sender?.name || 'Unknown'} sx={{ width: 30, height: 30, mr: 1, mt: 0.5 }} />
      )}
      <Paper sx={{ ...bubbleStyle, ...(isOwnMessage ? ownMessageStyle : otherMessageStyle) }}>
        {message.chat.isGroupChat && !isOwnMessage && (
          <Typography variant="caption" sx={senderNameStyle}>
            {message.sender?.name || 'Unknown'}
          </Typography>
        )}
        {message.content && <Typography variant="body1">{message.content}</Typography>}
        {message.media && message.media.length > 0 && renderMedia(message.media)}
        <Typography variant="caption" sx={timeStyle}>
          {format(new Date(message.createdAt), 'HH:mm', { locale: fr })}
          {getReadStatusIcon()}
        </Typography>
      </Paper>
      {isOwnMessage && (
        <Avatar src={user?.profilePicture || '/default-avatar.png'} alt="You" sx={{ width: 30, height: 30, ml: 1, mt: 0.5 }} />
      )}
    </Box>
  );
};

export default MessageBubble;
