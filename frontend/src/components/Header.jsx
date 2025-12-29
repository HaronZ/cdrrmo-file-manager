import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import NotificationCenter from './NotificationCenter';

export default function Header() {
    const { user, logout } = useAuth();
    const { darkMode, toggleTheme } = useTheme();
    const navigate = useNavigate();
    const [assignedFiles, setAssignedFiles] = useState([]);
    const [showTasksDropdown, setShowTasksDropdown] = useState(false);
    const [showProfileDropdown, setShowProfileDropdown] = useState(false);
    const dropdownRef = useRef(null);
    const profileRef = useRef(null);

    const { addToast } = useToast();
    const prevAssignedFilesRef = useRef([]);
    const isFirstLoad = useRef(true);
    const [notification, setNotification] = useState(null); // { message: '', type: '' }
    const [isAnimatingOut, setIsAnimatingOut] = useState(false);

    useEffect(() => {
        const fetchAssigned = async () => {
            if (!user) return;
            try {
                const res = await api.get('/files/assigned');
                const newFiles = res.data;

                // Check for new assignments
                if (!isFirstLoad.current) {
                    const newAssignment = newFiles.find(f => !prevAssignedFilesRef.current.some(pf => pf.id === f.id));
                    if (newAssignment) {
                        const message = `A task assigned to you: ${newAssignment.filename}`;

                        // Trigger standard toast
                        addToast(message, "info");

                        // Trigger custom notification
                        setNotification({ message });
                        setIsAnimatingOut(false);

                        // Start exit animation after 5 seconds
                        setTimeout(() => {
                            setIsAnimatingOut(true);
                        }, 5000);

                        // Clear notification after animation completes (5s + 1s animation)
                        setTimeout(() => {
                            setNotification(null);
                            setIsAnimatingOut(false);
                        }, 6000);
                    }
                } else {
                    isFirstLoad.current = false;
                }

                setAssignedFiles(newFiles);
                prevAssignedFilesRef.current = newFiles;
            } catch (err) {
                console.error("Failed to fetch tasks", err);
            }
        };
        fetchAssigned();
        const interval = setInterval(fetchAssigned, 3000); // Poll every 3 seconds
        return () => clearInterval(interval);
    }, [user, addToast]);

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowTasksDropdown(false);
            }
            if (profileRef.current && !profileRef.current.contains(event.target)) {
                setShowProfileDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const handleTaskClick = (file) => {
        setShowTasksDropdown(false);
        navigate('/files', { state: { path: file.folder } });
    };

    return (
        <header className={`h-16 flex items-center justify-between px-8 border-b z-10 transition-colors duration-300 ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white/80 backdrop-blur-md border-slate-200 sticky top-0'}`}>
            {/* Custom Notification Styles */}
            <style>{`
                @keyframes flyToIcon {
                    0% {
                        opacity: 1;
                        transform: translate(-50%, 0) scale(1);
                        top: 4rem;
                        left: 50%;
                    }
                    100% {
                        opacity: 0;
                        transform: translate(0, 0) scale(0.2);
                        top: 1rem;
                        left: calc(100% - 120px); /* Approximate position of task icon */
                    }
                }
                .animate-fly-to-icon {
                    animation: flyToIcon 1s ease-in-out forwards;
                    position: fixed; /* Ensure it moves relative to viewport */
                }
            `}</style>

            {/* Custom Notification Component */}
            {notification && (
                <div
                    className={`
                        fixed top-16 left-1/2 transform -translate-x-1/2 z-50 
                        px-6 py-3 rounded-full shadow-2xl 
                        flex items-center gap-3 
                        bg-blue-600 text-white
                        transition-all duration-300
                        ${isAnimatingOut ? 'animate-fly-to-icon' : 'animate-fade-in-down'}
                    `}
                >
                    <div className="p-1 bg-white/20 rounded-full">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
                    </div>
                    <span className="font-medium text-sm whitespace-nowrap">{notification.message}</span>
                </div>
            )}

            {/* Left side - Breadcrumbs or Context (Empty for now as Sidebar has logo) */}
            <div className="flex items-center">
                {/* Placeholder for future breadcrumbs */}
            </div>

            {/* Right side - Actions */}
            <div className="flex items-center space-x-3 md:space-x-6">
                {/* Theme Toggle */}
                <button
                    onClick={toggleTheme}
                    className={`p-2 rounded-full transition-all duration-200 ${darkMode ? 'hover:bg-gray-800 text-yellow-400' : 'hover:bg-slate-100 text-slate-500 hover:text-orange-500'}`}
                    title="Toggle Theme"
                >
                    {darkMode ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
                    ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path></svg>
                    )}
                </button>

                {/* Notifications Dropdown */}
                <NotificationCenter />

                {/* Tasks Dropdown */}
                <div className="relative" ref={dropdownRef}>
                    <button
                        onClick={() => setShowTasksDropdown(!showTasksDropdown)}
                        className={`p-2 rounded-full relative transition-all duration-200 ${darkMode ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-slate-100 text-slate-500 hover:text-blue-600'}`}
                        title="Tasks"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
                        {assignedFiles.length > 0 && (
                            <span className="absolute top-1.5 right-1.5 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[16px] flex items-center justify-center ring-2 ring-white dark:ring-gray-900">
                                {assignedFiles.length}
                            </span>
                        )}
                    </button>

                    {showTasksDropdown && (
                        <div className={`absolute right-0 mt-3 w-80 rounded-2xl shadow-xl border overflow-hidden z-50 transform origin-top-right transition-all ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-100'}`}>
                            <div className={`p-4 border-b flex justify-between items-center ${darkMode ? 'border-gray-700' : 'border-slate-50'}`}>
                                <h3 className="font-semibold text-sm">Notifications</h3>
                                <Link to="/tasks" className="text-xs font-medium text-blue-600 hover:text-blue-700" onClick={() => setShowTasksDropdown(false)}>View All</Link>
                            </div>
                            <div className="max-h-[20rem] overflow-y-auto custom-scrollbar">
                                {assignedFiles.length === 0 ? (
                                    <div className="p-8 text-center text-gray-400">
                                        <p className="text-sm">No new tasks</p>
                                    </div>
                                ) : (
                                    assignedFiles.map(file => (
                                        <div key={file.id} onClick={() => handleTaskClick(file)} className={`p-4 border-b last:border-0 cursor-pointer transition-colors ${darkMode ? 'hover:bg-gray-700 border-gray-700' : 'hover:bg-slate-50 border-slate-50'}`}>
                                            <div className="flex items-start gap-3">
                                                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-lg">
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium line-clamp-1">{file.filename}</p>
                                                    <p className="text-xs text-gray-500 mt-1">Assigned to you</p>
                                                    <p className="text-[10px] text-gray-400 mt-2">{new Date(file.created_at).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Profile Dropdown */}
                <div className="relative" ref={profileRef}>
                    <button
                        onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                        className="flex items-center space-x-3 focus:outline-none"
                    >
                        <div className="w-9 h-9 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-md ring-2 ring-white dark:ring-gray-800">
                            {user?.username?.charAt(0).toUpperCase()}
                        </div>
                        <div className="hidden md:block text-left">
                            <p className="text-sm font-semibold leading-none">{user?.username}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{user?.is_admin ? 'Administrator' : 'Member'}</p>
                        </div>
                        <svg className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${showProfileDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>

                    {showProfileDropdown && (
                        <div className={`absolute right-0 mt-3 w-48 rounded-2xl shadow-xl border overflow-hidden z-50 transform origin-top-right transition-all ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-100'}`}>
                            <div className="py-1">
                                <button
                                    onClick={handleLogout}
                                    className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 transition-colors ${darkMode ? 'text-red-400 hover:bg-gray-700' : 'text-red-600 hover:bg-red-50'}`}
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
                                    Sign out
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
