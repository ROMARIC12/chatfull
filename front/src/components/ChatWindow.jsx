import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  AppBar,
  Toolbar,
  Avatar,
  Typography,
  IconButton,
  TextField,
  InputAdornment,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  Grid,
  DialogActions,
  Button
} from '@mui/material';
import {
  AttachFile as AttachFileIcon,
  Send as SendIcon,
  MoreVert as MoreVertIcon,
  VideoCall as VideoCallIcon,
  Call as CallIcon,
  Image as ImageIcon,
  Audiotrack as AudioIcon,
  Description as DocumentIcon,
} from '@mui/icons-material';
import MessageBubble from './MessageBubble';
import { useChat } from '../contexts/ChatContext';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import axios from 'axios';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const ChatWindow = () => {
  const { user } = useAuth();
  const {
    selectedChat,
    messages,
    setMessages,
    fetchMessages,
    sendMessage,
    sendMedia,
    typingUsers,
    markMessageAsRead,
    chatMedia,
    openChatMediaModal,
    setOpenChatMediaModal,
  } = useChat();
  const { onlineUsers, sendTypingEvent } = useSocket();
  const [newMessage, setNewMessage] = useState('');
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

  // Vérifie si l'utilisateur actuel est membre du chat sélectionné
  const isUserMemberOfSelectedChat = selectedChat?.users?.some(member => member._id === user._id);

  useEffect(() => {
    let isMounted = true;
    console.log(`DEBUG ChatWindow: selectedChat changed to: ${selectedChat?._id}`);
    if (selectedChat) {
      setLoadingMessages(true);
      fetchMessages(selectedChat._id).then(() => {
        if (isMounted) setLoadingMessages(false);
      }).catch(() => {
        if (isMounted) setLoadingMessages(false);
      });
      // fetchChatMedia est maintenant appelé dans selectChat du ChatContext
    } else {
      if (isMounted) {
        setMessages([]);
        setLoadingMessages(false);
      }
    }
    return () => {
      isMounted = false;
    };
  }, [selectedChat?._id, fetchMessages, setMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

    if (selectedChat && messages.length > 0) {
        const lastMessage = messages[messages.length - 1];
        if (lastMessage.sender._id !== user._id && !lastMessage.readBy.includes(user._id)) {
            markMessageAsRead(lastMessage._id, selectedChat._id);
        }
    }
  }, [selectedChat, user, markMessageAsRead, messages]);


  const handleSendMessage = async () => {
    if (newMessage.trim() === '') return;
    if (!isUserMemberOfSelectedChat) {
        console.warn("Attempted to send message while not a member of the chat.");
        return;
    }
    try {
      sendTypingEvent(selectedChat._id, false);
      setIsTyping(false);
      setNewMessage('');
      await sendMessage(newMessage, selectedChat._id);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSendMessage();
    }
    if (!isTyping && selectedChat && isUserMemberOfSelectedChat) {
        setIsTyping(true);
        sendTypingEvent(selectedChat._id, true);
    }
    if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        sendTypingEvent(selectedChat._id, false);
    }, 3000);
  };

  const handleKeyUp = () => {};

  const handleFileChange = async (event) => {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    if (!selectedChat || !selectedChat._id || !isUserMemberOfSelectedChat) {
        console.error("No chat selected or user is not a member to send media.");
        return;
    }

    try {
      await sendMedia(files, selectedChat._id);
      event.target.value = null;
    } catch (error) {
      console.error('Error sending media:', error);
    }
  };


  if (!selectedChat) {
    console.log("DEBUG ChatWindow: No chat selected, showing placeholder message.");
    return (
      <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <Typography variant="h5" color="text.secondary">
          Select a chat to start messaging
        </Typography>
      </Box>
    );
  }

  console.log("DEBUG ChatWindow: Rendering ChatWindow for selectedChat:", selectedChat);
  console.log("DEBUG ChatWindow: Current messages state:", messages);
  console.log("DEBUG ChatWindow: Is user member of selected chat?", isUserMemberOfSelectedChat);


  const otherUser = selectedChat.isGroupChat
    ? null
    : selectedChat.users.find((u) => u._id !== user._id);

  const getChatStatus = () => {
    if (selectedChat.isGroupChat) {
        if (typingUsers[selectedChat._id]) {
            return 'Someone is typing...';
        }
        return `${selectedChat.users.length} members`;
    } else {
        if (!otherUser) return '';
        const status = onlineUsers[otherUser._id]?.status;
        const lastSeen = onlineUsers[otherUser._id]?.lastSeen;

        if (typingUsers[selectedChat._id]) {
            return 'typing...';
        }

        if (status === 'online') return 'online';
        if (lastSeen) return `last seen ${format(new Date(lastSeen), 'p', { locale: fr })}`;
        return 'offline';
    }
  };


  return (
    <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
      <AppBar position="static" color="default" elevation={0} sx={{ borderBottom: '1px solid #e0e0e0' }}>
        <Toolbar>
          <Avatar
            src={selectedChat.isGroupChat ? '/group-avatar.png' : otherUser?.profilePicture || '/default-avatar.png'}
            alt={selectedChat.isGroupChat ? selectedChat.chatName : otherUser?.name}
            sx={{ marginRight: 1 }}
          />
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6">
              {selectedChat.isGroupChat ? selectedChat.chatName : otherUser?.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {getChatStatus()}
            </Typography>
          </Box>
          <IconButton color="inherit">
            <VideoCallIcon />
          </IconButton>
          <IconButton color="inherit">
            <CallIcon />
          </IconButton>
          <IconButton color="inherit">
            <MoreVertIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Box sx={{ flexGrow: 1, overflowY: 'auto', padding: 2, backgroundImage: 'url("/chat-wallpaper.png")', backgroundSize: 'cover' }}>
        {loadingMessages ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <CircularProgress />
          </Box>
        ) : (
          // NOUVEAU: Condition pour afficher les messages
          selectedChat.isGroupChat && !isUserMemberOfSelectedChat ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
                You are no longer a member of this group. Messages are not visible.
              </Typography>
            </Box>
          ) : (
            messages.map((message) => (
              <MessageBubble key={message._id} message={message} isOwnMessage={message.sender._id === user._id} />
            ))
          )
        )}
        <div ref={messagesEndRef} />
      </Box>

      {/* Barre de saisie de message conditionnelle */}
      {selectedChat.isGroupChat && !isUserMemberOfSelectedChat ? (
        <Box sx={{ padding: 2, borderTop: '1px solid #e0e0e0', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f2f5', minHeight: 60 }}>
          <Typography variant="body2" color="error" sx={{ textAlign: 'center' }}>
            You cannot send messages to this group. You are no longer a member.
          </Typography>
        </Box>
      ) : (
        <Box sx={{ padding: 2, borderTop: '1px solid #e0e0e0', display: 'flex', alignItems: 'center', backgroundColor: '#f0f2f5' }}>
          <input
            type="file"
            multiple
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
          <IconButton onClick={() => fileInputRef.current.click()} color="primary" sx={{ marginRight: 1 }}>
            <AttachFileIcon />
          </IconButton>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Write a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            onKeyUp={handleKeyUp}
            size="small"
            sx={{
              backgroundColor: 'white',
              borderRadius: 2,
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
                paddingRight: 0.5,
              },
            }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton color="primary" onClick={handleSendMessage} disabled={newMessage.trim() === ''}>
                    <SendIcon />
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </Box>
      )}

      {/* Media Modal - Contrôlé par ChatContext */}
      <Dialog open={openChatMediaModal} onClose={() => setOpenChatMediaModal(false)} maxWidth="md" fullWidth>
        <DialogTitle>Media, Links & Docs ({chatMedia.length})</DialogTitle>
        <DialogContent dividers>
          {chatMedia.length === 0 ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
              <Typography variant="body2" color="text.secondary">No media shared in this chat yet.</Typography>
            </Box>
          ) : (
            <Grid container spacing={2}>
              {chatMedia.map((media, index) => (
                <Grid item xs={12} sm={6} md={4} key={index}>
                  <Box sx={{ border: '1px solid #e0e0e0', borderRadius: 1, overflow: 'hidden' }}>
                    {media.type === 'image' && (
                      <img src={media.url} alt={media.fileName} style={{ width: '100%', height: 150, objectFit: 'cover' }} />
                    )}
                    {media.type === 'video' && (
                      <video src={media.url} controls style={{ width: '100%', height: 150, objectFit: 'cover' }} />
                    )}
                    {media.type === 'audio' && (
                      <audio src={media.url} controls style={{ width: '100%' }} />
                    )}
                    {media.type === 'document' && (
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 150, backgroundColor: '#f5f5f5' }}>
                        <DocumentIcon sx={{ fontSize: 40, color: 'text.secondary' }} />
                        <Typography variant="body2" sx={{ ml: 1 }}>{media.fileName}</Typography>
                      </Box>
                    )}
                    <Box sx={{ p: 1 }}>
                      <Typography variant="caption" color="text.secondary">{media.fileName}</Typography>
                      <Typography variant="caption" display="block" color="text.disabled">
                        Sent by {media.sender} on {format(new Date(media.createdAt), 'MMM dd, HH:mm', { locale: fr })}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
              ))}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenChatMediaModal(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ChatWindow;
