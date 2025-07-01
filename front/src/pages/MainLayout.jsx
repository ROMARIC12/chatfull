// src/pages/MainLayout.jsx
import React, { useState } from 'react';
import { Box, useMediaQuery, useTheme } from '@mui/material';
import Sidebar from '../components/Sidebar';
import ChatArea from '../components/ChatArea';
import ProfileDrawer from '../components/ProfileDrawer';
import Stories from '../components/Stories';
import CallModal from '../components/CallModal';

const MainLayout = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [selectedChat, setSelectedChat] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar 
        selectedChat={selectedChat} 
        setSelectedChat={setSelectedChat}
        setShowProfile={setShowProfile}
        setShowCreateGroup={setShowCreateGroup}
        isMobile={isMobile}
      />
      
      {(!isMobile || selectedChat) && (
        <ChatArea 
          selectedChat={selectedChat} 
          setSelectedChat={setSelectedChat}
          setShowProfile={setShowProfile}
          isMobile={isMobile}
        />
      )}
      
      <ProfileDrawer 
        open={showProfile} 
        onClose={() => setShowProfile(false)} 
      />
      
      <CallModal />
      <Stories />
    </Box>
  );
};

export default MainLayout;