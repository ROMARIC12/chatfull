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
import { fr } from 'date-fns/locale'; // Importez la locale française

const ChatWindow = () => {
  const { user } = useAuth();
  // setMessages est maintenant correctement déstructuré
  const { selectedChat, messages, setMessages, fetchMessages, sendMessage, sendMedia, typingUsers, markMessageAsRead } = useChat();
  const { onlineUsers, sendTypingEvent } = useSocket();
  const [newMessage, setNewMessage] = useState('');
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [openMediaModal, setOpenMediaModal] = useState(false);
  const [chatMedia, setChatMedia] = useState([]);
  const [loadingMedia, setLoadingMedia] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

  // Effect pour charger les messages quand le chat sélectionné change
  useEffect(() => {
    let isMounted = true; // Flag pour éviter les mises à jour sur composant démonté
    if (selectedChat) {
      setLoadingMessages(true);
      fetchMessages(selectedChat._id).then(() => {
        if (isMounted) setLoadingMessages(false);
      }).catch(() => {
        if (isMounted) setLoadingMessages(false); // S'assurer que le loader s'arrête même en cas d'erreur
      });
    } else {
      if (isMounted) {
        setMessages([]); // Vider les messages si aucun chat n'est sélectionné
        setLoadingMessages(false); // Assurez-vous que le loader est désactivé
      }
    }
    return () => {
      isMounted = false; // Cleanup
    };
  }, [selectedChat?._id, fetchMessages, setMessages]); // Dépendance sur selectedChat._id pour éviter les re-déclenchements inutiles

  // Effect pour faire défiler vers le bas et marquer les messages lus
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

    // Marquer le dernier message comme lu si c'est de l'autre utilisateur et pas déjà lu
    if (selectedChat && messages.length > 0) {
        const lastMessage = messages[messages.length - 1];
        if (lastMessage.sender._id !== user._id && !lastMessage.readBy.includes(user._id)) {
            markMessageAsRead(lastMessage._id, selectedChat._id);
        }
    }
  }, [selectedChat, user, markMessageAsRead]); // 'messages' retiré des dépendances pour éviter la boucle infinie


  const handleSendMessage = async () => {
    if (newMessage.trim() === '') return;
    try {
      sendTypingEvent(selectedChat._id, false); // Arrêter l'événement de frappe
      setIsTyping(false); // Réinitialiser l'état local de frappe
      setNewMessage(''); // Vider le champ de message AVANT l'appel API pour une meilleure réactivité
      await sendMessage(newMessage, selectedChat._id);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault(); // Empêcher le retour à la ligne par défaut
      handleSendMessage();
    }
    // Gérer l'événement de frappe
    if (!isTyping && selectedChat) {
        setIsTyping(true);
        sendTypingEvent(selectedChat._id, true);
    }
    // Réinitialiser le timeout de "stop typing" à chaque frappe
    if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        sendTypingEvent(selectedChat._id, false);
    }, 3000); // Arrêter l'état de frappe après 3 secondes d'inactivité
  };

  const handleKeyUp = () => {
    // La logique de stop typing est maintenant dans handleKeyDown avec un debounce
  };

  const handleFileChange = async (event) => {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    try {
      await sendMedia(files, selectedChat._id);
      fileInputRef.current.value = null; // Clear input
    } catch (error) {
      console.error('Error sending media:', error);
    }
  };

  const fetchChatMedia = async () => {
    if (!selectedChat) return;
    setLoadingMedia(true);
    try {
      const config = {
        headers: { Authorization: `Bearer ${user.token}` },
      };
      const { data } = await axios.get(`${API_BASE_URL}/chats/${selectedChat._id}/media`, config);
      setChatMedia(data);
      setOpenMediaModal(true);
    } catch (error) {
      console.error('Failed to fetch chat media:', error);
    } finally {
      setLoadingMedia(false);
    }
  };


  if (!selectedChat) {
    return (
      <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <Typography variant="h5" color="text.secondary">
          Select a chat to start messaging
        </Typography>
      </Box>
    );
  }

  const otherUser = selectedChat.isGroupChat
    ? null
    : selectedChat.users.find((u) => u._id !== user._id);

  const getChatStatus = () => {
    if (selectedChat.isGroupChat) {
        if (typingUsers[selectedChat._id]) { // Si quelqu'un est en train de taper dans ce groupe
            return 'Someone is typing...';
        }
        return `${selectedChat.users.length} members`;
    } else {
        if (!otherUser) return '';
        const status = onlineUsers[otherUser._id]?.status;
        const lastSeen = onlineUsers[otherUser._id]?.lastSeen;

        if (typingUsers[selectedChat._id]) { // Si l'autre utilisateur tape dans ce chat 1-1
            return 'typing...';
        }

        if (status === 'online') return 'online';
        if (lastSeen) return `last seen ${format(new Date(lastSeen), 'p', { locale: fr })}`; // Utiliser la locale française
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
          messages.map((message) => (
            <MessageBubble key={message._id} message={message} isOwnMessage={message.sender._id === user._id} />
          ))
        )}
        <div ref={messagesEndRef} />
      </Box>

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

      {/* Media Modal */}
      <Dialog open={openMediaModal} onClose={() => setOpenMediaModal(false)} maxWidth="md" fullWidth>
        <DialogTitle>Media, Links & Docs ({chatMedia.length})</DialogTitle>
        <DialogContent dividers>
          {loadingMedia ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
              <CircularProgress />
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
              {chatMedia.length === 0 && (
                <Typography variant="body2" sx={{ p: 2 }}>No media shared in this chat yet.</Typography>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenMediaModal(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ChatWindow;
