// src/components/CallModal.jsx
import React from 'react';
import { 
  Modal, Box, Avatar, Typography, Button, 
  IconButton, CircularProgress 
} from '@mui/material';
import { CallEnd, Videocam, Mic, MicOff, VideocamOff } from '@mui/icons-material';
import { useCall } from '../contexts/CallContext'; // Import manquant
import { useAuth } from '../contexts/AuthContext'; // Import manquant


const CallModal = () => {
  const { call, endCall, acceptCall } = useCall(); // Utilisation correcte
  const { user } = useAuth(); // Utilisation correcte
  
  if (!call.isReceivingCall && !call.isCalling && !call.isInCall) {
    return null;
  }
  
  const caller = call.caller;
  const receiver = call.receiver;
  const otherUser = call.isReceivingCall ? caller : receiver;
  const callType = call.callType;
  
  return (
    <Modal open={true} onClose={endCall}>
      <Box sx={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: call.isInCall ? '80%' : 300,
        height: call.isInCall ? '80%' : 'auto',
        bgcolor: 'background.paper',
        boxShadow: 24,
        p: 4,
        borderRadius: 2,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        outline: 'none'
      }}>
        {call.isReceivingCall && !call.isInCall && (
          <>
            <Avatar 
              src={caller?.profilePic} 
              sx={{ width: 100, height: 100, mb: 2 }} 
            />
            <Typography variant="h5" gutterBottom>
              {caller?.name}
            </Typography>
            <Typography variant="body1" sx={{ mb: 3 }}>
              Appel {callType === 'video' ? 'vidéo' : 'voix'} entrant...
            </Typography>
            
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button 
                variant="contained" 
                color="error" 
                onClick={endCall}
                sx={{ borderRadius: '50%', minWidth: 60, height: 60 }}
              >
                <CallEnd />
              </Button>
              <Button 
                variant="contained" 
                color="success" 
                onClick={acceptCall}
                sx={{ borderRadius: '50%', minWidth: 60, height: 60 }}
              >
                <CallEnd sx={{ transform: 'rotate(135deg)' }} />
              </Button>
            </Box>
          </>
        )}
        
        {call.isCalling && !call.isInCall && (
          <>
            <Avatar 
              src={receiver?.profilePic} 
              sx={{ width: 100, height: 100, mb: 2 }} 
            />
            <Typography variant="h5" gutterBottom>
              {receiver?.name}
            </Typography>
            <Typography variant="body1" sx={{ mb: 3 }}>
              Appel {callType === 'video' ? 'vidéo' : 'voix'} en cours...
            </Typography>
            
            <CircularProgress sx={{ mb: 3 }} />
            
            <Button 
              variant="contained" 
              color="error" 
              onClick={endCall}
              sx={{ borderRadius: '50%', minWidth: 60, height: 60 }}
            >
              <CallEnd />
            </Button>
          </>
        )}
        
        {call.isInCall && (
          <>
            <Box sx={{ 
              width: '100%', 
              height: callType === 'video' ? '70%' : 'auto',
              bgcolor: 'black',
              borderRadius: 2,
              mb: 2,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              overflow: 'hidden',
              position: 'relative'
            }}>
              {callType === 'video' ? (
                <>
                  <Box sx={{ 
                    position: 'absolute', 
                    top: 16, 
                    right: 16, 
                    width: 120, 
                    height: 160, 
                    bgcolor: 'grey.800',
                    borderRadius: 1,
                    zIndex: 1
                  }}>
                    {/* Video du correspondant */}
                  </Box>
                  <Box sx={{ 
                    position: 'absolute', 
                    bottom: 16, 
                    left: 16, 
                    width: 100, 
                    height: 140, 
                    bgcolor: 'grey.800',
                    borderRadius: 1,
                    zIndex: 1
                  }}>
                    {/* Votre vidéo */}
                  </Box>
                  <Typography variant="h5" sx={{ color: 'white', zIndex: 1 }}>
                    {otherUser?.name}
                  </Typography>
                </>
              ) : (
                <>
                  <Avatar 
                    src={otherUser?.profilePic} 
                    sx={{ width: 120, height: 120, mb: 2 }} 
                  />
                  <Typography variant="h5" sx={{ color: 'white' }}>
                    {otherUser?.name}
                  </Typography>
                </>
              )}
            </Box>
            
            <Typography variant="body1" sx={{ mb: 2 }}>
              En appel {callType === 'video' ? 'vidéo' : 'voix'}...
            </Typography>
            
            <Box sx={{ display: 'flex', gap: 2 }}>
              <IconButton sx={{ bgcolor: 'grey.700', color: 'white' }}>
                {callType === 'video' ? <Videocam /> : <Mic />}
              </IconButton>
              <IconButton sx={{ bgcolor: 'grey.700', color: 'white' }}>
                <MicOff />
              </IconButton>
              <Button 
                variant="contained" 
                color="error" 
                onClick={endCall}
                sx={{ borderRadius: '50%', minWidth: 60, height: 60 }}
              >
                <CallEnd />
              </Button>
            </Box>
          </>
        )}
      </Box>
    </Modal>
  );
};

export default CallModal;