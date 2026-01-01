import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/stores/authStore';

const SOCKET_URL = import.meta.env.VITE_WS_URL || '';

let socket: Socket | null = null;

export function getSocket(): Socket | null {
  return socket;
}

export function connectSocket(): Socket {
  const token = useAuthStore.getState().accessToken;
  
  if (socket?.connected) {
    return socket;
  }
  
  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket'],
    autoConnect: true,
  });
  
  socket.on('connect', () => {
    console.log('Socket connected');
  });
  
  socket.on('disconnect', (reason) => {
    console.log('Socket disconnected:', reason);
  });
  
  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error);
  });
  
  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function subscribeToPaper(paperId: string): void {
  if (socket) {
    socket.emit('paper:subscribe', paperId);
  }
}

export function unsubscribeFromPaper(paperId: string): void {
  if (socket) {
    socket.emit('paper:unsubscribe', paperId);
  }
}

// Event listener helpers
export function onProcessingStatus(
  callback: (data: {
    paperId: string;
    step: string;
    status: string;
    message: string;
  }) => void
): () => void {
  socket?.on('processing:status', callback);
  return () => socket?.off('processing:status', callback);
}

export function onProcessingProgress(
  callback: (data: {
    paperId: string;
    step: string;
    progress: number;
    message: string;
  }) => void
): () => void {
  socket?.on('processing:progress', callback);
  return () => socket?.off('processing:progress', callback);
}

export function onProcessingComplete(
  callback: (data: {
    paperId: string;
    message: string;
  }) => void
): () => void {
  socket?.on('processing:complete', callback);
  return () => socket?.off('processing:complete', callback);
}





