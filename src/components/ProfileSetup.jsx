import React, { useState } from 'react';
import axios from 'axios';
import { Camera, User, FileText, Check, AlertCircle, ChevronDown, Globe } from 'lucide-react';
import { useUserStore } from '../store/useUserStore';

const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000').replace(/\/$/, '');
const API_BASE = `${BACKEND_URL}/api`;

export default function ProfileSetup({ onCancel }) {
  const { currentUser, setCurrentUser, clearUser } = useUserStore();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      const token = localStorage.getItem('auth_token');
      await axios.delete(`${API_BASE}/auth/delete-account`, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        withCredentials: true
      });
      localStorage.removeItem('auth_token');
      clearUser();
    } catch (err) {
      console.error("Delete account error:", err);
      setError(err.response?.data?.message || "Failed to delete account. Please try again.");
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };
  const [username, setUsername] = useState(currentUser.username || '');
  const [about, setAbout] = useState(currentUser.about || 'Hey there! I am using WhatsApp.');
  const [profilePicture, setProfilePicture] = useState(currentUser.profilePicture || '');
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(currentUser.profilePicture || '');
  const [preferredLanguage, setPreferredLanguage] = useState(currentUser.preferredLanguage || 'English');

  const LANGUAGES = [
    'English',
    'Hindi',
    'Punjabi',
    'Spanish',
    'French',
    'Japanese',
    'German',
    'Arabic',
    'Chinese'
  ];
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim()) {
      setError('Username is required');
      return;
    }
    
    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('username', username.trim());
      formData.append('about', about.trim());
      formData.append('agreed', 'true');
      formData.append('preferredLanguage', preferredLanguage);
      
      if (imageFile) {
        formData.append('media', imageFile); // 'media' is expected by Multer middleware in backend
      } else if (profilePicture) {
        formData.append('profilePicture', profilePicture);
      }

      const token = localStorage.getItem('auth_token');
      const response = await axios.put(`${API_BASE}/auth/update-profile`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        },
        withCredentials: true
      });

      if (response.data?.data) {
        setCurrentUser(response.data.data);
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center w-full min-h-screen bg-slate-950 p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-emerald-700/10 rounded-full blur-3xl" />

      <div className="w-full max-w-md bg-slate-900/80 border border-slate-800/80 rounded-2xl p-8 backdrop-blur-md shadow-2xl flex flex-col gap-6 relative z-10 animate-fade-in">
        <div className="flex flex-col items-center text-center gap-2">
          <h2 className="text-2xl font-bold text-slate-100">Profile Info</h2>
          <p className="text-xs text-slate-400">Please provide your name and an optional profile picture</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-red-400 flex items-center gap-3 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col items-center gap-2.5">
            <div className="relative w-28 h-28 rounded-full border-3 border-slate-800 bg-slate-950 flex items-center justify-center group overflow-hidden">
              {previewUrl ? (
                <img src={previewUrl} alt="Preview" className="w-full h-full object-cover rounded-full" />
              ) : (
                <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center">
                  <User className="w-12 h-12 text-slate-650" />
                </div>
              )}
              <label 
                htmlFor="avatar-upload" 
                className="absolute bottom-1 right-1 w-9 h-9 rounded-full bg-emerald-600 hover:bg-emerald-500 flex items-center justify-center cursor-pointer border-2 border-slate-900 transition-colors shadow-lg"
              >
                <Camera className="w-4 h-4 text-white" />
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </label>
            </div>
            <span className="text-xs text-slate-400">Tap camera to upload photo</span>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs text-slate-400 font-semibold tracking-wider uppercase">Your Name</label>
            <div className="relative flex items-center">
              <User className="absolute left-3.5 text-slate-500 w-5 h-5" />
              <input
                type="text"
                placeholder="John Doe"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                maxLength={25}
                required
                className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 rounded-xl py-3 pl-11 pr-4 text-sm text-slate-100 placeholder-slate-600 outline-none transition-all focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs text-slate-400 font-semibold tracking-wider uppercase">About / Status</label>
            <div className="relative flex items-center">
              <FileText className="absolute left-3.5 text-slate-500 w-5 h-5" />
              <input
                type="text"
                placeholder="Hey there! I am using WhatsApp."
                value={about}
                onChange={(e) => setAbout(e.target.value)}
                maxLength={100}
                className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 rounded-xl py-3 pl-11 pr-4 text-sm text-slate-100 placeholder-slate-600 outline-none transition-all focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs text-slate-400 font-semibold tracking-wider uppercase">Preferred Language</label>
            <div className="relative flex items-center">
              <Globe className="absolute left-3.5 text-slate-500 w-5 h-5 z-10" />
              <select
                value={preferredLanguage}
                onChange={(e) => setPreferredLanguage(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 rounded-xl py-3 pl-11 pr-10 text-sm text-slate-100 placeholder-slate-650 outline-none transition-all focus:ring-2 focus:ring-emerald-500/20 appearance-none cursor-pointer"
              >
                {LANGUAGES.map(lang => (
                  <option key={lang} value={lang} className="bg-slate-900 text-slate-200">
                    {lang}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute right-4 flex items-center text-slate-555">
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            {currentUser?.username && onCancel && (
              <button 
                type="button"
                onClick={onCancel}
                disabled={loading}
                className="flex-1 bg-transparent hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 py-3 rounded-xl text-sm font-semibold transition-all cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
            )}
            <button 
              type="submit" 
              disabled={loading} 
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 active:scale-99 text-white py-3 rounded-xl text-sm font-semibold cursor-pointer shadow-lg hover:shadow-emerald-600/10 transition-all flex items-center justify-center gap-2 disabled:bg-slate-800 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-slate-600 border-t-emerald-500"></div>
              ) : (
                <>Save Profile <Check className="w-4 h-4" /></>
              )}
            </button>
          </div>
        </form>

        {currentUser?.username && (
          <div className="border-t border-slate-800/80 pt-4 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full bg-red-950/20 hover:bg-red-900/20 border border-red-900/30 hover:border-red-900/50 text-red-400 py-3 rounded-xl text-sm font-semibold cursor-pointer transition-all flex items-center justify-center gap-2"
            >
              Delete Account
            </button>
          </div>
        )}
      </div>

      {/* Delete Account Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl flex flex-col gap-4 animate-fade-in">
            <h3 className="text-base font-bold text-slate-100">Delete Account?</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Are you sure you want to delete your account? This will permanently delete your profile, messages, conversations, and remove you from all groups. This action cannot be undone.
            </p>
            <div className="flex gap-3 mt-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 bg-transparent hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleting}
                className="flex-1 bg-red-650 hover:bg-red-600 active:scale-99 text-white py-2.5 rounded-xl text-xs font-semibold cursor-pointer shadow-lg hover:shadow-red-650/10 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
