// src/context/CallContext.jsx
import React, { createContext, useContext, useState } from 'react';

const CallContext = createContext();

export const useCall = () => useContext(CallContext);

export const CallProvider = ({ children }) => {
  const [call, setCall] = useState({
    isReceivingCall: false,
    isCalling: false,
    isInCall: false,
    caller: null,
    receiver: null,
    callType: null, // 'voice' or 'video'
  });

  const startCall = (receiver, type) => {
    setCall({
      isReceivingCall: false,
      isCalling: true,
      isInCall: false,
      caller: null,
      receiver,
      callType: type
    });
  };

  const receiveCall = (caller, type) => {
    setCall({
      isReceivingCall: true,
      isCalling: false,
      isInCall: false,
      caller,
      receiver: null,
      callType: type
    });
  };

  const acceptCall = () => {
    setCall(prev => ({
      ...prev,
      isReceivingCall: false,
      isInCall: true
    }));
  };

  const endCall = () => {
    setCall({
      isReceivingCall: false,
      isCalling: false,
      isInCall: false,
      caller: null,
      receiver: null,
      callType: null
    });
  };

  const value = {
    call,
    startCall,
    receiveCall,
    acceptCall,
    endCall
  };

  return (
    <CallContext.Provider value={value}>
      {children}
    </CallContext.Provider>
  );
};