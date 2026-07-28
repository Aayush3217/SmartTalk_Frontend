import React, { useState } from 'react';
import axios from 'axios';
import { Mail, Phone, Lock, ArrowRight, Smartphone, AlertCircle, CheckCircle2, User, Camera, Globe, ChevronDown } from 'lucide-react';
import { useUserStore } from '../store/useUserStore';
import { signInWithPopup } from 'firebase/auth';
import { auth, provider } from '../utils/firebase';

const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000').replace(/[/\\]+$/, '');
const API_BASE = `${BACKEND_URL}/api`;

export default function Login() {
  const setCurrentUser = useUserStore((state) => state.setCurrentUser);
  const [method, setMethod] = useState('google'); // 'google' | 'manual'
  const [isManualLogin, setIsManualLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [preferredLanguage, setPreferredLanguage] = useState('English');
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [about, setAbout] = useState('Hey there! I am using smartTalk.');
  const [password, setPassword] = useState('');
  
  const [step, setStep] = useState(1); // 1: Send OTP, 2: Verify OTP (unused but kept for reference/compilation safety if needed, can be cleaned)
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const LANGUAGES = [
    'No Conversion',
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

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    setMessage('');
    
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      const idToken = await user.getIdToken();
      
      const response = await axios.post(`${API_BASE}/auth/google-login`, { idToken }, {
        withCredentials: true
      });
      
      setMessage('Google Login success! Redirecting...');
      
      if (response.data.data?.token) {
        localStorage.setItem('auth_token', response.data.data.token);
      }
      
      setTimeout(() => {
        setCurrentUser(response.data.data.user);
      }, 800);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || err.message || 'Google Sign-In failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Email and Password are required');
      return;
    }
    setLoading(true);
    setError('');
    setMessage('');
    
    try {
      const formData = new FormData();
      formData.append('username', username.trim());
      formData.append('email', email.trim());
      formData.append('password', password.trim());
      formData.append('preferredLanguage', preferredLanguage);
      formData.append('about', about);
      if (imageFile) {
        formData.append('media', imageFile);
      }
      
      const response = await axios.post(`${API_BASE}/auth/register-manual`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        withCredentials: true
      });
      
      setMessage('Access success! Redirecting...');
      
      if (response.data.data?.token) {
        localStorage.setItem('auth_token', response.data.data.token);
      }
      
      setTimeout(() => {
        setCurrentUser(response.data.data.user);
      }, 800);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to submit manual details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center w-full min-h-screen bg-slate-950 p-4 relative overflow-hidden">
      {/* Dynamic Background Gradients */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-purple-700/10 rounded-full blur-3xl" />

      <div className="w-full max-w-md bg-slate-900/85 border border-slate-800/80 rounded-2xl p-8 backdrop-blur-md shadow-brand flex flex-col gap-6 relative z-10">
        <div className="flex flex-col items-center text-center gap-2">
          <img src="/logo.jpg" alt="smartTalk Logo" className="w-24 h-24 rounded-2xl shadow-brand mb-2 object-cover border border-slate-850" />
          <h2 className="text-3xl font-extrabold text-slate-100 tracking-tight flex items-center gap-1">
            smart<span className="text-brand-gradient">Talk</span>
          </h2>
          <p className="text-xs text-slate-400">Chat Smarter. Connect Better.</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-red-400 flex items-center gap-3 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {message && (
          <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-xl p-3 text-cyan-400 flex items-center gap-3 text-sm">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <span>{message}</span>
          </div>
        )}

        {/* Tab Selection */}
        <div className="flex bg-slate-950 rounded-xl p-1 border border-slate-850">
          <button
            type="button"
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              method === 'google' 
                ? 'bg-slate-800 text-slate-100 shadow-sm' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
            onClick={() => { setMethod('google'); setError(''); setMessage(''); }}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Google Sign-In
          </button>
          <button
            type="button"
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              method === 'manual' 
                ? 'bg-slate-800 text-slate-100 shadow-sm' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
            onClick={() => { setMethod('manual'); setError(''); setMessage(''); }}
          >
            <User className="w-4 h-4" /> Manual Setup
          </button>
        </div>

        {method === 'google' ? (
          <div className="flex flex-col items-center justify-center py-6 text-center gap-4">
            <div className="w-16 h-16 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center shadow-inner">
              <svg className="w-8 h-8" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
            </div>
            <div className="flex flex-col gap-1">
              <h3 className="text-base font-bold text-slate-200">Sign in with Google</h3>
              <p className="text-xs text-slate-400 max-w-[280px]">
                Use your Google Account to instantly login or register to smartTalk.
              </p>
            </div>
            
            <button 
              type="button" 
              onClick={handleGoogleSignIn}
              disabled={loading} 
              className="w-full mt-2 bg-slate-950 border border-slate-800 hover:border-slate-700 hover:bg-slate-900 text-slate-300 hover:text-slate-100 py-3 rounded-xl text-sm font-semibold cursor-pointer transition-all flex items-center justify-center gap-3 shadow-inner active:scale-99 disabled:bg-slate-800 disabled:text-slate-600"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-slate-600 border-t-cyan-500"></div>
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  <span>Continue with Google</span>
                </>
              )}
            </button>
          </div>
        ) : (
          /* Manual Sign Up and Login Direct Flow */
          <form onSubmit={handleManualSubmit} className="flex flex-col gap-5">
            {isManualLogin ? (
              <>
                {/* Email Input */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-slate-400 font-semibold tracking-wider uppercase">Email Address</label>
                  <div className="relative flex items-center">
                    <Mail className="absolute left-3.5 text-slate-500 w-4 h-4" />
                    <input
                      type="email"
                      placeholder="name@domain.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-cyan-500 rounded-xl py-2.5 pl-11 pr-4 text-xs text-slate-100 placeholder-slate-650 outline-none transition-all focus:ring-2 focus:ring-cyan-500/20"
                  />
                  </div>
                </div>
                
                {/* Password Input */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-slate-400 font-semibold tracking-wider uppercase">Password</label>
                  <div className="relative flex items-center">
                    <Lock className="absolute left-3.5 text-slate-500 w-4 h-4" />
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-cyan-500 rounded-xl py-2.5 pl-11 pr-4 text-xs text-slate-100 placeholder-slate-650 outline-none transition-all focus:ring-2 focus:ring-cyan-500/20"
                    />
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Avatar Selector */}
                <div className="flex flex-col items-center gap-2">
                  <div className="relative w-20 h-20 rounded-full border-2 border-slate-800 bg-slate-950 flex items-center justify-center group overflow-hidden animate-pulse-subtle">
                    {previewUrl ? (
                      <img src={previewUrl} alt="Preview" className="w-full h-full object-cover rounded-full" />
                    ) : (
                      <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center">
                        <User className="w-8 h-8 text-slate-650" />
                      </div>
                    )}
                    <label 
                      htmlFor="avatar-login-upload" 
                      className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-brand-gradient bg-brand-gradient-hover flex items-center justify-center cursor-pointer border border-slate-900 transition-colors shadow-lg"
                    >
                      <Camera className="w-3.5 h-3.5 text-white" />
                      <input
                        id="avatar-login-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                      />
                    </label>
                  </div>
                  <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Profile Picture (Optional)</span>
                </div>

                {/* Name Input */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-slate-400 font-semibold tracking-wider uppercase">Name</label>
                  <div className="relative flex items-center">
                    <User className="absolute left-3.5 text-slate-500 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="John Doe"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-cyan-500 rounded-xl py-2.5 pl-11 pr-4 text-xs text-slate-100 placeholder-slate-650 outline-none transition-all focus:ring-2 focus:ring-cyan-500/20"
                    />
                  </div>
                </div>

                {/* Email Input */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-slate-400 font-semibold tracking-wider uppercase">Email Address</label>
                  <div className="relative flex items-center">
                    <Mail className="absolute left-3.5 text-slate-500 w-4 h-4" />
                    <input
                      type="email"
                      placeholder="name@domain.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-cyan-500 rounded-xl py-2.5 pl-11 pr-4 text-xs text-slate-100 placeholder-slate-650 outline-none transition-all focus:ring-2 focus:ring-cyan-500/20"
                    />
                  </div>
                </div>
                
                {/* Password Input */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-slate-400 font-semibold tracking-wider uppercase">Password</label>
                  <div className="relative flex items-center">
                    <Lock className="absolute left-3.5 text-slate-500 w-4 h-4" />
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-cyan-500 rounded-xl py-2.5 pl-11 pr-4 text-xs text-slate-100 placeholder-slate-650 outline-none transition-all focus:ring-2 focus:ring-cyan-500/20"
                    />
                  </div>
                </div>

                {/* Preferred Language Selection */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-slate-400 font-semibold tracking-wider uppercase">Preferred Language</label>
                  <div className="relative flex items-center">
                    <Globe className="absolute left-3.5 text-slate-500 w-4 h-4 z-10" />
                    <select
                      value={preferredLanguage}
                      onChange={(e) => setPreferredLanguage(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-cyan-500 rounded-xl py-2.5 pl-11 pr-10 text-xs text-slate-100 placeholder-slate-650 outline-none transition-all focus:ring-2 focus:ring-cyan-500/20 appearance-none cursor-pointer"
                    >
                      {LANGUAGES.map(lang => (
                        <option key={lang} value={lang} className="bg-slate-900 text-slate-200">
                          {lang}
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute right-4 flex items-center text-slate-550">
                      <ChevronDown className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>

                {/* About status info */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-slate-400 font-semibold tracking-wider uppercase">Status Description</label>
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      placeholder="Hey there! I am using smartTalk."
                      value={about}
                      onChange={(e) => setAbout(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-cyan-500 rounded-xl py-2.5 px-4 text-xs text-slate-100 placeholder-slate-650 outline-none transition-all focus:ring-2 focus:ring-cyan-500/20"
                    />
                  </div>
                </div>
              </>
            )}

            <button 
              type="submit" 
              disabled={loading} 
              className="w-full bg-brand-gradient bg-brand-gradient-hover active:scale-99 text-white py-3 rounded-xl text-sm font-semibold cursor-pointer shadow-brand transition-all flex items-center justify-center gap-2 disabled:bg-slate-800 disabled:text-slate-650"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-slate-600 border-t-cyan-500"></div>
              ) : (
                <>
                  {isManualLogin ? 'Login / Access Account' : 'Create Account / Register'} 
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {/* Switch Mode Link */}
            <div className="text-center mt-1">
              <button
                type="button"
                onClick={() => {
                  setIsManualLogin(!isManualLogin);
                  setError('');
                  setMessage('');
                }}
                className="text-xs text-cyan-400 hover:text-purple-400 font-semibold underline cursor-pointer transition-colors"
              >
                {isManualLogin ? "New user? Create an account instead" : "Already have an account? Log in directly"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
