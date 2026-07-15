import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Camera, FileText, X, ChevronLeft, ChevronRight, Eye, Trash2, Send } from 'lucide-react';
import socketService from '../services/socket';

const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000').replace(/\/$/, '');
const API_BASE = `${BACKEND_URL}/api`;

export default function StatusArea({ currentUser, statuses, onStatusCreated, onClose }) {
  const [activeStoryIndex, setActiveStoryIndex] = useState(null);
  const [activeUserStories, setActiveUserStories] = useState([]);
  
  // Creation States
  const [showCreator, setShowCreator] = useState(false);
  const [creationType, setCreationType] = useState('text'); // 'text' | 'media'
  const [textContent, setTextContent] = useState('');
  const [textBgColor, setTextBgColor] = useState('#005c4b');
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState('');
  const [loading, setLoading] = useState(false);

  const colors = ['#005c4b', '#121b22', '#763b8c', '#a22a2a', '#1e5f74', '#3d30a2'];

  // Group statuses by user
  const groupedStatuses = statuses.reduce((acc, status) => {
    const userId = status.user?._id;
    if (!acc[userId]) {
      acc[userId] = {
        user: status.user,
        stories: []
      };
    }
    acc[userId].stories.push(status);
    return acc;
  }, {});

  // Separate current user's stories from others
  const myGroup = groupedStatuses[currentUser._id] || { user: currentUser, stories: [] };
  const otherGroups = Object.values(groupedStatuses).filter(g => g.user?._id !== currentUser._id);

  // Play a user's stories
  const startPlayingStories = (userStories) => {
    const sorted = [...userStories].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    setActiveUserStories(sorted);
    setActiveStoryIndex(0);
  };

  const nextStory = () => {
    if (activeStoryIndex === null) return;
    if (activeStoryIndex < activeUserStories.length - 1) {
      setActiveStoryIndex(prev => prev + 1);
    } else {
      closeStoryViewer();
    }
  };

  const prevStory = () => {
    if (activeStoryIndex === null) return;
    if (activeStoryIndex > 0) {
      setActiveStoryIndex(prev => prev - 1);
    }
  };

  const closeStoryViewer = () => {
    setActiveStoryIndex(null);
    setActiveUserStories([]);
  };

  // Automatically cycle stories after 5 seconds
  useEffect(() => {
    if (activeStoryIndex === null || activeUserStories.length === 0) return;

    const currentStory = activeUserStories[activeStoryIndex];
    
    // Mark status as viewed in backend if not already viewed by current user
    const hasViewed = currentStory.viewers.some(v => v._id === currentUser._id || v === currentUser._id);
    if (!hasViewed && currentStory.user?._id !== currentUser._id) {
      axios.put(`${API_BASE}/status/${currentStory._id}/view`, {}, { withCredentials: true })
        .then(() => {
          socketService.emitViewStatus(currentStory._id, currentUser._id);
        })
        .catch(err => console.error(err));
    }

    const timer = setTimeout(() => {
      nextStory();
    }, 5000);

    return () => clearTimeout(timer);
  }, [activeStoryIndex, activeUserStories]);

  const handleMediaChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setMediaFile(file);
      setMediaPreview(URL.createObjectURL(file));
      setCreationType('media');
      setShowCreator(true);
    }
  };

  const handleCreateStatus = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formData = new FormData();
      if (creationType === 'media' && mediaFile) {
        formData.append('media', mediaFile);
        formData.append('contentType', mediaFile.type.startsWith('video') ? 'video' : 'image');
      } else {
        formData.append('content', textContent);
        formData.append('contentType', 'text');
        formData.append('bgColor', textBgColor);
      }

      const response = await axios.post(`${API_BASE}/status`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        withCredentials: true
      });

      if (response.data?.data) {
        onStatusCreated(response.data.data);
        setTextContent('');
        setMediaFile(null);
        setMediaPreview('');
        setShowCreator(false);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to post status update.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStatus = async (statusId, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this status update?')) return;
    
    try {
      await axios.delete(`${API_BASE}/status/${statusId}`, { withCredentials: true });
      closeStoryViewer();
      alert('Status deleted successfully.');
      window.location.reload();
    } catch (err) {
      console.error(err);
    }
  };

  const activeStory = activeStoryIndex !== null ? activeUserStories[activeStoryIndex] : null;

  return (
    <div className="flex w-full h-full bg-slate-950 animate-slide-in-left">
      <div className="w-full max-w-[400px] border-r border-slate-800/80 flex flex-col bg-slate-900">
        <div className="flex justify-between items-center p-4 px-5 bg-slate-800/40 border-b border-slate-800/80">
          <h2 className="text-lg font-bold text-slate-100">Status</h2>
          <button className="p-2 text-slate-400 hover:text-slate-200 rounded-full hover:bg-slate-800 transition-colors cursor-pointer" onClick={onClose}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* My Status */}
        <div className="text-xxs font-bold text-emerald-555 px-5 pt-5 pb-2 uppercase tracking-wider">
          My Status
        </div>
        <div className="flex items-center px-5 py-3 gap-4 border-b border-slate-800/30 hover:bg-slate-850/20 transition-all">
          <div 
            onClick={() => myGroup.stories.length > 0 && startPlayingStories(myGroup.stories)} 
            className={`relative p-0.5 rounded-full cursor-pointer ${
              myGroup.stories.length > 0 ? 'bg-gradient-to-tr from-emerald-500 to-emerald-600' : 'bg-slate-800'
            }`}
          >
            <div className="rounded-full border-2 border-slate-900 overflow-hidden bg-slate-850 w-12 h-12 flex items-center justify-center">
              {currentUser.profilePicture ? (
                <img src={currentUser.profilePicture} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="text-emerald-555 font-bold text-lg">{currentUser.username?.charAt(0).toUpperCase()}</div>
              )}
            </div>
          </div>
          
          <div className="flex-1 flex flex-col gap-1 cursor-pointer" onClick={() => myGroup.stories.length > 0 && startPlayingStories(myGroup.stories)}>
            <div className="font-semibold text-sm text-slate-100">My Status</div>
            <div className="text-xs text-slate-450">
              {myGroup.stories.length > 0 
                ? `${myGroup.stories.length} updates published` 
                : 'No updates yet today'}
            </div>
          </div>

          <div className="flex gap-2">
            <label htmlFor="status-media" className="w-9 h-9 rounded-full bg-slate-800/80 hover:bg-slate-800 border border-slate-750 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer transition-colors">
              <Camera className="w-4 h-4" />
              <input 
                id="status-media" 
                type="file" 
                accept="image/*,video/*" 
                onChange={handleMediaChange}
                className="hidden"
              />
            </label>
            <button 
              onClick={() => { setCreationType('text'); setShowCreator(true); }} 
              className="w-9 h-9 rounded-full bg-slate-800/80 hover:bg-slate-800 border border-slate-750 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
            >
              <FileText className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Recent Updates */}
        <div className="text-xxs font-bold text-emerald-555 px-5 pt-5 pb-2 uppercase tracking-wider">
          Recent Updates
        </div>
        <div className="flex-1 overflow-y-auto">
          {otherGroups.length === 0 ? (
            <div className="p-10 text-center text-xs text-slate-500">No status updates available</div>
          ) : (
            otherGroups.map(group => {
              const latestStory = group.stories[0];
              return (
                <div 
                  key={group.user?._id} 
                  className="flex items-center px-5 py-3.5 gap-4 cursor-pointer hover:bg-slate-800/30 border-b border-slate-850/10 transition-all"
                  onClick={() => startPlayingStories(group.stories)}
                >
                  <div className="relative p-0.5 rounded-full bg-gradient-to-tr from-emerald-500 to-emerald-600">
                    <div className="rounded-full border-2 border-slate-900 overflow-hidden bg-slate-850 w-12 h-12 flex items-center justify-center">
                      {group.user?.profilePicture ? (
                        <img src={group.user?.profilePicture} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="text-emerald-555 font-bold text-lg">{group.user?.username?.charAt(0).toUpperCase()}</div>
                      )}
                    </div>
                  </div>
                  <div className="flex-1 flex flex-col gap-1">
                    <div className="font-semibold text-sm text-slate-100">{group.user?.username}</div>
                    <div className="text-xs text-slate-500">
                      {new Date(latestStory.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Creator Modal Overlay */}
      {showCreator && (
        <div className="fixed inset-0 bg-black/85 flex justify-center items-center z-[1000] p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
            <div className="flex justify-between items-center p-4 px-5 border-b border-slate-800/85">
              <h3 className="font-semibold text-slate-100 text-sm">Create Status</h3>
              <button className="p-1.5 text-slate-400 hover:text-slate-200 rounded-full hover:bg-slate-800 cursor-pointer" onClick={() => setShowCreator(false)}><X className="w-4.5 h-4.5" /></button>
            </div>
            
            {creationType === 'text' ? (
              <div style={{ backgroundColor: textBgColor }} className="h-72 flex flex-col p-6 relative justify-center items-center transition-colors">
                <textarea
                  placeholder="Type a status update..."
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  className="w-full border-none bg-transparent text-white text-xl font-bold text-center resize-none outline-none max-h-36 placeholder-white/50"
                  maxLength={200}
                />
                
                <div className="flex justify-center gap-2.5 absolute bottom-4 left-4 right-4">
                  {colors.map(c => (
                    <button
                      key={c}
                      onClick={() => setTextBgColor(c)}
                      style={{ backgroundColor: c }}
                      className={`w-7 h-7 rounded-full cursor-pointer transition-transform ${
                        textBgColor === c ? 'scale-115 border-2 border-white ring-1 ring-black' : 'border border-white/10'
                      }`}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-72 bg-slate-950 flex justify-center items-center p-4 border-b border-slate-800/20">
                <img src={mediaPreview} alt="Preview" className="max-h-full max-w-full object-contain rounded-lg" />
              </div>
            )}

            <div className="p-4 flex justify-end border-t border-slate-800/80 bg-slate-900">
              <button 
                onClick={handleCreateStatus} 
                disabled={loading || (creationType === 'text' && !textContent.trim())}
                className="bg-emerald-650 hover:bg-emerald-600 active:scale-97 text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition-all flex items-center gap-2 cursor-pointer disabled:bg-slate-800 disabled:text-slate-650 disabled:cursor-not-allowed"
              >
                {loading ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-slate-600 border-t-emerald-500"></div> : <>Post Status <Send className="w-4 h-4" /></>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Story Viewer Overlay */}
      {activeStoryIndex !== null && activeStory && (
        <div className="fixed inset-0 bg-slate-950 z-[2000] flex justify-center items-center">
          <div className="relative w-full max-w-lg h-full max-h-[850px] bg-black flex flex-col shadow-2xl rounded-2xl overflow-hidden border border-slate-800/30">
            {/* Progress Timelines */}
            <div className="flex p-3 px-4 gap-1 absolute top-0 left-0 right-0 z-10">
              {activeUserStories.map((_, i) => (
                <div key={i} className="flex-1 h-0.5 bg-white/20 rounded-full overflow-hidden">
                  <div 
                    className={`h-full bg-emerald-555 rounded-full ${
                      i === activeStoryIndex ? 'story-progress-fill' : i < activeStoryIndex ? 'w-full' : 'w-0'
                    }`}
                  />
                </div>
              ))}
            </div>

            {/* Header overlay */}
            <div className="flex justify-between items-center p-4 pt-6 bg-gradient-to-b from-black/80 to-transparent absolute top-0 left-0 right-0 z-9">
              <div className="flex items-center gap-3 text-white">
                {activeStory.user?.profilePicture ? (
                  <img src={activeStory.user.profilePicture} alt="" className="w-10 h-10 rounded-full object-cover border border-white/10" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-slate-800 text-emerald-500 font-bold flex items-center justify-center">
                    {activeStory.user?.username?.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <div className="font-semibold text-sm">{activeStory.user?.username}</div>
                  <div className="text-xxs text-slate-400">
                    {new Date(activeStory.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                {activeStory.user?._id === currentUser._id && (
                  <button 
                    onClick={(e) => handleDeleteStatus(activeStory._id, e)} 
                    className="p-2 text-red-500 hover:text-red-400 hover:bg-white/5 rounded-full transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
                <button onClick={closeStoryViewer} className="p-2 text-white hover:bg-white/5 rounded-full transition-colors cursor-pointer"><X className="w-5 h-5" /></button>
              </div>
            </div>

            {/* Main content body */}
            <div className="flex-1 flex justify-center items-center bg-black">
              {activeStory.contentType === 'text' ? (
                <div style={{ backgroundColor: activeStory.bgColor || '#005c4b' }} className="w-full h-full flex justify-center items-center text-white text-2xl font-bold px-10 text-center select-none leading-relaxed">
                  {activeStory.content}
                </div>
              ) : activeStory.contentType === 'video' ? (
                <video src={activeStory.content} controls autoPlay className="max-w-full max-h-full object-contain block" />
              ) : (
                <img src={activeStory.content} alt="" className="max-w-full max-h-full object-contain block" />
              )}
            </div>

            {/* Views counter info */}
            {activeStory.user?._id === currentUser._id && (
              <div className="p-3 px-4 flex items-center justify-center gap-2 bg-slate-900 border-t border-slate-800 text-slate-300 text-xs cursor-pointer group relative">
                <Eye className="w-4 h-4 text-emerald-500" />
                <span>{activeStory.viewers.length} views</span>
                {activeStory.viewers.length > 0 && (
                  <div className="absolute bottom-full left-0 right-0 bg-slate-900 border-b border-slate-800 max-h-48 overflow-y-auto py-1 shadow-2xl hidden group-hover:block hover:block">
                    {activeStory.viewers.map(v => (
                      <div key={v._id || v} className="flex items-center gap-3 px-4 py-2 hover:bg-slate-800 transition-colors">
                        {v.profilePicture ? (
                          <img src={v.profilePicture} alt="" className="w-7 h-7 rounded-full object-cover" />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-slate-800 text-[10px] text-emerald-555 font-bold flex items-center justify-center">U</div>
                        )}
                        <span className="text-slate-200 font-semibold">{v.username || 'User'}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Nav Arrows */}
            <button onClick={prevStory} className="absolute left-3.5 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/50 hover:bg-black/80 border border-white/5 flex items-center justify-center text-white cursor-pointer transition-colors disabled:opacity-30 disabled:cursor-not-allowed" disabled={activeStoryIndex === 0}>
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button onClick={nextStory} className="absolute right-3.5 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/50 hover:bg-black/80 border border-white/5 flex items-center justify-center text-white cursor-pointer transition-colors z-20">
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
