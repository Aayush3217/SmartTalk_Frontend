import { io } from 'socket.io-client';

const SOCKET_BASE = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000').replace(/\/$/, '');

class SocketService {
  socket = null;

  connect(userId, token) {
    if (this.socket?.connected) return this.socket;

    this.socket = io(SOCKET_BASE, {
      withCredentials: true,
      extraHeaders: {
        'Authorization': `Bearer ${token}`
      }
    });

    this.socket.on('connect', () => {
      console.log('Socket connected successfully');
      this.socket.emit('user_connected', userId);
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  emitSendMessage(message) {
    if (this.socket) this.socket.emit('send_message', message);
  }

  emitMessageRead(messageIds, senderId) {
    if (this.socket) this.socket.emit('message_read', { messageIds, senderId });
  }

  emitTypingStart(conversationId, receiverId) {
    if (this.socket) this.socket.emit('typing_start', { conversationId, receiverId });
  }

  emitTypingStop(conversationId, receiverId) {
    if (this.socket) this.socket.emit('typing_stop', { conversationId, receiverId });
  }

  emitAddReaction(messageId, emoji, userId, reactionUserId) {
    if (this.socket) {
      this.socket.emit('add_reaction', { messageId, emoji, userId, reactionUserId });
    }
  }

  emitViewStatus(statusId, userId) {
    if (this.socket) this.socket.emit('view_status', { statusId, userId });
  }

  on(event, callback) {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  off(event, callback) {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }
}

const socketService = new SocketService();
export default socketService;
