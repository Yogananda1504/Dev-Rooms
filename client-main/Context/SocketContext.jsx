import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import io from "socket.io-client";

// Create the context
export const SocketContext = createContext();

// Hook to use socket context
export const useSocket = () => {
    const context = useContext(SocketContext);
    if (!context) {
        throw new Error('useSocket must be used within a SocketProvider');
    }
    return context;
};

// Socket Provider Component
export const SocketProvider = ({ children }) => {
    const [socket, setSocket] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const [connectionError, setConnectionError] = useState(null);
    const socketRef = useRef(null);

    useEffect(() => {
        const url = import.meta.env.VITE_API_URL;
        
        if (!url) {
            console.error('VITE_API_URL environment variable is not set');
            setConnectionError('Server URL not configured');
            return;
        }

        // Create socket connection
        const newSocket = io(url, {
            reconnection: true,
            reconnectionDelay: 500,
            reconnectionAttempts: 5,
            transports: ['websocket', 'polling'],
            secure: true,
            timeout: 10000,
            forceNew: false,
        });

        socketRef.current = newSocket;
        setSocket(newSocket);

        // Connection event listeners
        newSocket.on('connect', () => {
            console.log('Socket connected:', newSocket.id);
            setIsConnected(true);
            setConnectionError(null);
            // Store socket ID for reconnection purposes
            sessionStorage.setItem('socketId', newSocket.id);
        });

        newSocket.on('disconnect', (reason) => {
            console.log('Socket disconnected:', reason);
            setIsConnected(false);
            if (reason === 'io server disconnect') {
                // Server disconnected the socket, reconnect manually
                newSocket.connect();
            }
        });

        newSocket.on('connect_error', (error) => {
            console.error('Socket connection error:', error);
            setConnectionError(error.message);
            setIsConnected(false);
        });

        newSocket.on('reconnect', (attemptNumber) => {
            console.log('Socket reconnected after', attemptNumber, 'attempts');
            setIsConnected(true);
            setConnectionError(null);
        });

        newSocket.on('reconnect_error', (error) => {
            console.error('Socket reconnection error:', error);
            setConnectionError(error.message);
        });

        newSocket.on('reconnect_failed', () => {
            console.error('Socket reconnection failed');
            setConnectionError('Failed to reconnect to server');
        });

        // Cleanup function
        return () => {
            if (socketRef.current) {
                socketRef.current.removeAllListeners();
                socketRef.current.disconnect();
            }
        };
    }, []);

    const value = {
        socket,
        isConnected,
        connectionError,
    };

    return (
        <SocketContext.Provider value={value}>
            {children}
        </SocketContext.Provider>
    );
};

// For backward compatibility - create a singleton socket instance
const url = import.meta.env.VITE_API_URL;
export const socket = io(url, {
    reconnection: true,
    reconnectionDelay: 500,
    reconnectionAttempts: 5,
    transports: ['websocket', 'polling'],
    secure: true,
    timeout: 10000,
    autoConnect: true,
});
