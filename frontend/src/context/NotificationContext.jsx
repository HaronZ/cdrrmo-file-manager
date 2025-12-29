/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';

const NotificationContext = createContext();

export function NotificationProvider({ children }) {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const { user } = useAuth();

    const fetchNotifications = useCallback(async () => {
        if (!user) return;

        try {
            setLoading(true);
            const [notifResponse, countResponse] = await Promise.all([
                api.get('/notifications/', { params: { limit: 20 } }),
                api.get('/notifications/unread-count')
            ]);
            setNotifications(notifResponse.data);
            setUnreadCount(countResponse.data.count);
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
        } finally {
            setLoading(false);
        }
    }, [user]);

    const markAsRead = useCallback(async (notificationId) => {
        try {
            await api.put(`/notifications/${notificationId}/read`);
            setNotifications(prev =>
                prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            console.error('Failed to mark as read:', error);
        }
    }, []);

    const markAllAsRead = useCallback(async () => {
        try {
            await api.put('/notifications/read-all');
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            setUnreadCount(0);
        } catch (error) {
            console.error('Failed to mark all as read:', error);
        }
    }, []);

    const deleteNotification = useCallback(async (notificationId) => {
        try {
            await api.delete(`/notifications/${notificationId}`);
            const notif = notifications.find(n => n.id === notificationId);
            setNotifications(prev => prev.filter(n => n.id !== notificationId));
            if (notif && !notif.is_read) {
                setUnreadCount(prev => Math.max(0, prev - 1));
            }
        } catch (error) {
            console.error('Failed to delete notification:', error);
        }
    }, [notifications]);

    const clearAll = useCallback(async () => {
        try {
            await api.delete('/notifications/');
            setNotifications([]);
            setUnreadCount(0);
        } catch (error) {
            console.error('Failed to clear notifications:', error);
        }
    }, []);

    // Fetch notifications on mount and every 30 seconds
    useEffect(() => {
        if (user) {
            fetchNotifications();
            const interval = setInterval(fetchNotifications, 30000);
            return () => clearInterval(interval);
        }
    }, [user, fetchNotifications]);

    // Request browser notification permission
    useEffect(() => {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }, []);

    // Show browser notification for urgent items
    useEffect(() => {
        if ('Notification' in window && Notification.permission === 'granted') {
            const urgentUnread = notifications.filter(n => n.is_urgent && !n.is_read);
            urgentUnread.forEach(notif => {
                // Only show if notification was created in the last minute
                const createdAt = new Date(notif.created_at);
                const now = new Date();
                if ((now - createdAt) < 60000) {
                    new Notification(notif.title, {
                        body: notif.message,
                        icon: '/favicon.ico',
                        tag: `notif-${notif.id}`
                    });
                }
            });
        }
    }, [notifications]);

    return (
        <NotificationContext.Provider value={{
            notifications,
            unreadCount,
            loading,
            fetchNotifications,
            markAsRead,
            markAllAsRead,
            deleteNotification,
            clearAll
        }}>
            {children}
        </NotificationContext.Provider>
    );
}

export function useNotifications() {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotifications must be used within a NotificationProvider');
    }
    return context;
}
