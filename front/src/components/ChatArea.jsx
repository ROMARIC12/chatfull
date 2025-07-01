// src/components/ChatArea.jsx
import React, { useState, useEffect, useRef } from 'react';
import { 
  Box, AppBar, Toolbar, IconButton, Typography, Avatar, 
  Badge, TextField, Button, List, ListItem, ListItemText,
  ListItemAvatar, Divider, Paper, useMediaQuery, useTheme,
  Fab, Popover, Input
} from '@mui/material';
import { 
  ArrowBack, Search, AttachFile, MoreVert, Mic, 
  InsertEmoticon, Send, Call, Videocam, 
  Image, Close, CheckCircle, CameraAlt
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useChat } from '../contexts/ChatContext';
import { useSocket } from '../contexts/SocketContext';
import { useCall } from '../contexts/CallContext';
import EmojiPicker from 'emoji-picker-react';

const ChatArea = ({ selectedChat, setSelectedChat, setShowProfile, isMobile }) => {
  const { user } = useAuth();
  const { sendMessage, sendMediaMessage, messages, loadMessages, mediaPreview, setMediaPreview } = useChat();
  const { socket } = useSocket();
  const { startCall } = useCall();
  const [newMessage, setNewMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [fileInput, setFileInput] = useState(null);
  const messagesEndRef = useRef(null);
  const theme = useTheme();
  
  const otherUser = selectedChat?.participants?.find(p => p._id !== user._id);
  
  useEffect(() => {
    if (selectedChat) {
      loadMessages(selectedChat._id);
    }
  }, [selectedChat, loadMessages]);
  
  useEffect(() => {
    if (socket && selectedChat) {
      socket.emit('joinRoom', selectedChat._id);
    }
    
    return () => {
      if (socket && selectedChat) {
        socket.emit('leaveRoom', selectedChat._id);
      }
    };
  }, [socket, selectedChat]);
  
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  const handleSendMessage = () => {
    if (newMessage.trim() === '' && !mediaPreview) return;
    
    if (mediaPreview) {
      sendMediaMessage(mediaPreview.file, selectedChat._id);
      setMediaPreview(null);
    } else {
      sendMessage({
        chat: selectedChat._id,
        sender: user._id,
        content: newMessage,
      });
    }
    
    setNewMessage('');
  };
  
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  const handleVoiceCall = () => {
    startCall(otherUser, 'voice');
  };
  
  const handleVideoCall = () => {
    startCall(otherUser, 'video');
  };
  
  const handleEmojiClick = (emoji) => {
    setNewMessage(prev => prev + emoji.emoji);
  };
  
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setMediaPreview({
          url: e.target.result,
          file,
          type: file.type.startsWith('image') ? 'image' : 'file'
        });
      };
      reader.readAsDataURL(file);
    }
    e.target.value = null;
  };
  
  if (!selectedChat) {
    return (
      <Box sx={{ 
        flexGrow: 1, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        bgcolor: 'background.default',
        backgroundImage: 'url(whatsapp-bg.png)',
        backgroundSize: 'cover',
        backgroundRepeat: 'no-repeat'
      }}>
        <Typography variant="h6" color="textSecondary">
          Sélectionnez une discussion pour commencer à discuter
        </Typography>
      </Box>
    );
  }
  
  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      flexGrow: 1, 
      height: '100vh',
      bgcolor: 'background.default',
      backgroundImage: 'url(whatsapp-bg.png)',
      backgroundSize: 'cover',
      backgroundRepeat: 'no-repeat'
    }}>
      {/* En-tête du chat */}
      <AppBar 
        position="static" 
        color="inherit" 
        elevation={0}
        sx={{ 
          borderBottom: '1px solid', 
          borderColor: 'divider',
          bgcolor: 'background.paper'
        }}
      >
        <Toolbar>
          {isMobile && (
            <IconButton
              edge="start"
              color="inherit"
              onClick={() => setSelectedChat(null)}
              sx={{ mr: 2 }}
            >
              <ArrowBack />
            </IconButton>
          )}
          <IconButton onClick={() => setShowProfile(true)}>
            <Avatar src={otherUser?.profilePic} alt={otherUser?.name} />
          </IconButton>
          <Box sx={{ flexGrow: 1, ml: 2 }}>
            <Typography variant="subtitle1">{otherUser?.name}</Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {otherUser?.online ? 'En ligne' : 'Hors ligne'}
            </Typography>
          </Box>
          <IconButton color="inherit" onClick={handleVoiceCall}>
            <Call />
          </IconButton>
          <IconButton color="inherit" onClick={handleVideoCall}>
            <Videocam />
          </IconButton>
          <IconButton color="inherit">
            <Search />
          </IconButton>
          <IconButton color="inherit">
            <MoreVert />
          </IconButton>
        </Toolbar>
      </AppBar>
      
      {/* Messages Area */}
      <Box 
        sx={{ 
          flexGrow: 1, 
          overflowY: 'auto', 
          p: 2,
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <List sx={{ flexGrow: 1 }}>
          {messages.map((message) => (
            <MessageItem 
              key={message._id} 
              message={message} 
              isOwn={message.sender._id === user._id} 
            />
          ))}
          <div ref={messagesEndRef} />
        </List>
      </Box>
      
      {/* Zone de saisie du message */}
      <Paper 
        elevation={0} 
        sx={{ 
          p: 1, 
          display: 'flex', 
          alignItems: 'center', 
          bgcolor: 'background.paper',
          borderTop: '1px solid',
          borderColor: 'divider',
          position: 'relative'
        }}
      >
        {mediaPreview && (
          <Box sx={{ 
            position: 'absolute', 
            bottom: '100%', 
            left: 0, 
            right: 0, 
            bgcolor: 'background.paper',
            p: 2,
            display: 'flex',
            alignItems: 'center',
            boxShadow: 3
          }}>
            {mediaPreview.type === 'image' ? (
              <img 
                src={mediaPreview.url} 
                alt="Preview" 
                style={{ 
                  maxHeight: 200, 
                  maxWidth: 200, 
                  borderRadius: 4,
                  marginRight: 16
                }} 
              />
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
                <AttachFile sx={{ mr: 1 }} />
                <Typography variant="body2">{mediaPreview.file.name}</Typography>
              </Box>
            )}
            <IconButton onClick={() => setMediaPreview(null)}>
              <Close />
            </IconButton>
          </Box>
        )}
        
        <IconButton onClick={() => setShowEmojiPicker(!showEmojiPicker)}>
          <InsertEmoticon />
        </IconButton>
        
        {showEmojiPicker && (
          <Box sx={{ 
            position: 'absolute', 
            bottom: '100%', 
            left: 0, 
            zIndex: 10 
          }}>
            <EmojiPicker 
              onEmojiClick={handleEmojiClick} 
              width="100%" 
              height={350} 
            />
          </Box>
        )}
        
        <IconButton component="label">
          <Input 
            type="file" 
            sx={{ display: 'none' }} 
            onChange={handleFileChange}
            inputProps={{ 
              accept: 'image/*,video/*,audio/*,application/pdf,.doc,.docx' 
            }}
          />
          <AttachFile />
        </IconButton>
        
        <IconButton component="label">
          <Input 
            type="file" 
            sx={{ display: 'none' }} 
            onChange={handleFileChange}
            inputProps={{ accept: 'image/*' }}
          />
          <CameraAlt />
        </IconButton>
        
        <TextField
          fullWidth
          multiline
          maxRows={4}
          variant="outlined"
          placeholder="Écrivez un message"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          sx={{ 
            mx: 1, 
            bgcolor: 'background.default',
            borderRadius: 4,
            '& .MuiOutlinedInput-root': {
              borderRadius: 4,
            }
          }}
        />
        
        {newMessage || mediaPreview ? (
          <IconButton 
            color="primary" 
            onClick={handleSendMessage}
            sx={{ bgcolor: 'primary.main', color: 'white', '&:hover': { bgcolor: 'primary.dark' } }}
          >
            <Send />
          </IconButton>
        ) : (
          <IconButton color="primary">
            <Mic />
          </IconButton>
        )}
      </Paper>
    </Box>
  );
};

const MessageItem = ({ message, isOwn }) => {
  return (
    <ListItem sx={{ 
      justifyContent: isOwn ? 'flex-end' : 'flex-start',
      px: 2,
      py: 0.5
    }}>
      <Box sx={{
        display: 'flex',
        flexDirection: isOwn ? 'row-reverse' : 'row',
        alignItems: 'flex-end',
        maxWidth: '75%'
      }}>
        {!isOwn && (
          <ListItemAvatar>
            <Avatar 
              src={message.sender.profilePic} 
              alt={message.sender.name} 
              sx={{ width: 28, height: 28 }} 
            />
          </ListItemAvatar>
        )}
        
        <Paper
          elevation={0}
          sx={{
            p: 1.5,
            borderRadius: isOwn ? '18px 18px 0 18px' : '18px 18px 18px 0',
            bgcolor: isOwn ? '#d9fdd3' : 'white',
          }}
        >
          {message.mediaUrl ? (
            message.mediaType === 'image' ? (
              <img 
                src={message.mediaUrl} 
                alt="Media" 
                style={{ 
                  maxWidth: 250, 
                  maxHeight: 250, 
                  borderRadius: 8,
                  marginBottom: 8
                }} 
              />
            ) : (
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center',
                bgcolor: '#f0f2f5',
                p: 1,
                borderRadius: 1
              }}>
                <AttachFile sx={{ mr: 1 }} />
                <Typography variant="body2">Fichier joint</Typography>
              </Box>
            )
          ) : null}
          
          <ListItemText 
            primary={message.content} 
            primaryTypographyProps={{ 
              color: 'text.primary',
              sx: { wordBreak: 'break-word' }
            }}
            secondary={
              <Typography 
                variant="caption" 
                sx={{ 
                  display: 'block', 
                  textAlign: 'right', 
                  color: 'text.secondary' 
                }}
              >
                {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Typography>
            }
          />
        </Paper>
      </Box>
    </ListItem>
  );
};

export default ChatArea;