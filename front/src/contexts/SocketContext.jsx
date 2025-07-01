import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState({}); // { userId: status }
  const typingTimers = useRef({}); // To manage typing status debounce

  useEffect(() => {
    if (user) {
      const newSocket = io(import.meta.env.VITE_SOCKET_URL, {
        query: { userId: user._id }, // Pass userId for authentication on backend
      });

      newSocket.on('connect', () => {
        setIsConnected(true);
        console.log('Socket Connected:', newSocket.id);
        newSocket.emit('setup', user);
      });

      newSocket.on('disconnect', () => {
        setIsConnected(false);
        console.log('Socket Disconnected');
      });

      // Listen for user status updates
      newSocket.on('user status update', ({ userId, status, lastSeen }) => {
        console.log(`User ${userId} is now ${status}`);
        setOnlineUsers(prev => ({
            ...prev,
            [userId]: { status, lastSeen }
        }));
      });

      setSocket(newSocket);

      return () => {
        newSocket.disconnect();
        newSocket.off('connect');
        newSocket.off('disconnect');
        newSocket.off('user status update');
      };
    } else if (socket) {
      // If user logs out, disconnect socket
      socket.disconnect();
      setSocket(null);
    }
  }, [user]);

  const sendTypingEvent = (chatId, isTyping) => {
    if (!socket) return;

    if (isTyping) {
        socket.emit('typing', chatId);
        // Clear existing timer for this chat if user keeps typing
        if (typingTimers.current[chatId]) {
            clearTimeout(typingTimers.current[chatId]);
        }
        // Set a new timer to send 'stop typing' after a delay
        typingTimers.current[chatId] = setTimeout(() => {
            socket.emit('stop typing', chatId);
            delete typingTimers.current[chatId];
        }, 3000); // Stop typing after 3 seconds of no activity
    } else {
        // If explicitly stopping typing, clear any pending timer
        if (typingTimers.current[chatId]) {
            clearTimeout(typingTimers.current[chatId]);
            delete typingTimers.current[chatId];
        }
        socket.emit('stop typing', chatId);
    }
  };


  return (
    <SocketContext.Provider value={{ socket, isConnected, onlineUsers, sendTypingEvent }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);