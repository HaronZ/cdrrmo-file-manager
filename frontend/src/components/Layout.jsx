import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useState } from 'react';
import Header from './Header';

export default function Layout() {
    const { user } = useAuth();
    const { darkMode } = useTheme();
    const location = useLocation();
    const [collapsed, setCollapsed] = useState(false);

    const isActive = (path) => location.pathname === path;

    const navItems = [
        {
            path: '/files', label: 'Files', icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path></svg>
            )
        },
    ];

    if (!user?.is_admin) {
        navItems.push({
            path: '/tasks', label: 'My Tasks', icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path></svg>
            )
        });
    }

    if (user?.is_admin) {
        navItems.unshift({
            path: '/dashboard', label: 'Dashboard', icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path></svg>
            )
        });
        navItems.push(
            {
                path: '/users', label: 'Users', icon: (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
                )
            },
            {
                path: '/admin/tasks', label: 'Task Management', icon: (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path></svg>
                )
            },
            {
                path: '/logs', label: 'Activity', icon: (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                )
            }
        );
    }

    return (
        <div className={`flex h-screen transition-colors duration-300 ${darkMode ? 'bg-gray-900 text-gray-100' : 'bg-slate-50 text-slate-900'}`}>
            {/* Sidebar */}
            <aside
                className={`
                    relative
                    ${collapsed ? 'w-20' : 'w-72'} 
                    transition-all duration-300 ease-in-out
                    flex flex-col 
                    border-r z-20
                    ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-200'}
                `}
            >
                {/* Floating Toggle Button */}
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className={`
                        absolute -right-3 top-9 
                        w-6 h-6 rounded-full 
                        flex items-center justify-center
                        border shadow-sm
                        transition-colors duration-200
                        z-50
                        ${darkMode
                            ? 'bg-gray-800 border-gray-600 text-gray-400 hover:text-white hover:bg-gray-700'
                            : 'bg-white border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50'}
                    `}
                    title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                    <svg
                        className={`w-3 h-3 transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                    </svg>
                </button>

                {/* Logo Area */}
                <div className={`h-20 flex items-center ${collapsed ? 'justify-center' : 'px-6'} transition-all duration-300`}>
                    <div className="flex items-center space-x-3 overflow-hidden">
                        <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/20">
                            <span className="text-xl">C</span>
                        </div>
                        <div className={`flex flex-col transition-opacity duration-300 ${collapsed ? 'opacity-0 w-0 hidden' : 'opacity-100'}`}>
                            <span className="font-bold text-lg tracking-tight whitespace-nowrap">CDRRMO</span>
                            <span className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">File Manager</span>
                        </div>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto overflow-x-hidden scrollbar-hide">
                    {navItems.map((item) => (
                        <Link
                            key={item.path}
                            to={item.path}
                            title={collapsed ? item.label : ''}
                            className={`
                                flex items-center px-3 py-3 rounded-xl transition-all duration-200 group relative
                                ${isActive(item.path)
                                    ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 font-medium'
                                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-gray-700/50 hover:text-slate-900 dark:hover:text-slate-200'}
                                ${collapsed ? 'justify-center' : ''}
                            `}
                        >
                            <span className={`
                                flex-shrink-0 transition-colors duration-200
                                ${isActive(item.path) ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300'}
                            `}>
                                {item.icon}
                            </span>

                            <span className={`
                                ml-3 text-sm whitespace-nowrap transition-all duration-300
                                ${collapsed ? 'opacity-0 w-0 hidden' : 'opacity-100'}
                            `}>
                                {item.label}
                            </span>

                            {/* Active Indicator for Collapsed State */}
                            {isActive(item.path) && collapsed && (
                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-blue-600 rounded-r-full"></div>
                            )}
                        </Link>
                    ))}
                </nav>


            </aside>

            {/* Main Content Wrapper */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-50/50 dark:bg-gray-900/50">
                <Header />

                {/* Main Content */}
                <main className="flex-1 overflow-auto relative scroll-smooth">
                    <div className="max-w-7xl mx-auto p-6 md:p-8">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
}
