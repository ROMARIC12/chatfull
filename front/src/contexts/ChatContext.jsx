import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';
import { useSocket } from './SocketContext';

const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const { user } = useAuth();
  const { socket, isConnected } = useSocket();
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [typingUsers, setTypingUsers] = useState({}); // {chatId: true/false}
  const [publicGroups, setPublicGroups] = useState([]); // Nouveau state pour les groupes publics

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

  // Fonction pour récupérer les messages, stabilisée avec useCallback
  const fetchMessages = useCallback(async (chatId) => {
    if (!chatId || !user || !user.token) {
        setMessages([]);
        return;
    }
    try {
      const config = {
        headers: { Authorization: `Bearer ${user.token}` },
      };
      const { data } = await axios.get(`${API_BASE_URL}/messages/${chatId}`, config);
      setMessages(data);
      socket?.emit('join chat', chatId); // Utiliser l'opérateur optionnel pour socket
    } catch (error) {
      console.error('Failed to fetch messages:', error);
      setMessages([]);
    }
  }, [user, socket, API_BASE_URL]); // Dépendances de fetchMessages

  // Fonction pour sélectionner un chat et récupérer ses messages, stabilisée avec useCallback
  // Ceci est crucial pour éviter les boucles de rendu en passant une référence d'objet stable
  const selectChat = useCallback(async (chatId) => {
    const chatToSelect = chats.find(chat => chat._id === chatId);
    if (chatToSelect) {
        setSelectedChat(chatToSelect); // Définir le chat sélectionné à partir du tableau 'chats' existant
        await fetchMessages(chatId); // Récupérer les messages pour ce chat
    } else {
        setSelectedChat(null);
        setMessages([]);
    }
  }, [chats, fetchMessages]); // Dépend de 'chats' pour trouver l'objet, et de 'fetchMessages'

  // Fetch chats on user login
  useEffect(() => {
    const fetchUserChats = async () => {
      if (user && user.token) {
        try {
          const config = {
            headers: { Authorization: `Bearer ${user.token}` },
          };
          const { data } = await axios.get(`${API_BASE_URL}/chats`, config);
          // Dédupliquer les chats au chargement initial
          const uniqueChatsMap = new Map();
          data.forEach(chat => uniqueChatsMap.set(chat._id, chat));
          setChats(Array.from(uniqueChatsMap.values()));
        } catch (error) {
          console.error('Failed to fetch chats:', error);
          if (error.response && error.response.status === 401) {
              console.log('Token invalid or expired, please log in again.');
          }
        }
      } else {
        setChats([]);
        setSelectedChat(null);
        setMessages([]);
        setNotifications([]);
        setTypingUsers({});
      }
    };
    fetchUserChats();
  }, [user?.token, API_BASE_URL]);

  // Fetch all public groups (for the "Join Group" feature)
  useEffect(() => {
    const fetchAllPublicGroups = async () => {
      if (user && user.token) {
        try {
          const config = {
            headers: { Authorization: `Bearer ${user.token}` },
          };
          const { data } = await axios.get(`${API_BASE_URL}/chats/all-groups`, config); // Endpoint à créer au backend
          setPublicGroups(data);
        } catch (error) {
          console.error('Failed to fetch public groups:', error);
        }
      } else {
        setPublicGroups([]);
      }
    };
    fetchAllPublicGroups();
  }, [user?.token, API_BASE_URL]);


  // Socket.IO listeners for real-time updates
  useEffect(() => {
    if (socket) {
      socket.on('message received', (newMessageReceived) => {
        // Mettre à jour le dernier message dans la liste des chats
        setChats(prevChats => prevChats.map(chat =>
            chat._id === newMessageReceived.chat._id
                ? { ...chat, latestMessage: newMessageReceived }
                : chat
        ));

        // Si le message est pour le chat actuellement sélectionné, l'ajouter aux messages
        if (selectedChat && selectedChat._id === newMessageReceived.chat._id) {
          // Vérifier si le message n'est pas déjà dans l'état pour éviter les doublons
          // (utile si l'émetteur reçoit aussi son propre message via socket)
          setMessages(prevMessages => {
            if (!prevMessages.some(msg => msg._id === newMessageReceived._id)) {
              return [...prevMessages, newMessageReceived];
            }
            return prevMessages;
          });
        } else {
          // Ajouter aux notifications si pas dans le chat actuel ET pas déjà notifié
          if (!notifications.some(notif => notif._id === newMessageReceived._id)) {
            setNotifications(prev => [newMessageReceived, ...prev]);
          }
        }
      });

      socket.on('typing', (chatId) => {
        setTypingUsers(prev => ({
            ...prev,
            [chatId]: true
        }));
      });

      socket.on('stop typing', (chatId) => {
        setTypingUsers(prev => {
            const newTypingUsers = { ...prev };
            delete newTypingUsers[chatId];
            return newTypingUsers;
        });
      });

      socket.on('message read', ({ messageId, userId }) => {
        setMessages(prevMessages => prevMessages.map(msg =>
            msg._id === messageId && !msg.readBy.includes(userId)
                ? { ...msg, readBy: [...msg.readBy, userId] }
                : msg
        ));
      });

      // Gérer la mise à jour d'un chat (ex: renommage de groupe, épinglage, archivage)
      socket.on('chat updated', (updatedChat) => {
        setChats(prevChats => prevChats.map(chat =>
          chat._id === updatedChat._id ? updatedChat : chat
        ));
        // Si le chat mis à jour est celui sélectionné, le mettre à jour aussi
        if (selectedChat && selectedChat._id === updatedChat._id) {
          setSelectedChat(updatedChat);
        }
      });

      // Gérer la suppression d'un chat (ex: suppression de groupe)
      socket.on('chat deleted', (deletedChatId) => {
        setChats(prevChats => prevChats.filter(chat => chat._id !== deletedChatId));
        if (selectedChat && selectedChat._id === deletedChatId) {
          setSelectedChat(null);
          setMessages([]);
        }
      });


      return () => {
        socket.off('message received');
        socket.off('typing');
        socket.off('stop typing');
        socket.off('message read');
        socket.off('chat updated');
        socket.off('chat deleted');
      };
    }
  }, [socket, selectedChat, notifications, user]); // selectedChat est une dépendance car il est utilisé dans le callback


  // Fonction pour envoyer un message (texte), stabilisée avec useCallback
  const sendMessage = useCallback(async (content, chatId) => {
    if (!content || !chatId || !user || !user.token) return;
    try {
      const config = {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
        },
      };
      const { data } = await axios.post(`${API_BASE_URL}/messages`, { content, chatId }, config);
      setMessages(prevMessages => [...prevMessages, data]);
      setChats(prevChats => prevChats.map(chat =>
        chat._id === chatId ? { ...chat, latestMessage: data } : chat
      ));
      socket?.emit('new message', data);
      return data;
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error;
    }
  }, [user, socket, API_BASE_URL]); // Dépendances de sendMessage

  // Fonction pour envoyer des médias, stabilisée avec useCallback
  const sendMedia = useCallback(async (mediaFiles, chatId) => {
    if (!mediaFiles || mediaFiles.length === 0 || !chatId || !user || !user.token) return;
    try {
      const formData = new FormData();
      formData.append('chatId', chatId);
      mediaFiles.forEach(file => formData.append('media', file));

      const config = {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${user.token}`,
        },
      };
      const { data } = await axios.post(`${API_BASE_URL}/messages/media`, formData, config);
      setMessages(prevMessages => [...prevMessages, data]);
      setChats(prevChats => prevChats.map(chat =>
        chat._id === chatId ? { ...chat, latestMessage: data } : chat
      ));
      socket?.emit('new message', data);
      return data;
    } catch (error) {
      console.error('Failed to send media:', error);
      throw error;
    }
  }, [user, socket, API_BASE_URL]); // Dépendances de sendMedia

  const markMessageAsRead = useCallback(async (messageId, chatId) => {
    if (!messageId || !chatId || !user || !user.token) return;
    try {
      const config = {
        headers: { Authorization: `Bearer ${user.token}` },
      };
      await axios.put(`${API_BASE_URL}/messages/${messageId}/read`, {}, config);
      setMessages(prevMessages => prevMessages.map(msg =>
        msg._id === messageId && !msg.readBy.includes(user._id)
          ? { ...msg, readBy: [...msg.readBy, user._id] }
          : msg
      ));
      socket?.emit('message read', { messageId, userId: user._id, chatId });
    } catch (error) {
      console.error('Failed to mark message as read:', error);
    }
  }, [user, socket, API_BASE_URL]); // Dépendances de markMessageAsRead


  // Fonction pour créer un chat 1-to-1, stabilisée avec useCallback
  const createChat = useCallback(async (userId) => {
    if (!user || !user.token) return;
    try {
        const config = {
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${user.token}`,
            },
        };
        const { data } = await axios.post(`${API_BASE_URL}/chats`, { userId }, config);
        setChats(prevChats => {
            const existingChat = prevChats.find(c => c._id === data._id);
            if (existingChat) {
                return prevChats.map(c => c._id === data._id ? data : c);
            }
            return [data, ...prevChats];
        });
        await selectChat(data._id); // Utiliser la fonction selectChat pour la stabilité
        return data;
    } catch (error) {
        console.error('Failed to create chat:', error);
        throw error;
    }
  }, [user, API_BASE_URL, selectChat]); // Dépend de selectChat

  // Fonction pour créer un groupe, stabilisée avec useCallback
  const createGroup = useCallback(async (name, description, participants) => {
    if (!user || !user.token) return;
    try {
        const config = {
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${user.token}`,
            },
        };
        const { data } = await axios.post(`${API_BASE_URL}/chats/group`, {
            name,
            description,
            users: JSON.stringify(participants),
        }, config);
        setChats(prevChats => {
            const existingChat = prevChats.find(c => c._id === data._id);
            if (existingChat) {
                return prevChats.map(c => c._id === data._id ? data : c);
            }
            return [data, ...prevChats];
        });
        await selectChat(data._id); // Utiliser la fonction selectChat pour la stabilité
        return data;
    } catch (error) {
        console.error('Failed to create group:', error);
        throw error;
    }
  }, [user, API_BASE_URL, selectChat]); // Dépend de selectChat

  // Fonction pour épingler un chat, stabilisée avec useCallback
  const pinChat = useCallback(async (chatId) => {
    if (!user || !user.token) return;
    try {
        const config = { headers: { Authorization: `Bearer ${user.token}` } };
        const { data } = await axios.put(`${API_BASE_URL}/chats/${chatId}/pin`, {}, config);
        setChats(prevChats => prevChats.map(chat =>
            chat._id === chatId ? { ...chat, isPinned: data.chat.isPinned } : chat
        ));
    } catch (error) {
        console.error('Failed to pin chat:', error);
    }
  }, [user, API_BASE_URL]);

  // Fonction pour archiver un chat, stabilisée avec useCallback
  const archiveChat = useCallback(async (chatId) => {
    if (!user || !user.token) return;
    try {
        const config = { headers: { Authorization: `Bearer ${user.token}` } };
        const { data } = await axios.put(`${API_BASE_URL}/chats/${chatId}/archive`, {}, config);
        setChats(prevChats => prevChats.map(chat =>
            chat._id === chatId ? { ...chat, isArchived: data.chat.isArchived } : chat
        ));
    } catch (error) {
        console.error('Failed to archive chat:', error);
    }
  }, [user, API_BASE_URL]);

  // Fonction pour mettre à jour un groupe, stabilisée avec useCallback
  const updateGroup = useCallback(async (groupId, name, description) => {
    if (!user || !user.token) return;
    try {
        const config = { headers: { Authorization: `Bearer ${user.token}` } };
        const { data } = await axios.put(`${API_BASE_URL}/groups/${groupId}`, { chatName: name, chatDescription: description }, config);
        setChats(prevChats => prevChats.map(chat =>
            chat._id === groupId ? { ...chat, chatName: data.chatName, chatDescription: data.chatDescription } : chat
        ));
        setSelectedChat(data); // Update selected chat if it's the current group
        return data;
    } catch (error) {
        console.error('Failed to update group:', error);
        throw error;
    }
  }, [user, API_BASE_URL]);

  // Fonction pour ajouter un membre à un groupe, stabilisée avec useCallback
  const addGroupMember = useCallback(async (groupId, userIdToAdd) => {
    if (!user || !user.token) return;
    try {
        const config = { headers: { Authorization: `Bearer ${user.token}` } };
        const { data } = await axios.put(`${API_BASE_URL}/groups/${groupId}/add`, { userId: userIdToAdd }, config);
        setChats(prevChats => prevChats.map(chat =>
            chat._id === groupId ? { ...chat, users: data.users } : chat
        ));
        setSelectedChat(data);
        return data;
    } catch (error) {
        console.error('Failed to add group member:', error);
        throw error;
    }
  }, [user, API_BASE_URL]);

  // Fonction pour retirer un membre d'un groupe, stabilisée avec useCallback
  const removeGroupMember = useCallback(async (groupId, userIdToRemove) => {
    if (!user || !user.token) return;
    try {
        const config = { headers: { Authorization: `Bearer ${user.token}` } };
        const { data } = await axios.put(`${API_BASE_URL}/groups/${groupId}/remove`, { userId: userIdToRemove }, config);
        if (data.message && data.message.includes('Group deleted')) {
            setChats(prevChats => prevChats.filter(chat => chat._id !== groupId));
            setSelectedChat(null);
            setMessages([]);
        } else {
            setChats(prevChats => prevChats.map(chat =>
                chat._id === groupId ? { ...chat, users: data.users } : chat
            ));
            setSelectedChat(data);
        }
        return data;
    } catch (error) {
        console.error('Failed to remove group member:', error);
        throw error;
    }
  }, [user, API_BASE_URL]);

  // Fonction pour supprimer un groupe, stabilisée avec useCallback
  const deleteGroup = useCallback(async (groupId) => {
    if (!user || !user.token) return;
    try {
        const config = { headers: { Authorization: `Bearer ${user.token}` } };
        await axios.delete(`${API_BASE_URL}/groups/${groupId}`, config);
        setChats(prevChats => prevChats.filter(chat => chat._id !== groupId));
        setSelectedChat(null);
        setMessages([]);
    } catch (error) {
        console.error('Failed to delete group:', error);
        throw error;
    }
  }, [user, API_BASE_URL]);

  // Fonction pour transférer l'admin d'un groupe, stabilisée avec useCallback
  const transferGroupAdmin = useCallback(async (groupId, newAdminId) => {
    if (!user || !user.token) return;
    try {
        const config = { headers: { Authorization: `Bearer ${user.token}` } };
        const { data } = await axios.put(`${API_BASE_URL}/groups/${groupId}/transfer-admin`, { newAdminId }, config);
        setChats(prevChats => prevChats.map(chat =>
            chat._id === groupId ? { ...chat, groupAdmin: data.chat.groupAdmin } : chat
        ));
        setSelectedChat(data.chat);
        return data;
    } catch (error) {
        console.error('Failed to transfer group admin:', error);
        throw error;
    }
  }, [user, API_BASE_URL]);


  return (
    <ChatContext.Provider
      value={{
        chats,
        setChats,
        selectedChat,
        setSelectedChat, // setSelectedChat est toujours exposé pour les usages directs si nécessaire
        messages,
        setMessages,
        notifications,
        setNotifications,
        fetchMessages,
        sendMessage,
        sendMedia,
        markMessageAsRead,
        createChat,
        createGroup,
        pinChat,
        archiveChat,
        typingUsers,
        updateGroup,
        addGroupMember,
        removeGroupMember,
        deleteGroup,
        transferGroupAdmin,
        selectChat, // Exposer la nouvelle fonction selectChat
        publicGroups, // Exposer les groupes publics
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => useContext(ChatContext);
