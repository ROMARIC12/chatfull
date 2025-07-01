// src/components/Stories.jsx
import React from 'react';
import { Box, Avatar, Typography } from '@mui/material';
import { Add } from '@mui/icons-material';

const Stories = () => {
  const stories = [
    { id: 1, name: 'John', seen: false },
    { id: 2, name: 'Sarah', seen: true },
    { id: 3, name: 'Mike', seen: false },
    { id: 4, name: 'Emma', seen: true },
    { id: 5, name: 'Alex', seen: false },
  ];

  return (
    <Box sx={{ 
      display: 'flex', 
      overflowX: 'auto', 
      p: 2, 
      borderBottom: '1px solid', 
      borderColor: 'divider',
      bgcolor: 'background.paper',
      '&::-webkit-scrollbar': {
        display: 'none'
      }
    }}>
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        mr: 2,
        position: 'relative'
      }}>
        <Box sx={{
          position: 'absolute',
          bottom: 28,
          right: 0,
          bgcolor: 'primary.main',
          color: 'white',
          borderRadius: '50%',
          width: 20,
          height: 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1
        }}>
          <Add sx={{ fontSize: 16 }} />
        </Box>
        <Avatar sx={{ 
          width: 56, 
          height: 56, 
          mb: 1,
          bgcolor: 'grey.300'
        }} />
        <Typography variant="caption">Votre story</Typography>
      </Box>
      
      {stories.map(story => (
        <Box 
          key={story.id} 
          sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            mr: 2,
            position: 'relative'
          }}
        >
          <Box sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            borderRadius: '50%',
            background: story.seen 
              ? 'linear-gradient(45deg, #f5f5f5, #e0e0e0)' 
              : 'linear-gradient(45deg, #ff5e62, #ff9966)',
            zIndex: 0,
            padding: 2
          }} />
          <Avatar 
            sx={{ 
              width: 56, 
              height: 56, 
              mb: 1,
              zIndex: 1,
              border: '2px solid white'
            }} 
          />
          <Typography variant="caption">{story.name}</Typography>
        </Box>
      ))}
    </Box>
  );
};

export default Stories;