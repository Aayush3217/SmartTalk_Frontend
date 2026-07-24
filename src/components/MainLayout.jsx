import React, { useState } from 'react';
import { 
  MessageSquare, CircleDot, LogOut, Search, User, Sparkles, Shield, ChevronRight, Edit2, Users 
} from 'lucide-react';
import { useUserStore } from '../store/useUserStore';

export default function MainLayout({ 
  users, 
  conversations, 
  activeConversation, 
  onSelectConversation, 
  onStartNewConversation,
  onOpenStatus,
  onEditProfile,
  onLogout,
  onOpenCreateGroup,
  children 
}) {
  const currentUser = useUserStore((state) => state.currentUser);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Format last message time
  const formatMsgTime = (timestamp) => {
    if (!timestamp) return '';
    const d = new Date(timestamp);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  // Filter conversations based on search
  const filteredConversations = conversations.filter(c => {
    if (c.isGroup) {
      return c.groupName?.toLowerCase().includes(searchQuery.toLowerCase());
    }
    const receiver = c.participants.find(p => p._id !== currentUser._id);
    return receiver?.username?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Filter users from directory who are NOT in conversations already, matching query
  const existingChatUserIds = conversations.map(c => {
    if (c.isGroup) return null;
    const receiver = c.participants.find(p => p._id !== currentUser._id);
    return receiver?._id;
  }).filter(Boolean);

  const searchInDirectory = users.filter(u => {
    const matchesSearch = searchQuery.trim() === '' || u.username?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch && u._id !== currentUser._id && !existingChatUserIds.includes(u._id);
  });

  return (
    <div className="w-screen h-screen flex justify-center items-center bg-slate-950 p-0 sm:p-5 md:p-6 overflow-hidden">
      <div className="w-full h-full max-w-7xl bg-slate-900 border border-slate-800/80 rounded-2xl overflow-hidden shadow-2xl flex">
        
        {/* Left Sidebar */}
        <div className={`w-full md:w-[35%] lg:w-[30%] min-w-[340px] h-full flex flex-col bg-slate-900 border-r border-slate-800/80 ${
          activeConversation ? 'hidden md:flex' : 'flex'
        }`}>
          
          {/* Header */}
          <div className="h-16 bg-slate-800/50 px-4 flex items-center justify-between border-b border-slate-800/80">
            <div className="flex items-center gap-3 cursor-pointer group" onClick={onEditProfile}>
              {currentUser.profilePicture ? (
                <img src={currentUser.profilePicture} alt="" className="w-10 h-10 rounded-full object-cover border-2 border-transparent group-hover:border-emerald-500 transition-all" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-slate-800 text-emerald-550 font-bold flex items-center justify-center border-2 border-transparent group-hover:border-emerald-500 transition-all">
                  {currentUser.username?.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="text-sm font-semibold text-slate-100 group-hover:text-white transition-colors">{currentUser.username}</span>
            </div>
            
            <div className="flex gap-1.5">
              <button onClick={onOpenCreateGroup} title="Create Group Chat" className="p-2 text-slate-400 hover:text-emerald-500 hover:bg-slate-800 rounded-full transition-all cursor-pointer">
                <Users className="w-5 h-5" />
              </button>
              <button onClick={onOpenStatus} title="View Stories" className="p-2 text-slate-400 hover:text-emerald-500 hover:bg-slate-800 rounded-full transition-all cursor-pointer">
                <CircleDot className="w-5 h-5" />
              </button>
              <button onClick={onEditProfile} title="Profile Settings" className="p-2 text-slate-400 hover:text-emerald-500 hover:bg-slate-800 rounded-full transition-all cursor-pointer">
                <Edit2 className="w-4 h-4" />
              </button>
              <button onClick={onLogout} title="Log Out" className="p-2 text-slate-400 hover:text-red-500 hover:bg-slate-800 rounded-full transition-all cursor-pointer">
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Search bar */}
          <div className="p-3 border-b border-slate-800/30">
            <div className="flex items-center bg-slate-950 border border-slate-850 rounded-xl h-10 px-3">
              <Search className="w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search or start new chat..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent border-none py-1 px-2.5 text-sm text-slate-105 placeholder-slate-605 outline-none"
              />
            </div>
          </div>

          {/* Contact & Conversations list */}
          <div className="flex-1 overflow-y-auto">
            {filteredConversations.length === 0 && searchInDirectory.length === 0 ? (
              <div className="flex flex-col items-center text-center p-12 gap-3 text-slate-450">
                <MessageSquare className="w-8 h-8 text-slate-650" />
                <p className="text-sm font-semibold">No users found</p>
                <span className="text-xs text-slate-550">Ensure other users are registered in the database.</span>
              </div>
            ) : (
              <>
                {/* Active Chats */}
                {filteredConversations.map(c => {
                  const receiver = c.participants.find(p => p._id !== currentUser._id);
                  const isChatActive = activeConversation?._id === c._id;
                  const lastMsg = c.lastMessage;

                  return (
                    <div
                      key={c._id}
                      className={`flex items-center p-3.5 gap-3.5 cursor-pointer border-b border-slate-800/10 transition-all ${
                        isChatActive ? 'bg-slate-850' : 'hover:bg-slate-800/40'
                      }`}
                      onClick={() => onSelectConversation(c)}
                    >
                      <div className="relative">
                        {c.isGroup ? (
                          c.groupAvatar ? (
                            <img src={c.groupAvatar} alt="" className="w-12 h-12 rounded-full object-cover border border-slate-800" />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-slate-800 text-emerald-500 font-bold text-lg flex items-center justify-center border border-slate-800">
                              <Users className="w-5 h-5 text-emerald-550" />
                            </div>
                          )
                        ) : receiver?.profilePicture ? (
                          <img src={receiver.profilePicture} alt="" className="w-12 h-12 rounded-full object-cover" />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-slate-800 text-emerald-550 font-bold text-lg flex items-center justify-center">
                            {receiver?.username?.charAt(0).toUpperCase() || 'U'}
                          </div>
                        )}
                        {!c.isGroup && receiver?.isOnline && (
                          <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-slate-900" />
                        )}
                      </div>

                      <div className="flex-1 flex flex-col gap-1">
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-sm text-slate-100">
                            {c.isGroup ? c.groupName : (receiver?.username || 'Unknown User')}
                          </span>
                          <span className="text-xxs text-slate-505">{formatMsgTime(c.updatedAt)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-slate-400 truncate max-w-[180px]">
                            {lastMsg ? (
                              lastMsg.contentType === 'image' ? '📷 Image' :
                              lastMsg.contentType === 'video' ? '🎥 Video' :
                              lastMsg.content
                            ) : (
                              <span className="italic text-slate-550">No messages yet</span>
                            )}
                          </span>
                          {c.unreadCount > 0 && !isChatActive && (
                            <span className="bg-emerald-500 text-white text-xxs font-bold min-w-5 h-5 px-1.5 rounded-full flex items-center justify-center">
                              {c.unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Directory Search Results */}
                {searchInDirectory.length > 0 && (
                  <>
                    <div className="text-xxs font-bold text-emerald-500 px-4 pt-4 pb-1 uppercase tracking-wider border-t border-slate-800/20">
                      Registered Users
                    </div>
                    {searchInDirectory.map(u => (
                      <div
                        key={u._id}
                        className="flex items-center p-3.5 gap-3.5 cursor-pointer hover:bg-slate-800/40 border-b border-slate-850/10 transition-all"
                        onClick={() => {
                          onStartNewConversation(u._id);
                          setSearchQuery('');
                        }}
                      >
                        <div className="relative">
                          {u.profilePicture ? (
                            <img src={u.profilePicture} alt="" className="w-12 h-12 rounded-full object-cover" />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-slate-800 text-emerald-500 font-bold text-lg flex items-center justify-center">
                              {u.username?.charAt(0).toUpperCase()}
                            </div>
                          )}
                          {u.isOnline && (
                            <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-slate-900" />
                          )}
                        </div>
                        
                        <div className="flex-1 flex flex-col gap-1">
                          <div className="flex justify-between items-center">
                            <span className="font-semibold text-sm text-slate-100">{u.username}</span>
                            <ChevronRight className="w-4 h-4 text-slate-550" />
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-slate-550 truncate max-w-[185px]">
                              {u.about || 'Available'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </>
            )}
          </div>
        </div>

        {/* Right workspace view */}
        <div className={`flex-1 h-full flex flex-col bg-slate-950 ${
          activeConversation ? 'flex' : 'hidden md:flex'
        }`}>
          {children ? children : (
            <div className="flex-1 flex items-center justify-center bg-slate-950/70 relative">
              {/* Decorative radial overlay */}
              <div className="absolute inset-0 bg-radial-gradient(circle, transparent 20%, #090d10 90%) pointer-events-none" />
              <div className="flex flex-col items-center text-center gap-4 max-w-md p-8 z-10 animate-fade-in">
                <div className="w-28 h-28 rounded-full bg-emerald-500/5 flex items-center justify-center border border-emerald-500/10 mb-2">
                  <Sparkles className="w-14 h-14 text-emerald-500" />
                </div>
                <h1 className="text-3xl font-extrabold tracking-tight text-slate-100">WhatsApp Web</h1>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Send and receive messages in real time. Keep your phone connected to check new updates.
                </p>
                <div className="absolute bottom-10 flex items-center gap-1.5 text-xs text-slate-500">
                  <Shield className="w-3.5 h-3.5" />
                  <span>End-to-end connected on Socket.io engine</span>
                </div>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
