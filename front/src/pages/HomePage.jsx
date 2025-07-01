import React from 'react';
import { Box } from '@mui/material';
import Sidebar from '../components/Sidebar';
import ChatList from '../components/ChatList';
import ChatWindow from '../components/ChatWindow';
import ContactInfo from '../components/ContactInfo';
import { useMediaQuery, useTheme } from '@mui/material';
import { useChat } from '../contexts/ChatContext';

const HomePage = () => {
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('md'));
  const { selectedChat } = useChat();

  return (
    <Box sx={{ display: 'flex', width: '100vw', height: '100vh' }}>
      <Sidebar />
      {!isSmallScreen && <ChatList />} {/* Always show ChatList on larger screens */}

      {/* Conditional rendering for chat window and info panel on small screens */}
      {isSmallScreen ? (
        selectedChat ? (
          <>
            <ChatWindow />
            {/* You might want to hide ContactInfo or make it a drawer/modal on small screens */}
          </>
        ) : (
          <ChatList /> // Show ChatList if no chat is selected on small screens
        )
      ) : (
        <>
          <ChatWindow />
          <ContactInfo />
        </>
      )}
    </Box>
  );
};

export default HomePage;