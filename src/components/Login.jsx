import React, { useState } from 'react';
import axios from 'axios';
import { Mail, Phone, Lock, ArrowRight, Smartphone, AlertCircle, CheckCircle2, User, Camera, Globe, ChevronDown } from 'lucide-react';

const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000').replace(/\/$/, '');
const API_BASE = `${BACKEND_URL}/api`;

export default function Login({ onAuthSuccess }) {
  const [method, setMethod] = useState('phone'); // 'phone' | 'manual'
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneSuffix, setPhoneSuffix] = useState('+91');
  const [otp, setOtp] = useState('');
  const [preferredLanguage, setPreferredLanguage] = useState('English');
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [about, setAbout] = useState('Hey there! I am using WhatsApp.');
  
  const [step, setStep] = useState(1); // 1: Send OTP, 2: Verify OTP
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

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

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    
    try {
      const payload = { phoneNumber, phoneSuffix };
      const response = await axios.post(`${API_BASE}/auth/send-otp`, payload);
      setMessage(response.data.message || 'OTP sent successfully!');
      setStep(2);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to send OTP. Please check your inputs.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const payload = { phoneNumber, phoneSuffix, otp };
      const response = await axios.post(`${API_BASE}/auth/verify-otp`, payload, {
        withCredentials: true
      });
      
      setMessage('OTP verified! Redirecting...');
      
      if (response.data.data?.token) {
        localStorage.setItem('auth_token', response.data.data.token);
      }
      
      setTimeout(() => {
        onAuthSuccess(response.data.data.user);
      }, 800);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Invalid or expired OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !email.trim()) {
      setError('Name and Email are required');
      return;
    }
    setLoading(true);
    setError('');
    setMessage('');
    
    try {
      const formData = new FormData();
      formData.append('username', username.trim());
      formData.append('email', email.trim());
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
        onAuthSuccess(response.data.data.user);
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
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-emerald-700/10 rounded-full blur-3xl" />

      <div className="w-full max-w-md bg-slate-900/80 border border-slate-800/80 rounded-2xl p-8 backdrop-blur-md shadow-2xl flex flex-col gap-6 relative z-10">
        <div className="flex flex-col items-center text-center gap-2">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center border border-dashed border-emerald-500/30 mb-2">
            <Smartphone className="w-8 h-8 text-emerald-500" />
          </div>
          <h2 className="text-2xl font-bold text-slate-100">WhatsApp Web</h2>
          <p className="text-xs text-slate-400">Secure real-time end-to-end messaging</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-red-400 flex items-center gap-3 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {message && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-emerald-400 flex items-center gap-3 text-sm">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <span>{message}</span>
          </div>
        )}

        {/* Tab Selection */}
        <div className="flex bg-slate-950 rounded-xl p-1 border border-slate-850">
          <button
            type="button"
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              method === 'phone' 
                ? 'bg-slate-800 text-slate-100 shadow-sm' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
            onClick={() => { setMethod('phone'); setStep(1); setError(''); setMessage(''); }}
          >
            <Phone className="w-4 h-4" /> Phone Login
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

        {method === 'phone' ? (
          step === 1 ? (
            <form onSubmit={handleSendOtp} className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <label className="text-xs text-slate-400 font-semibold tracking-wider uppercase">Phone Number</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={phoneSuffix}
                    onChange={(e) => setPhoneSuffix(e.target.value)}
                    placeholder="+91"
                    className="w-16 bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 rounded-xl py-3 px-2 text-center text-sm text-slate-100 placeholder-slate-650 outline-none transition-all focus:ring-2 focus:ring-emerald-500/20"
                    required
                  />
                  <div className="relative flex-1 flex items-center">
                    <Phone className="absolute left-3.5 text-slate-500 w-5 h-5" />
                    <input
                      type="tel"
                      placeholder="9876543210"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      required
                      className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 rounded-xl py-3 pl-11 pr-4 text-sm text-slate-100 placeholder-slate-650 outline-none transition-all focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                </div>
              </div>

              <button 
                type="submit" 
                disabled={loading} 
                className="w-full bg-emerald-600 hover:bg-emerald-500 active:scale-99 text-white py-3 rounded-xl text-sm font-semibold cursor-pointer shadow-lg hover:shadow-emerald-600/10 transition-all flex items-center justify-center gap-2 disabled:bg-slate-800 disabled:text-slate-650 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-slate-600 border-t-emerald-500"></div>
                ) : (
                  <>Send Verification Code <ArrowRight className="w-4 h-4" /></>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="flex flex-col gap-5">
              <p className="text-sm text-slate-400 text-center leading-relaxed">
                We sent a verification code to{' '}
                <strong className="text-slate-100">{phoneSuffix} {phoneNumber}</strong>
              </p>

              <div className="flex flex-col gap-2">
                <label className="text-xs text-slate-400 font-semibold tracking-wider uppercase">Enter 6-Digit OTP</label>
                <div className="relative flex items-center">
                  <Lock className="absolute left-3.5 text-slate-500 w-5 h-5" />
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="000000"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 rounded-xl py-3 pl-11 pr-4 text-center text-lg font-bold tracking-widest text-slate-100 placeholder-slate-700 outline-none transition-all focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  disabled={loading}
                  className="flex-1 bg-transparent hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-450 hover:text-slate-200 py-3 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 cursor-pointer"
                >
                  Change Details
                </button>
                <button 
                  type="submit" 
                  disabled={loading} 
                  className="flex-1.5 bg-emerald-650 hover:bg-emerald-600 active:scale-99 text-white py-3 rounded-xl text-sm font-semibold cursor-pointer shadow-lg hover:shadow-emerald-600/10 transition-all flex items-center justify-center gap-2 disabled:bg-slate-800"
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-slate-600 border-t-emerald-500"></div>
                  ) : (
                    'Verify & Continue'
                  )}
                </button>
              </div>
            </form>
          )
        ) : (
          /* Manual Sign Up and Login Direct Flow */
          <form onSubmit={handleManualSubmit} className="flex flex-col gap-5">
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
                  className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-emerald-600 hover:bg-emerald-500 flex items-center justify-center cursor-pointer border border-slate-900 transition-colors shadow-lg"
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
                  className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 rounded-xl py-2.5 pl-11 pr-4 text-xs text-slate-100 placeholder-slate-600 outline-none transition-all focus:ring-2 focus:ring-emerald-500/20"
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
                  className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 rounded-xl py-2.5 pl-11 pr-4 text-xs text-slate-100 placeholder-slate-600 outline-none transition-all focus:ring-2 focus:ring-emerald-500/20"
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
                  className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 rounded-xl py-2.5 pl-11 pr-10 text-xs text-slate-100 placeholder-slate-650 outline-none transition-all focus:ring-2 focus:ring-emerald-500/20 appearance-none cursor-pointer"
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
                  placeholder="Hey there! I am using WhatsApp."
                  value={about}
                  onChange={(e) => setAbout(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 rounded-xl py-2.5 px-4 text-xs text-slate-100 placeholder-slate-600 outline-none transition-all focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading} 
              className="w-full bg-emerald-650 hover:bg-emerald-600 active:scale-99 text-white py-3 rounded-xl text-sm font-semibold cursor-pointer shadow-lg hover:shadow-emerald-600/10 transition-all flex items-center justify-center gap-2 disabled:bg-slate-800 disabled:text-slate-650"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-slate-600 border-t-emerald-500"></div>
              ) : (
                <>Sign In / Access Account <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
