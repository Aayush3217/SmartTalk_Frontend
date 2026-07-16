import React, { useState } from 'react';
import axios from 'axios';
import { X, Camera, User, Users, Check, AlertCircle } from 'lucide-react';

const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000').replace(/\/$/, '');
const API_BASE = `${BACKEND_URL}/api`;

export default function CreateGroupModal({ isOpen, onClose, users, currentUser, onGroupCreated }) {
  const [groupName, setGroupName] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [avatarFile, setAvatarFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const toggleUserSelection = (userId) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!groupName.trim()) {
      setError('Group name is required');
      return;
    }
    if (selectedUsers.length < 1) {
      setError('Please select at least 1 contact to add');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('groupName', groupName.trim());
      
      // Append selected users (with creator added on the backend)
      formData.append('participants', JSON.stringify(selectedUsers));
      
      if (avatarFile) {
        formData.append('media', avatarFile);
      }

      const response = await axios.post(`${API_BASE}/chats/group`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        withCredentials: true
      });

      if (response.data?.data) {
        onGroupCreated(response.data.data);
        onClose();
        // Reset state
        setGroupName('');
        setSelectedUsers([]);
        setAvatarFile(null);
        setPreviewUrl('');
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to create group');
    } finally {
      setLoading(false);
    }
  };

  // Exclude current logged in user from selection list
  const filterContacts = users.filter(u => u._id !== currentUser._id);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-500" />
            <h3 className="text-base font-bold text-slate-100">Create New Group</h3>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-slate-800 flex items-center justify-center text-slate-450 hover:text-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 flex flex-col gap-5">
          
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-red-400 flex items-center gap-3 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Group Avatar and Name Input */}
          <div className="flex items-center gap-4">
            
            {/* Avatar Selector */}
            <div className="relative w-16 h-16 rounded-full border-2 border-slate-800 bg-slate-950 flex items-center justify-center flex-shrink-0 overflow-hidden">
              {previewUrl ? (
                <img src={previewUrl} alt="Group Preview" className="w-full h-full object-cover" />
              ) : (
                <Users className="w-6 h-6 text-slate-600" />
              )}
              <label 
                htmlFor="group-avatar-upload" 
                className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity"
              >
                <Camera className="w-4 h-4 text-white" />
                <input
                  id="group-avatar-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </label>
            </div>

            {/* Name Input */}
            <div className="flex-1 flex flex-col gap-1">
              <label className="text-[10px] text-slate-500 font-semibold tracking-wider uppercase">Group Name</label>
              <input
                type="text"
                placeholder="e.g. Work Team, Family..."
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-850 hover:border-slate-700 focus:border-emerald-500 rounded-xl py-2 px-3 text-xs text-slate-100 placeholder-slate-600 outline-none transition-all focus:ring-2 focus:ring-emerald-500/10"
              />
            </div>

          </div>

          {/* Select Members Section */}
          <div className="flex flex-col gap-2 flex-1">
            <div className="flex justify-between items-center">
              <label className="text-[10px] text-slate-500 font-semibold tracking-wider uppercase">
                Select Members
              </label>
              <span className="text-[10px] text-emerald-500 font-semibold">
                {selectedUsers.length} selected
              </span>
            </div>
            
            {/* Contacts Scroll list */}
            <div className="border border-slate-850 bg-slate-950 rounded-xl overflow-hidden max-h-[220px] overflow-y-auto flex flex-col">
              {filterContacts.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-600">
                  No other contacts found to add.
                </div>
              ) : (
                filterContacts.map(contact => {
                  const isSelected = selectedUsers.includes(contact._id);
                  return (
                    <div 
                      key={contact._id}
                      onClick={() => toggleUserSelection(contact._id)}
                      className="p-2.5 flex items-center justify-between border-b border-slate-900/60 hover:bg-slate-900/50 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full border border-slate-800 overflow-hidden bg-slate-900 flex items-center justify-center flex-shrink-0">
                          {contact.profilePicture ? (
                            <img src={contact.profilePicture} alt={contact.username} className="w-full h-full object-cover" />
                          ) : (
                            <User className="w-4 h-4 text-slate-500" />
                          )}
                        </div>
                        <span className="text-xs font-semibold text-slate-300">{contact.username}</span>
                      </div>

                      {/* Custom Checkbox */}
                      <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                        isSelected 
                          ? 'bg-emerald-600 border-emerald-600 text-white' 
                          : 'border-slate-800 bg-slate-900'
                      }`}>
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Footer Submit */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 bg-transparent hover:bg-slate-850 border border-slate-850 text-slate-450 hover:text-slate-200 py-2 rounded-xl text-xs font-semibold transition-all disabled:opacity-50 cursor-pointer"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={loading || selectedUsers.length < 1 || !groupName.trim()} 
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 active:scale-99 text-white py-2 rounded-xl text-xs font-semibold cursor-pointer shadow-lg hover:shadow-emerald-600/10 transition-all flex items-center justify-center gap-2 disabled:bg-slate-850 disabled:text-slate-600 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-slate-600 border-t-emerald-500"></div>
              ) : (
                'Create Group'
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
