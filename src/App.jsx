import React, { useState, useEffect } from 'react';
import axios from 'axios';
import socketService from './services/socket';

import Login from './components/Login';
import ProfileSetup from './components/ProfileSetup';
import MainLayout from './components/MainLayout';
import ChatWindow from './components/ChatWindow';
import StatusArea from './components/StatusArea';
import CreateGroupModal from './components/CreateGroupModal';

const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000').replace(/\/$/, '');
const API_BASE = `${BACKEND_URL}/api`;
const SOCKET_BASE = BACKEND_URL;

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  
  // Real-time & Lists States
  const [users, setUsers] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  
  // Tab control
  const [activeView, setActiveView] = useState('chats'); // 'chats' | 'status' | 'profile-edit'
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);

  // 1. Initial auth check
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    
    axios.get(`${API_BASE}/auth/check-auth`, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      withCredentials: true
    })
      .then(res => {
        if (res.data?.data) {
          const user = res.data.data;
          setCurrentUser(user);
          // If user hasn't set username yet, prompt Profile Setup
          if (!user.username) {
            setShowProfileSetup(true);
          }
        }
      })
      .catch(err => {
        console.log('No valid session found, user is guest');
      })
      .finally(() => {
        setIsAuthChecking(false);
      });
  }, []);

  // 2. Setup Socket and Sync Lists upon successful login
  useEffect(() => {
    if (!currentUser || !currentUser.username) return;

    // Connect to WebSocket Server via centralized socketService
    const token = localStorage.getItem('auth_token');
    socketService.connect(currentUser._id, token);

    // Fetch lists
    syncDirectoryAndConversations();
    syncStatuses();

    // Set up global listeners
    socketService.on('user_status', ({ userId, isOnline }) => {
      setUsers(prev => prev.map(u => {
        if (u._id === userId) {
          return { ...u, isOnline };
        }
        return u;
      }));
      setConversations(prev => prev.map(c => {
        const updatedParticipants = c.participants.map(p => {
          if (p._id === userId) {
            return { ...p, isOnline };
          }
          return p;
        });
        return { ...c, participants: updatedParticipants };
      }));
    });

    socketService.on('new_status', (newStatus) => {
      setStatuses(prev => [newStatus, ...prev]);
    });

    socketService.on('receive_message', (msg) => {
      // Trigger conversation list update
      syncDirectoryAndConversations();
    });

    socketService.on('message_read', () => {
      syncDirectoryAndConversations();
    });

    socketService.on('message_status_update', () => {
      syncDirectoryAndConversations();
    });

    socketService.on('group_created', (newGroup) => {
      // Auto-join the socket room for the new group
      socketService.socket?.emit('join_conversation', newGroup._id);
      setConversations(prev => {
        if (prev.some(c => c._id === newGroup._id)) return prev;
        return [newGroup, ...prev];
      });
    });

    return () => {
      socketService.disconnect();
    };
  }, [currentUser?._id, currentUser?.username]);

  const syncDirectoryAndConversations = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const config = {
        headers: { 'Authorization': `Bearer ${token}` },
        withCredentials: true
      };

      // Fetch users directory
      const usersRes = await axios.get(`${API_BASE}/auth/users`, config);
      setUsers(usersRes.data.data || []);

      // Fetch active conversations list
      const convsRes = await axios.get(`${API_BASE}/chats/conversation`, config);
      setConversations(convsRes.data.data || []);
    } catch (err) {
      console.error('List sync error:', err);
    }
  };

  const syncStatuses = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const config = {
        headers: { 'Authorization': `Bearer ${token}` },
        withCredentials: true
      };
      const statusesRes = await axios.get(`${API_BASE}/status`, config);
      setStatuses(statusesRes.data.data || []);
    } catch (err) {
      console.error('Status sync error:', err);
    }
  };

  const handleStartNewConversation = async (receiverId) => {
    try {
      const token = localStorage.getItem('auth_token');
      // To start a conversation, we send a dummy text message or call send-message API
      // Let's create a blank or initial message: "Hello!"
      const formData = new FormData();
      formData.append('senderId', currentUser._id);
      formData.append('receiverId', receiverId);
      formData.append('content', ' 👋 Connection established');
      formData.append('messageStatus', 'send');

      const response = await axios.post(`${API_BASE}/chats/send-message`, formData, {
        headers: { 
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        },
        withCredentials: true
      });

      if (response.data?.data) {
        const newMsg = response.data.data;
        socketService.emitSendMessage(newMsg);
        await syncDirectoryAndConversations();
        
        // Find newly created conversation
        const updatedConversations = await axios.get(`${API_BASE}/chats/conversation`, {
          headers: { 'Authorization': `Bearer ${token}` },
          withCredentials: true
        });
        const matched = updatedConversations.data.data.find(c => 
          c.participants.some(p => p._id === receiverId)
        );
        if (matched) {
          setActiveConversation(matched);
        }
      }
    } catch (err) {
      console.error(err);
      alert('Failed to start conversation.');
    }
  };

  const handleLogout = async () => {
    try {
      await axios.get(`${API_BASE}/auth/logout`, {
        withCredentials: true
      });
      localStorage.removeItem('auth_token');
      setCurrentUser(null);
      setActiveConversation(null);
      setSocket(null);
      setActiveView('chats');
    } catch (err) {
      console.error(err);
    }
  };

  if (isAuthChecking) {
    return (
      <div className="flex flex-col justify-center items-center w-screen h-screen bg-slate-950">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-800 border-t-emerald-500"></div>
        <p className="mt-4 text-slate-400 text-sm">Connecting securely to server...</p>
      </div>
    );
  }

  if (!currentUser) {
    return <Login onAuthSuccess={(user) => {
      setCurrentUser(user);
      if (!user.username) {
        setShowProfileSetup(true);
      }
    }} />;
  }

  if (showProfileSetup) {
    return (
      <ProfileSetup 
        currentUser={currentUser} 
        onProfileComplete={(updatedUser) => {
          setCurrentUser(updatedUser);
          setShowProfileSetup(false);
        }} 
      />
    );
  }

  return (
    <>
      {activeView === 'status' ? (
        <StatusArea
          currentUser={currentUser}
          statuses={statuses}
          onStatusCreated={(newStatus) => {
            setStatuses(prev => [newStatus, ...prev]);
            syncStatuses();
          }}
          onClose={() => setActiveView('chats')}
        />
      ) : (
        <MainLayout
          currentUser={currentUser}
          users={users}
          conversations={conversations}
          activeConversation={activeConversation}
          onSelectConversation={(conv) => setActiveConversation(conv)}
          onStartNewConversation={handleStartNewConversation}
          onOpenStatus={() => { syncStatuses(); setActiveView('status'); }}
          onEditProfile={() => setShowProfileSetup(true)}
          onLogout={handleLogout}
          onOpenCreateGroup={() => setIsCreateGroupOpen(true)}
        >
          {activeConversation ? (
            <ChatWindow
              activeConversation={activeConversation}
              currentUser={currentUser}
              onNewMessage={() => {
                syncDirectoryAndConversations();
              }}
            />
          ) : null}
        </MainLayout>
      )}

      <CreateGroupModal
        isOpen={isCreateGroupOpen}
        onClose={() => setIsCreateGroupOpen(false)}
        users={users}
        currentUser={currentUser}
        onGroupCreated={(newGroup) => {
          setConversations(prev => {
            if (prev.some(c => c._id === newGroup._id)) return prev;
            return [newGroup, ...prev];
          });
          setActiveConversation(newGroup);
          socketService.socket?.emit('join_conversation', newGroup._id);
        }}
      />
    </>
  );
}

// Styles removed, handled by Tailwind CSS
