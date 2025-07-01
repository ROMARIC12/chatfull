import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { format } from 'date-fns';
import { Check, DoneAll } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

const MessageBubble = ({ message, isOwnMessage }) => {
  const { user } = useAuth(); // Current logged-in user

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
      <Box key={index} sx={{ my: 0.5 }}>
        {m.type === 'image' && (
          <img src={m.url} alt={m.fileName} style={{ maxWidth: '100%', maxHeight: '250px', borderRadius: 4 }} />
        )}
        {m.type === 'video' && (
          <video src={m.url} controls style={{ maxWidth: '100%', maxHeight: '250px', borderRadius: 4 }} />
        )}
        {m.type === 'audio' && (
          <audio src={m.url} controls style={{ width: '100%', borderRadius: 4 }} />
        )}
        {m.type === 'document' && (
          <Box sx={{ display: 'flex', alignItems: 'center', p: 1, border: '1px solid #eee', borderRadius: 1 }}>
            <Description sx={{ mr: 1, color: 'text.secondary' }} />
            <a href={m.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: 'primary.main' }}>
              <Typography variant="body2">{m.fileName}</Typography>
            </a>
          </Box>
        )}
      </Box>
    ));
  };

  const getReadStatusIcon = () => {
    if (!isOwnMessage) return null; // Only show status for own messages

    // If message is a group message, we need to check if all group members have read it
    // For 1-on-1, it's just if the other user has read it
    if (message.chat.isGroupChat) {
        const totalParticipants = message.chat.users.length;
        const readersCount = message.readBy.length;
        const allParticipantsRead = readersCount === totalParticipants; // Simplified for this example, exclude sender

        if (allParticipantsRead) {
            return <DoneAll sx={{ fontSize: 14, color: '#4fc3f7', ml: 0.5 }} />; // Blue double check for all read
        } else if (readersCount > 1) { // More than just the sender read it
            return <DoneAll sx={{ fontSize: 14, color: 'text.secondary', ml: 0.5 }} />; // Grey double check for some read
        } else if (readersCount === 1) { // Only sender in readBy (sent, not read by others yet)
            return <Check sx={{ fontSize: 14, color: 'text.secondary', ml: 0.5 }} />; // Single check (sent)
        }
        return <Check sx={{ fontSize: 14, color: 'text.secondary', ml: 0.5 }} />; // Default to single check if no one else read
    } else { // 1-on-1 chat
        const otherUser = message.chat.users.find(u => u._id !== user._id);
        const hasOtherUserRead = message.readBy.includes(otherUser._id);
        if (hasOtherUserRead) {
            return <DoneAll sx={{ fontSize: 14, color: '#4fc3f7', ml: 0.5 }} />; // Blue double check
        } else {
            return <Check sx={{ fontSize: 14, color: 'text.secondary', ml: 0.5 }} />; // Single check
        }
    }
  };


  return (
    <Box sx={{ display: 'flex', justifyContent: isOwnMessage ? 'flex-end' : 'flex-start' }}>
      <Paper sx={{ ...bubbleStyle, ...(isOwnMessage ? ownMessageStyle : otherMessageStyle) }}>
        {message.chat.isGroupChat && !isOwnMessage && (
          <Typography variant="caption" sx={senderNameStyle}>
            {message.sender.name}
          </Typography>
        )}
        {message.content && <Typography variant="body1">{message.content}</Typography>}
        {message.media && message.media.length > 0 && renderMedia(message.media)}
        <Typography variant="caption" sx={timeStyle}>
          {format(new Date(message.createdAt), 'HH:mm')}
          {getReadStatusIcon()}
        </Typography>
      </Paper>
    </Box>
  );
};

export default MessageBubble;