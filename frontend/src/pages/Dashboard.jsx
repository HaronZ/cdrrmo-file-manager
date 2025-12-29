import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ResponsiveContainer, PieChart, Pie } from 'recharts';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

export default function Dashboard() {
    const { user } = useAuth();
    const { darkMode } = useTheme();
    const navigate = useNavigate();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchDashboardStats = useCallback(async () => {
        try {
            const response = await api.get('/stats/dashboard');
            setStats(response.data);
        } catch (error) {
            console.error('Failed to fetch dashboard stats', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchDashboardStats();
    }, [fetchDashboardStats]);

    const formatBytes = (bytes) => {
        if (!bytes || bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    if (loading) {
        return (
            <div className={`flex items-center justify-center h-96 ${darkMode ? 'text-white' : 'text-gray-600'}`}>
                <div className="flex flex-col items-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                    <p className="text-sm font-medium">Loading overview...</p>
                </div>
            </div>
        );
    }

    if (!stats) {
        return (
            <div className={`p-6 rounded-xl border ${darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-red-100 text-gray-900'}`}>
                <p>Failed to load dashboard data. Please try refreshing.</p>
            </div>
        );
    }

    const folderData = [
        { name: 'Operation', value: stats.folder_distribution.Operation, color: '#3B82F6' },
        { name: 'Research', value: stats.folder_distribution.Research, color: '#10B981' },
        { name: 'Training', value: stats.folder_distribution.Training, color: '#F59E0B' }
    ];

    const storageData = stats.storage ? [
        { name: 'Operation', value: stats.storage.Operation, color: '#3B82F6' },
        { name: 'Research', value: stats.storage.Research, color: '#10B981' },
        { name: 'Training', value: stats.storage.Training, color: '#F59E0B' }
    ] : [];

    const fileTypeData = stats.file_types ? Object.entries(stats.file_types).map(([type, count], index) => ({
        name: type,
        value: count,
        color: COLORS[index % COLORS.length]
    })) : [];

    const taskMetrics = stats.task_metrics || { total_assigned: 0, completed: 0, pending: 0, overdue: 0, completion_rate: 0 };

    const StatCard = ({ title, value, subtitle, icon, colorClass, onClick }) => (
        <div
            onClick={onClick}
            className={`p-6 rounded-2xl shadow-sm border transition-all duration-200 hover:shadow-md ${onClick ? 'cursor-pointer' : ''} ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-100'}`}
        >
            <div className="flex items-start justify-between">
                <div>
                    <p className={`text-sm font-medium mb-1 ${darkMode ? 'text-gray-400' : 'text-slate-500'}`}>{title}</p>
                    <h3 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{value}</h3>
                    {subtitle && <p className={`text-xs mt-2 ${darkMode ? 'text-gray-500' : 'text-slate-400'}`}>{subtitle}</p>}
                </div>
                <div className={`p-3 rounded-xl ${colorClass} bg-opacity-10 dark:bg-opacity-20`}>
                    {icon}
                </div>
            </div>
        </div>
    );

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className={`text-2xl md:text-3xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                    Welcome back, {user?.username} 👋
                </h1>
                <p className={`mt-2 ${darkMode ? 'text-gray-400' : 'text-slate-500'}`}>
                    Here's what's happening in your workspace today.
                </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Total Files"
                    value={stats.total_files}
                    subtitle={`${formatBytes(stats.storage?.total || 0)} total`}
                    colorClass="text-blue-600 bg-blue-500"
                    icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>}
                />
                <StatCard
                    title="Total Users"
                    value={stats.total_users}
                    subtitle={`${stats.users?.filter(u => u.is_admin).length} Administrators`}
                    colorClass="text-purple-600 bg-purple-500"
                    icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>}
                />
                <StatCard
                    title="Pending Tasks"
                    value={taskMetrics.pending}
                    subtitle={`${taskMetrics.total_assigned} total assigned`}
                    colorClass="text-orange-600 bg-orange-500"
                    onClick={() => navigate('/admin/tasks')}
                    icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path></svg>}
                />
                <StatCard
                    title="Overdue Tasks"
                    value={taskMetrics.overdue}
                    subtitle={taskMetrics.overdue > 0 ? "⚠️ Needs attention" : "All on track"}
                    colorClass={taskMetrics.overdue > 0 ? "text-red-600 bg-red-500" : "text-green-600 bg-green-500"}
                    onClick={() => navigate('/admin/tasks')}
                    icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>}
                />
            </div>

            {/* Task Completion Progress */}
            {taskMetrics.total_assigned > 0 && (
                <div className={`p-6 rounded-2xl shadow-sm border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-100'}`}>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Task Completion</h2>
                        <span className={`text-2xl font-bold ${taskMetrics.completion_rate >= 70 ? 'text-green-500' : taskMetrics.completion_rate >= 40 ? 'text-yellow-500' : 'text-red-500'}`}>
                            {taskMetrics.completion_rate}%
                        </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all duration-500 ${taskMetrics.completion_rate >= 70 ? 'bg-green-500' : taskMetrics.completion_rate >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                            style={{ width: `${taskMetrics.completion_rate}%` }}
                        ></div>
                    </div>
                    <div className="flex justify-between mt-3 text-sm">
                        <span className={darkMode ? 'text-gray-400' : 'text-slate-500'}>
                            <span className="inline-block w-3 h-3 rounded-full bg-green-500 mr-2"></span>
                            {taskMetrics.completed} Completed
                        </span>
                        <span className={darkMode ? 'text-gray-400' : 'text-slate-500'}>
                            <span className="inline-block w-3 h-3 rounded-full bg-orange-500 mr-2"></span>
                            {taskMetrics.pending} Pending
                        </span>
                        <span className={darkMode ? 'text-gray-400' : 'text-slate-500'}>
                            <span className="inline-block w-3 h-3 rounded-full bg-red-500 mr-2"></span>
                            {taskMetrics.overdue} Overdue
                        </span>
                    </div>
                </div>
            )}

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* File Distribution Chart */}
                <div className={`p-6 rounded-2xl shadow-sm border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-100'}`}>
                    <h2 className={`text-lg font-bold mb-6 ${darkMode ? 'text-white' : 'text-slate-900'}`}>File Distribution</h2>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                            <BarChart data={folderData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={darkMode ? '#374151' : '#f1f5f9'} />
                                <XAxis
                                    dataKey="name"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: darkMode ? '#9CA3AF' : '#64748b', fontSize: 12 }}
                                    dy={10}
                                />
                                <YAxis
                                    allowDecimals={false}
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: darkMode ? '#9CA3AF' : '#64748b', fontSize: 12 }}
                                />
                                <Tooltip
                                    cursor={{ fill: darkMode ? '#374151' : '#f8fafc' }}
                                    contentStyle={{
                                        backgroundColor: darkMode ? '#1F2937' : '#FFFFFF',
                                        border: 'none',
                                        borderRadius: '12px',
                                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                                        fontSize: '12px'
                                    }}
                                />
                                <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={40}>
                                    {folderData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Storage Usage Chart */}
                <div className={`p-6 rounded-2xl shadow-sm border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-100'}`}>
                    <h2 className={`text-lg font-bold mb-6 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                        Storage Usage
                        <span className={`ml-2 text-sm font-normal ${darkMode ? 'text-gray-400' : 'text-slate-500'}`}>
                            {formatBytes(stats.storage?.total || 0)}
                        </span>
                    </h2>
                    <div className="h-64 w-full flex items-center justify-center">
                        {storageData.length > 0 && stats.storage?.total > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={storageData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={50}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {storageData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        formatter={(value) => formatBytes(value)}
                                        contentStyle={{
                                            backgroundColor: darkMode ? '#1F2937' : '#FFFFFF',
                                            border: 'none',
                                            borderRadius: '12px',
                                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                                            fontSize: '12px'
                                        }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="text-center text-gray-400">
                                <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                                </svg>
                                No data yet
                            </div>
                        )}
                    </div>
                    <div className="flex justify-center gap-6 mt-4">
                        {storageData.map((item) => (
                            <div key={item.name} className="text-center">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                                    <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-slate-600'}`}>{item.name}</span>
                                </div>
                                <span className={`text-xs ${darkMode ? 'text-gray-500' : 'text-slate-400'}`}>{formatBytes(item.value)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* File Types & Activity Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* File Types */}
                <div className={`p-6 rounded-2xl shadow-sm border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-100'}`}>
                    <h2 className={`text-lg font-bold mb-4 ${darkMode ? 'text-white' : 'text-slate-900'}`}>File Types</h2>
                    <div className="space-y-3">
                        {fileTypeData.length > 0 ? fileTypeData.map((type) => (
                            <div key={type.name} className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-xs`} style={{ backgroundColor: type.color }}>
                                        {type.name}
                                    </div>
                                    <span className={darkMode ? 'text-gray-300' : 'text-slate-700'}>{type.name} Files</span>
                                </div>
                                <span className={`font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{type.value}</span>
                            </div>
                        )) : (
                            <p className="text-gray-400 text-center py-4">No files uploaded yet</p>
                        )}
                    </div>
                </div>

                {/* Recent Activity */}
                <div className={`p-6 rounded-2xl shadow-sm border lg:col-span-2 flex flex-col ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-100'}`}>
                    <div className="flex items-center justify-between mb-6">
                        <h2 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Recent Activity</h2>
                        <button onClick={() => navigate('/logs')} className="text-sm text-blue-600 hover:text-blue-700 font-medium">View All</button>
                    </div>

                    <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4">
                        {stats.recent_activities.length === 0 ? (
                            <div className="text-center py-10 text-gray-400">
                                <p>No recent activity</p>
                            </div>
                        ) : (
                            stats.recent_activities.slice(0, 6).map((activity) => (
                                <div key={activity.id} className="flex gap-3">
                                    <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${activity.action === 'UPLOAD' ? 'bg-green-500' :
                                        activity.action === 'DELETE' ? 'bg-red-500' :
                                            activity.action === 'RESTORE_VERSION' ? 'bg-purple-500' : 'bg-blue-500'
                                        }`}></div>
                                    <div>
                                        <p className={`text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-slate-700'}`}>
                                            <span className="font-bold">{activity.user}</span> {activity.action.toLowerCase().replace('_', ' ')}
                                        </p>
                                        <p className={`text-xs mt-0.5 ${darkMode ? 'text-gray-500' : 'text-slate-400'}`}>
                                            {activity.details}
                                        </p>
                                        <p className={`text-[10px] mt-1 ${darkMode ? 'text-gray-600' : 'text-slate-400'}`}>
                                            {new Date(activity.timestamp).toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
