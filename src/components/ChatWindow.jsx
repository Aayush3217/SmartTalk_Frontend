import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
  Send, Paperclip, Smile, MoreVertical, Trash2, Check, CheckCheck, 
  Image as ImageIcon, Film as VideoIcon, Sparkles, X, Copy, FileText
} from 'lucide-react';
import socketService from '../services/socket';

const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000').replace(/\/$/, '');
const API_BASE = `${BACKEND_URL}/api`;
const EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

export default function ChatWindow({ activeConversation, currentUser, onNewMessage }) {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingUser, setTypingUser] = useState(false);
  const [showOptionsId, setShowOptionsId] = useState(null);
  const [showReactionsId, setShowReactionsId] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [smartReplies, setSmartReplies] = useState([]);
  const [repliesLoading, setRepliesLoading] = useState(false);
  const [repliesError, setRepliesError] = useState(false);
  const [lastSuggestedMessageId, setLastSuggestedMessageId] = useState(null);
  
  // AI Assistant Panel States
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [aiMessages, setAiMessages] = useState([
    { role: 'ai', content: 'Hello! I am your AI Chat Assistant. You can ask me anything or upload an image or text file for analysis!' }
  ]);
  const [aiInput, setAiInput] = useState('');
  const [aiFile, setAiFile] = useState(null);
  const [aiFilePreview, setAiFilePreview] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  
  const aiFileInputRef = useRef(null);
  const aiMessagesEndRef = useRef(null);

  // AI Summarizer States
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [summaryText, setSummaryText] = useState('');
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState(false);
  const [summaryCache, setSummaryCache] = useState({});
  const [copySuccess, setCopySuccess] = useState(false);

  // AI Coach States
  const [showCoachModal, setShowCoachModal] = useState(false);
  const [coachSuggestions, setCoachSuggestions] = useState(null);
  const [coachLoading, setCoachLoading] = useState(false);
  const [coachError, setCoachError] = useState(false);
  const [coachCache, setCoachCache] = useState(null);

  // Translation View toggles
  const [showOriginalMessages, setShowOriginalMessages] = useState({});

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const receiver = activeConversation.participants.find(p => p._id !== currentUser._id);

  // Fetch messages when conversation changes
  useEffect(() => {
    if (!activeConversation?._id) return;
    
    axios.get(`${API_BASE}/chats/conversation/${activeConversation._id}/messages`, { withCredentials: true })
      .then(res => {
        setMessages(res.data.data || []);
        scrollToBottom();
      })
      .catch(err => console.error(err));
      
    // Reset inputs & AI replies
    setInputText('');
    setFile(null);
    setFilePreview('');
    setSmartReplies([]);
    setRepliesLoading(false);
    setRepliesError(false);
    setLastSuggestedMessageId(null);
    setAiInput('');
    setAiFile(null);
    setAiFilePreview('');
    setShowSummaryModal(false);
    setSummaryText('');
    setSummaryLoading(false);
    setSummaryError(false);
    setCopySuccess(false);
    setShowCoachModal(false);
    setCoachSuggestions(null);
    setCoachLoading(false);
    setCoachError(false);
    setCoachCache(null);
    setShowOriginalMessages({});
  }, [activeConversation._id]);

  // Set up socket listeners for message status updates, typing indicators, reactions, deletions
  useEffect(() => {
    if (!activeConversation?._id) return;

    // Listen for new messages
    const handleReceiveMessage = (msg) => {
      if (msg.conversation === activeConversation._id) {
        setMessages(prev => [...prev, msg]);
        scrollToBottom();

        // Mark as read immediately if it's from the other person
        if (msg.sender._id !== currentUser._id) {
          axios.put(`${API_BASE}/chats/message/read`, { messageIds: [msg._id] }, { withCredentials: true })
            .then(() => {
              socketService.emitMessageRead([msg._id], msg.sender._id);
            })
            .catch(err => console.error(err));
        }
      }
    };

    // Listen for message deletions
    const handleMessageDeleted = (deletedMessageId) => {
      setMessages(prev => prev.filter(m => m._id !== deletedMessageId));
    };

    // Listen for typing events
    const handleUserTyping = ({ userId, conversationId, isTyping }) => {
      if (conversationId === activeConversation._id && userId !== currentUser._id) {
        setTypingUser(isTyping);
      }
    };

    // Listen for emoji reactions updates
    const handleReactionUpdate = ({ messageId, reactions }) => {
      setMessages(prev => prev.map(m => {
        if (m._id === messageId) {
          return { ...m, reactions };
        }
        return m;
      }));
    };

    // Listen for message read status updates
    const handleStatusUpdate = ({ messageId, messageStatus }) => {
      setMessages(prev => prev.map(m => {
        if (m._id === messageId) {
          return { ...m, messageStatus };
        }
        return m;
      }));
    };

    socketService.on('receive_message', handleReceiveMessage);
    socketService.on('message_deleted', handleMessageDeleted);
    socketService.on('user_typing', handleUserTyping);
    socketService.on('reaction_update', handleReactionUpdate);
    socketService.on('message_status_update', handleStatusUpdate);

    // Initial load: mark all incoming unread messages as read
    const unreadMessageIds = messages
      .filter(m => m.sender._id !== currentUser._id && m.messageStatus !== 'read')
      .map(m => m._id);

    if (unreadMessageIds.length > 0) {
      axios.put(`${API_BASE}/chats/message/read`, { messageIds: unreadMessageIds }, { withCredentials: true })
        .then(() => {
          socketService.emitMessageRead(unreadMessageIds, receiver._id);
        })
        .catch(err => console.error(err));
    }

    return () => {
      socketService.off('receive_message', handleReceiveMessage);
      socketService.off('message_deleted', handleMessageDeleted);
      socketService.off('user_typing', handleUserTyping);
      socketService.off('reaction_update', handleReactionUpdate);
      socketService.off('message_status_update', handleStatusUpdate);
    };
  }, [activeConversation._id, messages.length]);

  // AI Smart Replies generator
  useEffect(() => {
    if (!messages || messages.length === 0) {
      setSmartReplies([]);
      return;
    }

    const latestMsg = messages[messages.length - 1];
    const isOtherUserText = latestMsg.sender && latestMsg.sender._id !== currentUser._id;
    const isText = latestMsg.contentType === 'text';
    const isNotEmpty = latestMsg.content && latestMsg.content.trim().length > 0;
    const isNotAlreadySuggested = latestMsg._id !== lastSuggestedMessageId;

    if (isOtherUserText && isText && isNotEmpty && isNotAlreadySuggested) {
      setSmartReplies([]);
      setRepliesLoading(true);
      setRepliesError(false);
      setLastSuggestedMessageId(latestMsg._id);

      const token = localStorage.getItem('auth_token');
      axios.post(`${API_BASE}/ai/smart-reply`, 
        { message: latestMsg.content },
        {
          headers: { 'Authorization': `Bearer ${token}` },
          withCredentials: true
        }
      )
      .then(res => {
        if (latestMsg._id === messages[messages.length - 1]?._id) {
          setSmartReplies(res.data.data || []);
        }
      })
      .catch(err => {
        console.error("Failed to fetch smart replies:", err);
        setRepliesError(true);
      })
      .finally(() => {
        setRepliesLoading(false);
      });
    } else if (!isOtherUserText || !isText || !isNotEmpty) {
      setSmartReplies([]);
    }
  }, [messages, currentUser._id, lastSuggestedMessageId]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setInputText(newValue);
    setSmartReplies([]);

    // Clear AI Coach suggestions and cache if the input changed
    if (coachCache && coachCache.text !== newValue) {
      setCoachSuggestions(null);
      setCoachCache(null);
    }

    // Emit typing_start
    if (!isTyping) {
      setIsTyping(true);
      socketService.emitTypingStart(activeConversation._id, receiver._id);
    }

    // Debounce typing_stop
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      socketService.emitTypingStop(activeConversation._id, receiver._id);
    }, 2000);
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setFilePreview(URL.createObjectURL(selectedFile));
    }
  };

  const performSendMessage = async (text, tempFile) => {
    try {
      const formData = new FormData();
      formData.append('senderId', currentUser._id);
      formData.append('receiverId', receiver._id);
      formData.append('content', text.trim());
      formData.append('messageStatus', 'send');

      if (tempFile) {
        formData.append('media', tempFile);
      }

      const token = localStorage.getItem('auth_token');
      const response = await axios.post(`${API_BASE}/chats/send-message`, formData, {
        headers: { 
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        },
        withCredentials: true
      });

      if (response.data?.data) {
        const newMsg = response.data.data;
        setMessages(prev => [...prev, newMsg]);
        scrollToBottom();

        socketService.emitSendMessage(newMsg);
        
        onNewMessage(newMsg);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to send message.');
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputText.trim() && !file) return;

    const tempText = inputText;
    const tempFile = file;

    setInputText('');
    setFile(null);
    setFilePreview('');

    await performSendMessage(tempText, tempFile);
  };

  const handleSelectSmartReply = async (replyText) => {
    setSmartReplies([]);
    await performSendMessage(replyText, null);
  };

  const handleDeleteMessage = (messageId) => {
    setDeleteConfirmId(messageId);
  };

  // AI Chat Assistant Event Handlers
  const scrollToAiBottom = () => {
    setTimeout(() => {
      aiMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  useEffect(() => {
    if (showAiPanel) {
      scrollToAiBottom();
    }
  }, [aiMessages, showAiPanel]);

  const handleAiFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setAiFile(selectedFile);
      setAiFilePreview(URL.createObjectURL(selectedFile));
    }
  };

  const handleSendAiMessage = async (e) => {
    if (e) e.preventDefault();
    if (!aiInput.trim() && !aiFile) return;

    const userPrompt = aiInput;
    const userFile = aiFile;
    const filePreviewUrl = aiFilePreview;

    // Add user message to local state
    setAiMessages(prev => [...prev, {
      role: 'user',
      content: userPrompt,
      filePreview: filePreviewUrl,
      fileName: userFile ? userFile.name : null,
      fileType: userFile ? userFile.type : null
    }]);

    setAiInput('');
    setAiFile(null);
    setAiFilePreview('');
    setAiLoading(true);

    try {
      const formData = new FormData();
      formData.append('prompt', userPrompt);
      if (userFile) {
        formData.append('media', userFile);
      }

      const token = localStorage.getItem('auth_token');
      const res = await axios.post(`${API_BASE}/ai/chat`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        },
        withCredentials: true
      });

      const aiReplyText = res.data?.data?.content || "Sorry, I encountered an issue processing your request.";
      setAiMessages(prev => [...prev, {
        role: 'ai',
        content: aiReplyText
      }]);

    } catch (err) {
      console.error("AI chat error:", err);
      setAiMessages(prev => [...prev, {
        role: 'ai',
        content: "An error occurred. Please make sure your server is online and try again."
      }]);
    } finally {
      setAiLoading(false);
    }
  };

  // AI Chat Summarizer Event Handlers
  const handleSummarizeChat = async (forceRefresh = false) => {
    setShowSummaryModal(true);
    const convId = activeConversation._id;

    // Check session cache first
    if (!forceRefresh && summaryCache[convId] && summaryCache[convId].messageCount === messages.length) {
      setSummaryText(summaryCache[convId].summary);
      setSummaryLoading(false);
      setSummaryError(false);
      return;
    }

    setSummaryLoading(true);
    setSummaryError(false);
    setSummaryText('');

    try {
      const token = localStorage.getItem('auth_token');
      const res = await axios.post(`${API_BASE}/ai/chat-summary`, 
        { conversationId: convId },
        {
          headers: { 'Authorization': `Bearer ${token}` },
          withCredentials: true
        }
      );

      const summaryResult = res.data?.data?.summary || "• No summary could be generated.";
      setSummaryText(summaryResult);

      // Save to session cache
      setSummaryCache(prev => ({
        ...prev,
        [convId]: {
          summary: summaryResult,
          messageCount: messages.length
        }
      }));
    } catch (err) {
      console.error("AI summary error:", err);
      setSummaryError(true);
    } finally {
      setSummaryLoading(false);
    }
  };

  const handleCopySummary = () => {
    if (!summaryText) return;
    navigator.clipboard.writeText(summaryText)
      .then(() => {
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      })
      .catch(err => console.error("Failed to copy summary:", err));
  };

  // AI Conversation Coach Event Handlers
  const handleImproveMessage = async () => {
    if (!inputText.trim()) return;
    setShowCoachModal(true);

    // Check cache
    if (coachCache && coachCache.text === inputText) {
      setCoachSuggestions(coachCache.suggestions);
      setCoachLoading(false);
      setCoachError(false);
      return;
    }

    setCoachLoading(true);
    setCoachError(false);
    setCoachSuggestions(null);

    try {
      const token = localStorage.getItem('auth_token');
      const res = await axios.post(`${API_BASE}/ai/improve-message`, 
        { message: inputText },
        {
          headers: { 'Authorization': `Bearer ${token}` },
          withCredentials: true
        }
      );

      const suggestions = res.data?.data;
      if (!suggestions || !suggestions.friendly) {
        throw new Error("Invalid suggestions structure from backend");
      }

      setCoachSuggestions(suggestions);
      setCoachCache({
        text: inputText,
        suggestions: suggestions
      });
    } catch (err) {
      console.error("AI improve message error:", err);
      setCoachError(true);
    } finally {
      setCoachLoading(false);
    }
  };

  const handleSelectCoachSuggestion = (suggestionText) => {
    setInputText(suggestionText);
    setShowCoachModal(false);
  };

  const getDisplayMessage = (msg) => {
    // Senders always see their original message.
    if (msg.sender?._id === currentUser._id) {
      return { text: msg.content, isTranslated: false };
    }

    const targetLang = currentUser.preferredLanguage || 'English';
    const translation = msg.translations?.find(t => t.language.toLowerCase() === targetLang.toLowerCase());

    if (translation && !showOriginalMessages[msg._id]) {
      return {
        text: translation.content,
        isTranslated: true,
        originalLang: msg.originalLanguage || 'English'
      };
    }

    return { text: msg.content, isTranslated: false };
  };

  const handleDeleteMessageFinal = async (messageId) => {
    try {
      const token = localStorage.getItem('auth_token');
      await axios.delete(`${API_BASE}/chats/messages/${messageId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        withCredentials: true
      });
      setMessages(prev => prev.filter(m => m._id !== messageId));
      socketService.emitSendMessage({ type: 'delete', messageId, receiverId: receiver._id });
    } catch (err) {
      console.error(err);
    } finally {
      setDeleteConfirmId(null);
    }
  };

  const handleAddReaction = (messageId, emoji) => {
    socketService.emitAddReaction(messageId, emoji, currentUser._id, currentUser._id);
    setShowOptionsId(null);
  };

  const formatTime = (dateStr) => {
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (d.toDateString() === today.toDateString()) return 'Today';
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
  };

  const formatAiResponse = (text) => {
    if (!text) return '';
    
    let formatted = text
      .replace(/^### (.*$)/gim, '<h4 class="font-bold text-sm text-emerald-450 mt-2 mb-1">$1</h4>')
      .replace(/^## (.*$)/gim, '<h3 class="font-bold text-base text-emerald-400 mt-3 mb-1">$1</h3>')
      .replace(/^# (.*$)/gim, '<h2 class="font-bold text-lg text-slate-100 mt-4 mb-2">$1</h2>')
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-slate-100">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
      .replace(/`(.*?)`/g, '<code class="bg-slate-950/80 border border-slate-800/40 px-1.5 py-0.5 rounded text-emerald-400 font-mono text-[11px]">$1</code>')
      .replace(/```([\s\S]*?)```/g, '<pre class="bg-slate-950/80 p-2.5 rounded-lg font-mono text-[11px] text-slate-300 my-2 overflow-x-auto border border-slate-800/60">$1</pre>')
      .replace(/^\s*-\s+(.*$)/gim, '<li class="ml-4 list-disc text-slate-350 my-1">$1</li>')
      .replace(/^\s*\d+\.\s+(.*$)/gim, '<li class="ml-4 list-decimal text-slate-350 my-1">$1</li>')
      .replace(/\n/g, '<br />');

    return <div dangerouslySetInnerHTML={{ __html: formatted }} className="markdown-body" />;
  };

  const groupedMessages = messages.reduce((groups, msg) => {
    const date = formatDate(msg.createdAt);
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(msg);
    return groups;
  }, {});

  return (
    <div className="flex-1 flex h-full bg-slate-950 overflow-hidden relative">
      <div className="flex-1 flex flex-col h-full bg-slate-950 min-w-0 border-r border-slate-800/10">
      
      {/* Header */}
      <div className="h-16 bg-slate-800/40 px-6 flex items-center justify-between border-b border-slate-800/80 z-10">
        <div className="flex items-center gap-3">
          {receiver.profilePicture ? (
            <img src={receiver.profilePicture} alt="" className="w-10 h-10 rounded-full object-cover" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-slate-850 text-emerald-555 font-bold flex items-center justify-center">
              {receiver.username?.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <div className="font-semibold text-sm text-slate-100">{receiver.username}</div>
            <div className="text-xs">
              {typingUser ? (
                <span className="text-emerald-400 font-semibold animate-pulse">typing...</span>
              ) : receiver.isOnline ? (
                <span className="text-emerald-400">online</span>
              ) : (
                <span className="text-slate-500">offline</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button 
            onClick={() => handleSummarizeChat(false)}
            title="Summarize Chat"
            className="p-2 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-full transition-all cursor-pointer"
          >
            <FileText className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setShowAiPanel(prev => !prev)}
            title="AI Chat Assistant"
            className={`p-2 rounded-full transition-all cursor-pointer ${
              showAiPanel ? 'text-emerald-450 bg-emerald-500/10' : 'text-slate-400 hover:text-emerald-400 hover:bg-slate-800'
            }`}
          >
            <Sparkles className="w-5 h-5 animate-pulse" />
          </button>
          <button className="p-2 text-slate-400 hover:text-slate-200 rounded-full transition-colors cursor-pointer">
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Message Area */}
      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 bg-[radial-gradient(circle_at_center,_#0b0f12_0%,_#05080a_100%)]">
        {messages.length === 0 ? (
          <div className="m-auto flex flex-col items-center text-center gap-3 max-w-xs text-slate-450">
            <Sparkles className="w-9 h-9 text-emerald-500" />
            <p className="text-sm font-semibold">Start a secure conversation with {receiver.username}</p>
            <span className="text-xxs text-slate-500">Messages are end-to-end connected in real time.</span>
          </div>
        ) : (
          Object.entries(groupedMessages).map(([date, msgs]) => (
            <div key={date} className="flex flex-col">
              <div className="flex justify-center my-4">
                <span className="bg-slate-800/80 border border-slate-800/80 text-slate-350 text-[10px] font-bold px-3.5 py-1 rounded-full uppercase tracking-wider">
                  {date}
                </span>
              </div>

              {msgs.map(msg => {
                const isMine = msg.sender._id === currentUser._id;
                const reactions = msg.reactions || [];

                return (
                  <div 
                    key={msg._id} 
                    className={`flex my-1.5 w-full group/row ${isMine ? 'justify-end' : 'justify-start'}`}
                    onMouseLeave={() => setShowOptionsId(null)}
                  >
                    <div className="flex items-start gap-1.5 max-w-[65%] relative">
                      
                      {/* Message Bubble */}
                      <div 
                        className={`p-3 rounded-2xl relative shadow-md ${
                          isMine 
                            ? 'bg-emerald-600/90 hover:bg-emerald-600 border border-emerald-500/10 rounded-tr-none ml-auto text-slate-100' 
                            : 'bg-slate-800 hover:bg-slate-750 border border-slate-750/30 rounded-tl-none mr-auto text-slate-200'
                        }`}
                      >
                        {/* Media Attachment */}
                        {msg.imageOrVideoUrl && (
                          <div className="rounded-lg overflow-hidden mb-2 bg-black border border-slate-900">
                            {msg.contentType === 'video' ? (
                              <video src={msg.imageOrVideoUrl} controls className="max-w-full max-h-60 object-contain block" />
                            ) : (
                              <img src={msg.imageOrVideoUrl} alt="Attachment" className="max-w-full max-h-60 object-contain block" />
                            )}
                          </div>
                        )}

                        {/* Message content */}
                        {msg.content && (() => {
                          const { text: displayText, isTranslated, originalLang } = getDisplayMessage(msg);
                          return (
                            <div>
                              <p className="text-[14px] leading-relaxed break-words whitespace-pre-wrap">{displayText}</p>
                              {isTranslated && (
                                <div className="flex items-center gap-1 mt-1 select-none text-[9px] text-emerald-400 font-medium opacity-85">
                                  <span>Translated from {originalLang}</span>
                                  <span>•</span>
                                  <button 
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setShowOriginalMessages(prev => ({ ...prev, [msg._id]: true }));
                                    }}
                                    className="underline hover:text-emerald-300 transition-colors cursor-pointer"
                                  >
                                    View Original
                                  </button>
                                </div>
                              )}
                              {!isMine && msg.translations?.some(t => t.language.toLowerCase() === (currentUser.preferredLanguage || 'English').toLowerCase()) && showOriginalMessages[msg._id] && (
                                <div className="flex items-center gap-1 mt-1 select-none text-[9px] text-slate-450 font-medium opacity-85">
                                  <span>Original text</span>
                                  <span>•</span>
                                  <button 
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setShowOriginalMessages(prev => ({ ...prev, [msg._id]: false }));
                                    }}
                                    className="underline hover:text-slate-350 transition-colors cursor-pointer"
                                  >
                                    View Translation
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })()}

                        {/* Bubble footer (Time & status checkmarks) */}
                        <div className="flex justify-end items-center gap-1.5 mt-2">
                          <span className="text-[10px] text-slate-450">{formatTime(msg.createdAt)}</span>
                          {isMine && (
                            <span className="flex items-center">
                              {msg.messageStatus === 'read' ? (
                                <CheckCheck className="w-3.5 h-3.5 text-sky-400" />
                              ) : msg.messageStatus === 'delivered' ? (
                                <CheckCheck className="w-3.5 h-3.5 text-slate-500" />
                              ) : (
                                <Check className="w-3.5 h-3.5 text-slate-500" />
                              )}
                            </span>
                          )}
                        </div>

                        {/* Emoji Reactions Pills */}
                        {reactions.length > 0 && (
                          <div className="absolute -bottom-2.5 right-2.5 bg-slate-900 border border-slate-800 rounded-full px-2 py-0.5 flex gap-0.5 text-xs shadow-lg cursor-default z-10">
                            {reactions.map((r, i) => (
                              <span key={i} title={r.user?.username}>{r.emoji}</span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Options hover menu */}
                      <div className="relative self-center flex items-center gap-1 opacity-0 group-hover/row:opacity-100 transition-opacity">
                        
                        {/* Smile button for reactions */}
                        <div className="relative">
                          <button 
                            className="p-1.5 text-slate-500 hover:text-slate-300 rounded-full hover:bg-slate-800 transition-colors cursor-pointer"
                            onClick={() => {
                              setShowReactionsId(showReactionsId === msg._id ? null : msg._id);
                              setShowOptionsId(null);
                            }}
                          >
                            <Smile className="w-4 h-4" />
                          </button>

                          {showReactionsId === msg._id && (
                            <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-slate-900 border border-slate-800 rounded-2xl p-1.5 z-50 flex gap-1 shadow-2xl">
                              {EMOJIS.map(e => (
                                <button 
                                  key={e} 
                                  onClick={() => {
                                    handleAddReaction(msg._id, e);
                                    setShowReactionsId(null);
                                  }}
                                  className="text-lg p-1 hover:bg-slate-850 rounded-lg cursor-pointer transition-transform duration-100 hover:scale-115"
                                >
                                  {e}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* MoreOptions button for Copy/Delete */}
                        <div className="relative">
                          <button 
                            className="p-1.5 text-slate-500 hover:text-slate-300 rounded-full hover:bg-slate-800 transition-colors cursor-pointer"
                            onClick={() => {
                              setShowOptionsId(showOptionsId === msg._id ? null : msg._id);
                              setShowReactionsId(null);
                            }}
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {showOptionsId === msg._id && (
                            <div className="absolute bottom-full mb-1 right-0 bg-slate-900 border border-slate-800 rounded-2xl p-2 z-50 flex flex-col gap-1 shadow-2xl min-w-[140px]">
                              
                              <button 
                                onClick={() => {
                                  navigator.clipboard.writeText(msg.content);
                                  setShowOptionsId(null);
                                }}
                                className="text-slate-300 hover:bg-slate-800 text-xs flex items-center gap-2 w-full text-left p-2 rounded-xl cursor-pointer transition-colors"
                              >
                                <Copy className="w-3.5 h-3.5 text-slate-400" /> Copy text
                              </button>

                              {isMine && (
                                <button 
                                  onClick={() => {
                                    handleDeleteMessage(msg._id);
                                    setShowOptionsId(null);
                                  }} 
                                  className="text-red-400 hover:bg-red-500/10 text-xs flex items-center gap-2 w-full text-left p-2 rounded-xl cursor-pointer transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" /> Delete message
                                </button>
                              )}
                            </div>
                          )}
                        </div>

                      </div>

                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* AI Smart Replies Suggestions */}
      {(repliesLoading || smartReplies.length > 0 || repliesError) && (
        <div className="px-6 py-2.5 bg-slate-900/30 border-t border-slate-800/40 flex flex-wrap items-center gap-2 relative z-10 animate-fade-in">
          {repliesLoading && (
            <span className="text-xxs text-slate-500 flex items-center gap-1.5 px-3 py-1 select-none">
              <span className="animate-spin rounded-full h-3 w-3 border-2 border-slate-700 border-t-emerald-500"></span>
              Generating smart replies...
            </span>
          )}

          {repliesError && (
            <span className="text-xxs text-red-400/80 px-3 py-1 select-none">
              Could not load smart replies.
            </span>
          )}

          {!repliesLoading && smartReplies.length > 0 && (
            <>
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mr-1 select-none">AI Reply:</span>
              {smartReplies.map((reply, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectSmartReply(reply)}
                  className="bg-slate-900 border border-slate-800 hover:border-emerald-500/40 hover:bg-emerald-950/20 text-slate-200 hover:text-emerald-400 font-medium text-xs px-3.5 py-1.5 rounded-full cursor-pointer transition-all duration-200 shadow-md transform hover:-translate-y-0.5 active:scale-98"
                >
                  {reply}
                </button>
              ))}
            </>
          )}
        </div>
      )}

      {/* Input bar toolbar */}
      <form onSubmit={handleSend} className="min-h-16 p-3 px-5 bg-slate-800/20 border-t border-slate-800/80 flex items-center gap-3 relative z-10">
        <div className="flex">
          <label htmlFor="chat-attachment" className="p-2.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-full cursor-pointer transition-colors">
            <Paperclip className="w-5 h-5" />
            <input 
              id="chat-attachment" 
              type="file" 
              accept="image/*,video/*" 
              onChange={handleFileChange}
              ref={fileInputRef}
              className="hidden"
            />
          </label>
        </div>

        {/* Selected file preview */}
        {filePreview && (
          <div className="absolute bottom-[72px] left-4 bg-slate-900 border border-slate-800 p-3 rounded-2xl flex items-center gap-3 shadow-2xl z-20 pr-8 animate-slide-up">
            <button 
              type="button" 
              onClick={() => { setFile(null); setFilePreview(''); }} 
              className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-600 text-white flex items-center justify-center cursor-pointer shadow-md hover:bg-red-500 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
            {file?.type.startsWith('video') ? (
              <VideoIcon className="w-7 h-7 text-emerald-555" />
            ) : (
              <img src={filePreview} alt="Preview" className="w-10 h-10 rounded-lg object-cover" />
            )}
            <span className="text-xs text-slate-200 max-w-[120px] truncate">{file?.name}</span>
          </div>
        )}

        <button
          type="button"
          onClick={handleImproveMessage}
          disabled={!inputText.trim()}
          title="Improve message with AI"
          className="px-3.5 py-2.5 bg-slate-900/80 border border-slate-800 hover:border-emerald-500/40 text-xs font-semibold text-slate-200 hover:text-emerald-450 rounded-full cursor-pointer transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
        >
          ✨ AI Improve
        </button>

        <input
          type="text"
          placeholder="Type a message..."
          value={inputText}
          onChange={handleInputChange}
          className="flex-1 bg-slate-900 border border-slate-850 focus:border-emerald-500 rounded-full py-3 px-5 text-sm text-slate-100 placeholder-slate-550 outline-none transition-all"
        />

        <button 
          type="submit" 
          disabled={!inputText.trim() && !file}
          className="w-11 h-11 rounded-full bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white flex items-center justify-center cursor-pointer transition-all disabled:bg-slate-800 disabled:text-slate-650 disabled:cursor-not-allowed"
        >
          <Send className="w-4 h-4 ml-0.5" />
        </button>
      </form>

      {/* Custom Modern Confirm Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-[100] flex items-center justify-center p-4 transition-all duration-300">
          <div className="bg-slate-900 border border-slate-800/80 max-w-sm w-full rounded-2xl p-6 shadow-2xl flex flex-col gap-5 animate-scale-in">
            <div className="flex flex-col gap-2">
              <h3 className="text-lg font-bold text-slate-100">Delete Message?</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Are you sure you want to delete this message? This will delete the message for everyone in this chat.
              </p>
            </div>
            <div className="flex gap-3 justify-end">
              <button 
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-350 hover:text-slate-200 font-semibold text-xs rounded-xl cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={() => handleDeleteMessageFinal(deleteConfirmId)}
                className="px-4 py-2.5 bg-red-650 hover:bg-red-550 active:scale-97 text-white font-semibold text-xs rounded-xl cursor-pointer shadow-lg shadow-red-900/10 transition-all"
              >
                Delete for Everyone
              </button>
            </div>
          </div>
        </div>
      )}
      </div>

      {/* AI Assistant Panel Drawer */}
      {showAiPanel && (
        <div className="w-80 md:w-96 border-l border-slate-800/80 bg-slate-900 h-full flex flex-col animate-slide-in relative z-20 shrink-0">
          {/* Drawer Header */}
          <div className="h-16 border-b border-slate-800/80 px-4 flex items-center justify-between bg-slate-850">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-500 animate-pulse" />
              <span className="font-semibold text-sm text-slate-100">AI Assistant</span>
            </div>
            <button 
              onClick={() => setShowAiPanel(false)} 
              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-full transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Drawer Messages list */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 bg-[radial-gradient(circle_at_center,_#0f172a_0%,_#090d16_100%)]">
            {aiMessages.map((msg, index) => (
              <div key={index} className={`flex flex-col gap-1 max-w-[85%] ${msg.role === 'user' ? 'self-end items-end' : 'self-start items-start'}`}>
                {msg.filePreview && (
                  <div className="mb-1 rounded-lg overflow-hidden border border-slate-800 bg-slate-950 p-1 max-w-[150px]">
                    {msg.fileType?.startsWith('image/') ? (
                      <img src={msg.filePreview} alt="Uploaded" className="w-full h-24 object-cover rounded" />
                    ) : (
                      <div className="p-2 flex items-center gap-1.5 text-[10px] text-slate-300">
                        <Paperclip className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span className="truncate max-w-[100px]">{msg.fileName}</span>
                      </div>
                    )}
                  </div>
                )}
                <div className={`p-3 rounded-2xl text-xs leading-relaxed ${
                  msg.role === 'user' 
                    ? 'bg-emerald-600 text-white rounded-tr-none' 
                    : 'bg-slate-800/85 text-slate-200 border border-slate-750 rounded-tl-none shadow-md'
                }`}>
                  {msg.role === 'ai' ? formatAiResponse(msg.content) : msg.content}
                </div>
              </div>
            ))}
            
            {aiLoading && (
              <div className="self-start flex items-center gap-2 max-w-[85%]">
                <div className="p-3 bg-slate-800/85 border border-slate-750 rounded-2xl rounded-tl-none flex items-center gap-1.5 text-xxs text-slate-400">
                  <span className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-slate-750 border-t-emerald-500"></span>
                  Thinking...
                </div>
              </div>
            )}
            <div ref={aiMessagesEndRef} />
          </div>

          {/* Drawer Input form */}
          <form onSubmit={handleSendAiMessage} className="p-3 bg-slate-850 border-t border-slate-800/85 flex flex-col gap-2">
            {aiFilePreview && (
              <div className="relative self-start bg-slate-900 border border-slate-800 p-2 pr-6 rounded-lg flex items-center gap-2">
                <button 
                  type="button" 
                  onClick={() => { setAiFile(null); setAiFilePreview(''); }} 
                  className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-red-600 text-white flex items-center justify-center cursor-pointer hover:bg-red-500 transition-colors"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
                {aiFile?.type.startsWith('image/') ? (
                  <img src={aiFilePreview} alt="" className="w-8 h-8 rounded object-cover" />
                ) : (
                  <Paperclip className="w-4 h-4 text-emerald-500" />
                )}
                <span className="text-[10px] text-slate-300 max-w-[100px] truncate">{aiFile?.name}</span>
              </div>
            )}
            
            <div className="flex items-center gap-2">
              <label className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-855 rounded-full cursor-pointer transition-colors shrink-0">
                <Paperclip className="w-4 h-4" />
                <input 
                  type="file" 
                  accept="image/*,.txt,.js,.json,.csv,.md,.html" 
                  onChange={handleAiFileChange}
                  ref={aiFileInputRef}
                  className="hidden"
                />
              </label>
              <input 
                type="text" 
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
                placeholder="Ask AI anything..."
                className="flex-1 bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-xl py-2.5 px-4 text-xs text-slate-150 placeholder-slate-500 outline-none transition-all"
              />
              <button 
                type="submit"
                disabled={(!aiInput.trim() && !aiFile) || aiLoading}
                className="p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center cursor-pointer transition-all disabled:bg-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        </div>
      )}

      {/* AI Chat Summarizer Modal */}
      {showSummaryModal && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-md z-[100] flex items-center justify-center p-4 transition-all duration-300 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800/80 max-w-md w-full rounded-2xl p-6 shadow-2xl flex flex-col gap-5 max-h-[85vh] overflow-y-auto animate-scale-in">
            <div className="flex justify-between items-center border-b border-slate-800/60 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-500" />
                <h3 className="text-base font-bold text-slate-100">Conversation Summary</h3>
              </div>
              <button 
                onClick={() => setShowSummaryModal(false)}
                className="p-1 text-slate-450 hover:text-slate-200 hover:bg-slate-800 rounded-full transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Summary Text Area */}
            <div className="flex-1 min-h-[160px] bg-slate-950/40 border border-slate-800/50 rounded-xl p-4 leading-relaxed text-sm text-slate-250 select-text">
              {summaryLoading && (
                <div className="flex flex-col items-center justify-center gap-3 py-10">
                  <span className="animate-spin rounded-full h-8 w-8 border-3 border-slate-700 border-t-emerald-500"></span>
                  <span className="text-xs text-slate-400 animate-pulse">Summarizing conversation...</span>
                </div>
              )}

              {summaryError && (
                <div className="flex flex-col items-center justify-center gap-2 py-8 text-center text-red-400">
                  <span>Failed to load summary.</span>
                  <span className="text-xxs text-slate-500">Make sure your server is online and try again.</span>
                </div>
              )}

              {!summaryLoading && !summaryError && (
                <div className="whitespace-pre-line leading-relaxed text-slate-350">
                  {summaryText}
                </div>
              )}
            </div>

            {/* Modal Controls */}
            <div className="flex flex-wrap gap-2.5 justify-end">
              <button
                onClick={handleCopySummary}
                disabled={summaryLoading || summaryError || !summaryText}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-750 disabled:bg-slate-855 disabled:text-slate-600 disabled:cursor-not-allowed text-slate-250 hover:text-slate-100 text-xs font-semibold rounded-xl cursor-pointer transition-all flex items-center gap-1.5"
              >
                {copySuccess ? 'Copied!' : 'Copy Summary'}
              </button>
              <button
                onClick={() => handleSummarizeChat(true)}
                disabled={summaryLoading}
                className="px-4 py-2 bg-emerald-650 hover:bg-emerald-600 active:scale-97 disabled:bg-slate-800 disabled:text-slate-650 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-xl cursor-pointer transition-all"
              >
                Regenerate
              </button>
              <button
                onClick={() => setShowSummaryModal(false)}
                className="px-4 py-2 bg-slate-850 hover:bg-slate-800 text-slate-350 hover:text-slate-200 text-xs font-semibold rounded-xl cursor-pointer transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Conversation Coach Modal */}
      {showCoachModal && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-md z-[100] flex items-center justify-center p-4 transition-all duration-300 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800/80 max-w-lg w-full rounded-2xl p-6 shadow-2xl flex flex-col gap-5 max-h-[85vh] overflow-y-auto animate-scale-in">
            <div className="flex justify-between items-center border-b border-slate-800/60 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-500 animate-pulse" />
                <h3 className="text-base font-bold text-slate-100">AI Conversation Coach</h3>
              </div>
              <button 
                onClick={() => setShowCoachModal(false)}
                className="p-1 text-slate-450 hover:text-slate-200 hover:bg-slate-800 rounded-full transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Suggestions list */}
            <div className="flex-1 overflow-y-auto flex flex-col gap-4 py-2">
              {coachLoading && (
                <div className="flex flex-col items-center justify-center gap-3 py-14">
                  <span className="animate-spin rounded-full h-8 w-8 border-3 border-slate-700 border-t-emerald-500"></span>
                  <span className="text-xs text-slate-400">Polishing your message...</span>
                </div>
              )}

              {coachError && (
                <div className="flex flex-col items-center justify-center gap-2 py-8 text-center text-red-400">
                  <span>Failed to improve message.</span>
                  <span className="text-xxs text-slate-500">Make sure your server is online and try again.</span>
                </div>
              )}

              {!coachLoading && !coachError && coachSuggestions && (
                <div className="grid grid-cols-1 gap-3.5">
                  <button
                    type="button"
                    onClick={() => handleSelectCoachSuggestion(coachSuggestions.friendly)}
                    className="p-3.5 text-left bg-slate-950/30 border border-slate-800 hover:border-emerald-500/40 hover:bg-emerald-950/10 rounded-xl cursor-pointer transition-all duration-200 shadow-sm flex flex-col gap-1.5 hover:-translate-y-0.5 group active:scale-99"
                  >
                    <span className="text-[10px] font-bold text-emerald-450 uppercase tracking-wider">😊 Friendly</span>
                    <p className="text-xs text-slate-300 leading-relaxed group-hover:text-slate-255">{coachSuggestions.friendly}</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectCoachSuggestion(coachSuggestions.professional)}
                    className="p-3.5 text-left bg-slate-950/30 border border-slate-800 hover:border-emerald-500/40 hover:bg-emerald-950/10 rounded-xl cursor-pointer transition-all duration-200 shadow-sm flex flex-col gap-1.5 hover:-translate-y-0.5 group active:scale-99"
                  >
                    <span className="text-[10px] font-bold text-emerald-450 uppercase tracking-wider">💼 Professional</span>
                    <p className="text-xs text-slate-300 leading-relaxed group-hover:text-slate-255">{coachSuggestions.professional}</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectCoachSuggestion(coachSuggestions.funny)}
                    className="p-3.5 text-left bg-slate-950/30 border border-slate-800 hover:border-emerald-500/40 hover:bg-emerald-950/10 rounded-xl cursor-pointer transition-all duration-200 shadow-sm flex flex-col gap-1.5 hover:-translate-y-0.5 group active:scale-99"
                  >
                    <span className="text-[10px] font-bold text-emerald-450 uppercase tracking-wider">😂 Funny</span>
                    <p className="text-xs text-slate-300 leading-relaxed group-hover:text-slate-255">{coachSuggestions.funny}</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectCoachSuggestion(coachSuggestions.short)}
                    className="p-3.5 text-left bg-slate-950/30 border border-slate-800 hover:border-emerald-500/40 hover:bg-emerald-950/10 rounded-xl cursor-pointer transition-all duration-200 shadow-sm flex flex-col gap-1.5 hover:-translate-y-0.5 group active:scale-99"
                  >
                    <span className="text-[10px] font-bold text-emerald-450 uppercase tracking-wider">⚡ Short</span>
                    <p className="text-xs text-slate-300 leading-relaxed group-hover:text-slate-255">{coachSuggestions.short}</p>
                  </button>
                </div>
              )}
            </div>

            {/* Modal Controls */}
            <div className="flex gap-2.5 justify-end border-t border-slate-800/60 pt-3">
              <button
                onClick={() => setShowCoachModal(false)}
                className="px-4 py-2 bg-slate-850 hover:bg-slate-800 text-slate-350 hover:text-slate-200 text-xs font-semibold rounded-xl cursor-pointer transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
