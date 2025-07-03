import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
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
  const [typingUsers, setTypingUsers] = useState({});
  const [publicGroups, setPublicGroups] = useState([]);
  const [chatMedia, setChatMedia] = useState([]);
  const [openChatMediaModal, setOpenChatMediaModal] = useState(false);

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

  const chatsRef = useRef(chats);
  useEffect(() => {
    chatsRef.current = chats;
  }, [chats]);

  const fetchMessages = useCallback(async (chatId) => {
    if (!chatId || !user || !user.token) {
        console.log("DEBUG ChatContext: fetchMessages called with missing chatId, user, or token.");
        setMessages([]);
        return;
    }
    try {
      console.log(`DEBUG ChatContext: Attempting to fetch messages for chatId: ${chatId}`);
      const config = {
        headers: { Authorization: `Bearer ${user.token}` },
      };
      const { data } = await axios.get(`${API_BASE_URL}/messages/${chatId}`, config);
      console.log("DEBUG ChatContext: Messages fetched successfully:", data);
      setMessages(data);
      socket?.emit('join chat', chatId);
    } catch (error) {
      console.error('ERROR ChatContext: Failed to fetch messages:', error);
      setMessages([]);
    }
  }, [user, socket, API_BASE_URL]);

  const fetchChatMedia = useCallback(async (chatId) => {
    if (!chatId || !user || !user.token) {
      console.log("DEBUG ChatContext: fetchChatMedia called with missing chatId, user, or token.");
      setChatMedia([]);
      return;
    }
    try {
      console.log(`DEBUG ChatContext: Attempting to fetch media for chatId: ${chatId}`);
      const config = {
        headers: { Authorization: `Bearer ${user.token}` },
      };
      const { data } = await axios.get(`${API_BASE_URL}/chats/${chatId}/media`, config);
      console.log("DEBUG ChatContext: Media fetched successfully:", data);
      setChatMedia(data);
    } catch (error) {
      console.error('ERROR ChatContext: Failed to fetch chat media:', error);
      setChatMedia([]);
    }
  }, [user, API_BASE_URL]);


  const selectChat = useCallback(async (chatId) => {
    console.log(`DEBUG ChatContext: selectChat called for chatId: ${chatId}`);
    const chatToSelect = chatsRef.current.find(chat => chat._id === chatId);
    if (chatToSelect) {
        // Vérifier si l'utilisateur est membre avant de sélectionner
        const isMember = chatToSelect.users.some(member => member._id === user._id);
        if (!isMember && chatToSelect.isGroupChat) {
            console.log("DEBUG ChatContext: User is not a member of this group, cannot select chat.");
            setSelectedChat(null);
            setMessages([]);
            setChatMedia([]);
            alert("You are no longer a member of this group."); // Notification à l'utilisateur
            return;
        }

        setSelectedChat(chatToSelect);
        await fetchMessages(chatId);
        await fetchChatMedia(chatId);
    } else {
        console.log("DEBUG ChatContext: No chat found for selected chatId, resetting.");
        setSelectedChat(null);
        setMessages([]);
        setChatMedia([]);
    }
  }, [fetchMessages, fetchChatMedia, setMessages, setChatMedia, user]); // Ajout de 'user' aux dépendances

  // Fetch chats on user login
  useEffect(() => {
    const fetchUserChats = async () => {
      if (user && user.token) {
        console.log("DEBUG ChatContext: Fetching user chats...");
        try {
          const config = {
            headers: { Authorization: `Bearer ${user.token}` },
          };
          const { data } = await axios.get(`${API_BASE_URL}/chats`, config);
          const uniqueChatsMap = new Map();
          data.forEach(chat => uniqueChatsMap.set(chat._id, chat));
          setChats(Array.from(uniqueChatsMap.values()));
          console.log("DEBUG ChatContext: User chats fetched successfully:", data);
        } catch (error) {
          console.error('ERROR ChatContext: Failed to fetch chats:', error);
          if (error.response && error.response.status === 401) {
              console.log('Token invalid or expired, please log in again.');
          }
        }
      } else {
        console.log("DEBUG ChatContext: User not logged in, clearing chat states.");
        setChats([]);
        setSelectedChat(null);
        setMessages([]);
        setNotifications([]);
        setTypingUsers({});
        setChatMedia([]);
      }
    };
    fetchUserChats();
  }, [user?.token, API_BASE_URL]);

  // Fetch all public groups (for the "Join Group" feature)
  useEffect(() => {
    const fetchAllPublicGroups = async () => {
      if (user && user.token) {
        console.log("DEBUG ChatContext: Fetching all public groups...");
        try {
          const config = {
            headers: { Authorization: `Bearer ${user.token}` },
          };
          const { data } = await axios.get(`${API_BASE_URL}/chats/all-groups`, config);
          setPublicGroups(data);
          console.log("DEBUG ChatContext: Public groups fetched successfully:", data);
        } catch (error) {
          console.error('ERROR ChatContext: Failed to fetch public groups:', error);
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
        console.log("DEBUG ChatContext: Socket 'message received' event:", newMessageReceived);

        // NOUVEAU: Vérifier si l'utilisateur est membre du chat AVANT d'ajouter le message
        const chatAffected = chatsRef.current.find(chat => chat._id === newMessageReceived.chat._id);
        const isUserMemberOfAffectedChat = chatAffected?.users.some(member => member._id === user._id);

        if (chatAffected && chatAffected.isGroupChat && !isUserMemberOfAffectedChat) {
            console.log("DEBUG ChatContext: User is not a member of this group, ignoring received message.");
            return; // Ne pas traiter le message si l'utilisateur n'est plus membre du groupe
        }

        // Mettre à jour le dernier message dans la liste des chats
        setChats(prevChats => prevChats.map(chat =>
            chat._id === newMessageReceived.chat._id
                ? { ...chat, latestMessage: newMessageReceived }
                : chat
        ));

        // Si le message est pour le chat actuellement sélectionné, l'ajouter aux messages
        if (selectedChat && selectedChat._id === newMessageReceived.chat._id) {
          setMessages(prevMessages => {
            const messageExists = prevMessages.some(msg => msg._id === newMessageReceived._id);
            if (!messageExists) {
              console.log("DEBUG ChatContext: Adding new message to state (selected chat).");
              return [...prevMessages, newMessageReceived];
            }
            console.log("DEBUG ChatContext: Message already exists in state, skipping (selected chat).");
            return prevMessages;
          });
          // Si c'est un média, mettre à jour la liste des médias du chat
          if (newMessageReceived.media && newMessageReceived.media.length > 0) {
            setChatMedia(prevMedia => [...prevMedia, ...newMessageReceived.media.map(m => ({
                _id: m._id,
                type: m.type,
                url: m.url,
                fileName: m.fileName,
                fileSize: m.fileSize,
                mimetype: m.mimetype,
                sender: newMessageReceived.sender ? newMessageReceived.sender.name : 'Unknown',
                createdAt: newMessageReceived.createdAt
            }))]);
          }
        } else {
          if (!notifications.some(notif => notif._id === newMessageReceived._id)) {
            console.log("DEBUG ChatContext: Adding new message to notifications.");
            setNotifications(prev => [newMessageReceived, ...prev]);
          } else {
            console.log("DEBUG ChatContext: Message already exists in notifications, skipping.");
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
        console.log(`DEBUG ChatContext: Socket 'message read' event for message ${messageId} by user ${userId}`);
        setMessages(prevMessages => prevMessages.map(msg =>
            msg._id === messageId && !msg.readBy.includes(userId)
                ? { ...msg, readBy: [...msg.readBy, userId] }
                : msg
        ));
      });

      socket.on('chat updated', (updatedChat) => {
        console.log("DEBUG ChatContext: Socket 'chat updated' event:", updatedChat);
        setChats(prevChats => prevChats.map(chat =>
          chat._id === updatedChat._id ? updatedChat : chat
        ));
        if (selectedChat && selectedChat._id === updatedChat._id) {
          setSelectedChat(updatedChat);
        }
      });

      socket.on('chat deleted', (deletedChatId) => {
        console.log("DEBUG ChatContext: Socket 'chat deleted' event:", deletedChatId);
        setChats(prevChats => prevChats.filter(chat => chat._id !== deletedChatId));
        if (selectedChat && selectedChat._id === deletedChatId) {
          setSelectedChat(null);
          setMessages([]);
          setChatMedia([]);
        }
      });


      return () => {
        console.log("DEBUG ChatContext: Cleaning up socket listeners.");
        socket.off('message received');
        socket.off('typing');
        socket.off('stop typing');
        socket.off('message read');
        socket.off('chat updated');
        socket.off('chat deleted');
      };
    }
  }, [socket, selectedChat, notifications, user, chatsRef.current]); // Ajout de chatsRef.current aux dépendances


  const sendMessage = useCallback(async (content, chatId) => {
    if (!content || !chatId || !user || !user.token) {
        console.log("DEBUG ChatContext: sendMessage called with missing content, chatId, user, or token.");
        return;
    }
    try {
      console.log(`DEBUG ChatContext: Attempting to send text message to chatId: ${chatId}`);
      const config = {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
        },
      };
      const { data } = await axios.post(`${API_BASE_URL}/messages`, { content, chatId }, config);
      console.log("DEBUG ChatContext: Text message sent successfully, adding to state:", data);
      setMessages(prevMessages => [...prevMessages, data]);
      setChats(prevChats => prevChats.map(chat =>
        chat._id === chatId ? { ...chat, latestMessage: data } : chat
      ));
      socket?.emit('new message', data);
      return data;
    } catch (error) {
      console.error('ERROR ChatContext: Failed to send text message:', error);
      throw error;
    }
  }, [user, socket, API_BASE_URL]);

  const sendMedia = useCallback(async (mediaFiles, chatId) => {
    if (!mediaFiles || mediaFiles.length === 0 || !chatId || !user || !user.token) {
        console.log("DEBUG ChatContext: sendMedia called with missing mediaFiles, chatId, user, or token.");
        return;
    }
    try {
      console.log(`DEBUG ChatContext: Attempting to send media files to chatId: ${chatId}`);
      const formData = new FormData();
      formData.append('chatId', chatId);
      mediaFiles.forEach(file => formData.append('media', file));

      const config = {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      };
      const { data } = await axios.post(`${API_BASE_URL}/messages/media`, formData, config);
      console.log("DEBUG ChatContext: Media message sent successfully, adding to state:", data);
      setMessages(prevMessages => [...prevMessages, data]);
      setChats(prevChats => prevChats.map(chat =>
        chat._id === chatId ? { ...chat, latestMessage: data } : chat
      ));
      if (data.media && data.media.length > 0) {
        setChatMedia(prevMedia => [...prevMedia, ...data.media.map(m => ({
            _id: m._id,
            type: m.type,
            url: m.url,
            fileName: m.fileName,
            fileSize: m.fileSize,
            mimetype: m.mimetype,
            sender: data.sender ? data.sender.name : 'Unknown',
            createdAt: data.createdAt
        }))]);
      }
      socket?.emit('new message', data);
      return data;
    } catch (error) {
      console.error('ERROR ChatContext: Failed to send media:', error);
      throw error;
    }
  }, [user, socket, API_BASE_URL]);

  const markMessageAsRead = useCallback(async (messageId, chatId) => {
    if (!messageId || !chatId || !user || !user.token) {
        console.log("DEBUG ChatContext: markMessageAsRead called with missing messageId, chatId, user, or token.");
        return;
    }
    try {
      console.log(`DEBUG ChatContext: Attempting to mark message ${messageId} as read.`);
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
      console.log(`DEBUG ChatContext: Message ${messageId} marked as read successfully.`);
    } catch (error) {
      console.error('ERROR ChatContext: Failed to mark message as read:', error);
    }
  }, [user, socket, API_BASE_URL]);


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
        await selectChat(data._id);
        return data;
    } catch (error) {
        console.error('Failed to create chat:', error);
        throw error;
    }
  }, [user, API_BASE_URL, selectChat]);

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
        await selectChat(data._id);
        return data;
    } catch (error) {
        console.error('Failed to create group:', error);
        throw error;
    }
  }, [user, API_BASE_URL, selectChat]);

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

const updateGroup = useCallback(async (groupId, name, description) => {
    if (!user || !user.token) return;
    try {
        const config = { headers: { Authorization: `Bearer ${user.token}` } };
        const { data } = await axios.put(`${API_BASE_URL}/groups/${groupId}`, { chatName: name, chatDescription: description }, config);
        setChats(prevChats => prevChats.map(chat =>
            chat._id === groupId ? { ...chat, chatName: data.chatName, chatDescription: data.chatDescription } : chat
        ));
        setSelectedChat(data);
        return data;
    } catch (error) {
        console.error('Failed to update group:', error);
        throw error;
    }
}, [user, API_BASE_URL]);

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

const removeGroupMember = useCallback(async (groupId, userIdToRemove) => {
    if (!user || !user.token) return;
    try {
        const config = { headers: { Authorization: `Bearer ${user.token}` } };
        const { data } = await axios.put(`${API_BASE_URL}/groups/${groupId}/remove`, { userId: userIdToRemove }, config);

        // NOUVEAU: Mettre à jour les chats et potentiellement désélectionner le chat
        setChats(prevChats => {
            const updatedChats = prevChats.map(chat =>
                chat._id === groupId ? { ...chat, users: data.users } : chat
            );
            // Si l'utilisateur actuel est celui qui est retiré, filtrer le chat de la liste
            if (userIdToRemove === user._id) {
                return updatedChats.filter(chat => chat._id !== groupId);
            }
            return updatedChats;
        });

        // NOUVEAU: Si l'utilisateur actuel est celui qui est retiré, désélectionner le chat et vider les messages
        if (userIdToRemove === user._id) {
            setSelectedChat(null);
            setMessages([]);
            setChatMedia([]);
            alert("You have been removed from the group or have left the group."); // Notifier l'utilisateur
        } else if (selectedChat && selectedChat._id === groupId) {
            // Si le chat est sélectionné et qu'un AUTRE membre est retiré, mettre à jour le selectedChat
            setSelectedChat(data);
        }
        return data;
    } catch (error) {
        console.error('Failed to remove group member:', error);
        throw error;
    }
}, [user, API_BASE_URL, selectedChat, setMessages, setChatMedia]); // Ajout de setMessages et setChatMedia aux dépendances

const deleteGroup = useCallback(async (groupId) => {
    if (!user || !user.token) return;
    try {
        const config = { headers: { Authorization: `Bearer ${user.token}` } };
        await axios.delete(`${API_BASE_URL}/groups/${groupId}`, config);
        setChats(prevChats => prevChats.filter(chat => chat._id !== groupId));
        setSelectedChat(null);
        setMessages([]);
        setChatMedia([]);
    } catch (error) {
        console.error('Failed to delete group:', error);
        throw error;
    }
}, [user, API_BASE_URL]);

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
        setSelectedChat,
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
        selectChat,
        publicGroups,
        chatMedia,
        fetchChatMedia,
        openChatMediaModal,
        setOpenChatMediaModal,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => useContext(ChatContext);
