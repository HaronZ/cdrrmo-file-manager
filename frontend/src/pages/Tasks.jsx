import { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../context/ThemeContext';
import api from '../services/api';
import { useToast } from '../context/ToastContext';

const Tasks = () => {
    const { darkMode } = useTheme();
    const { showToast } = useToast();
    const [tasks, setTasks] = useState([]);
    const [filter, setFilter] = useState('All'); // 'All', 'Pending', 'Done', 'Overdue'
    const [loading, setLoading] = useState(true);
    const [animatingTaskId, setAnimatingTaskId] = useState(null);

    const fetchTasks = useCallback(async () => {
        try {
            const res = await api.get('/files/all_assigned');
            setTasks(res.data);
        } catch (error) {
            console.error("Failed to fetch tasks", error);
            showToast("Failed to load tasks", "error");
        } finally {
            setLoading(false);
        }
    }, [showToast]);

    useEffect(() => {
        fetchTasks();
    }, [fetchTasks]);

    const isOverdue = (task) => {
        if (!task.due_date || task.status === 'Done') return false;
        return new Date(task.due_date) < new Date();
    };

    const overdueCount = tasks.filter(t => isOverdue(t)).length;

    const handleStatusUpdate = async (file, newStatus) => {
        try {
            // Optimistic update
            setTasks(prev => prev.map(f => f.id === file.id ? { ...f, status: newStatus } : f));

            await api.put(`/files/${file.id}/status`, { status: newStatus });

            if (newStatus === 'Done') {
                showToast(`Task "${file.filename}" marked as done`, "success");

                // Trigger animation
                setAnimatingTaskId(file.id);
                setTimeout(() => {
                    setAnimatingTaskId(null);
                }, 1000); // Animation duration
            }
        } catch (error) {
            console.error("Failed to update status", error);
            showToast("Failed to update status", "error");
            // Revert optimistic update
            fetchTasks();
        }
    };

    const filteredTasks = tasks.filter(task => {
        if (filter === 'All') return true;
        if (filter === 'Overdue') return isOverdue(task);
        return task.status === filter;
    });

    const getStatusColor = (status, task) => {
        if (isOverdue(task)) return 'bg-red-100 text-red-700 border-red-200';
        switch (status) {
            case 'Done': return 'bg-green-100 text-green-700 border-green-200';
            case 'Pending': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
            default: return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    return (
        <div className={`p-6 min-h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-slate-50 text-slate-900'}`}>
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-2xl font-bold">Task Management</h1>
                        <p className={`mt-1 ${darkMode ? 'text-gray-400' : 'text-slate-500'}`}>
                            Overview of all assigned tasks across the system
                        </p>
                    </div>

                    {/* Filters */}
                    <div className={`flex p-1 rounded-xl border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-200'}`}>
                        {['All', 'Pending', 'Done', 'Overdue'].map((f) => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`
                                    px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2
                                    ${filter === f
                                        ? (f === 'Overdue' ? 'bg-red-600 text-white shadow-lg' : darkMode ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'bg-blue-50 text-blue-600 shadow-sm')
                                        : (darkMode ? 'text-gray-400 hover:text-gray-200' : 'text-slate-500 hover:text-slate-700')}
                                `}
                            >
                                {f}
                                {f === 'Overdue' && overdueCount > 0 && (
                                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${filter === 'Overdue' ? 'bg-white/20 text-white' : 'bg-red-500 text-white'}`}>
                                        {overdueCount}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Tasks Grid */}
                {loading ? (
                    <div className="flex justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                ) : filteredTasks.length === 0 ? (
                    <div className={`text-center py-12 rounded-2xl border-2 border-dashed ${darkMode ? 'border-gray-700' : 'border-slate-200'}`}>
                        <div className={`inline-flex p-4 rounded-full mb-4 ${darkMode ? 'bg-gray-800' : 'bg-slate-100'}`}>
                            <svg className={`w-8 h-8 ${darkMode ? 'text-gray-400' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path>
                            </svg>
                        </div>
                        <h3 className="text-lg font-medium mb-1">No tasks found</h3>
                        <p className={darkMode ? 'text-gray-400' : 'text-slate-500'}>
                            {filter === 'All' ? 'No tasks have been assigned yet.' : `No ${filter.toLowerCase()} tasks found.`}
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredTasks.map((task) => (
                            <div
                                key={task.id}
                                className={`
                                    relative p-6 rounded-2xl border transition-all duration-300
                                    ${isOverdue(task) ? 'border-red-400 ring-2 ring-red-100 dark:ring-red-900/30' : ''}
                                    ${darkMode ? 'bg-gray-800 border-gray-700 hover:border-gray-600' : 'bg-white border-slate-100 hover:shadow-lg hover:shadow-slate-200/50'}
                                    ${animatingTaskId === task.id ? 'z-50' : ''}
                                `}
                            >
                                {/* Overdue Badge */}
                                {isOverdue(task) && (
                                    <div className="absolute -top-2 -right-2 px-2 py-1 bg-red-500 text-white text-xs font-bold rounded-full flex items-center gap-1 shadow-lg animate-pulse">
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        OVERDUE
                                    </div>
                                )}

                                {/* Fly-to-icon Animation Element */}
                                {animatingTaskId === task.id && (
                                    <div
                                        className="absolute top-6 right-6 w-4 h-4 bg-green-500 rounded-full animate-fly-to-target pointer-events-none"
                                        style={{
                                            '--target-x': `${window.innerWidth - 150}px`,
                                            '--target-y': '20px'
                                        }}
                                    />
                                )}

                                <div className="flex justify-between items-start mb-4">
                                    <div className={`p-3 rounded-xl ${isOverdue(task) ? 'bg-red-50 dark:bg-red-900/30' : darkMode ? 'bg-gray-700' : 'bg-blue-50'}`}>
                                        <svg className={`w-6 h-6 ${isOverdue(task) ? 'text-red-500' : darkMode ? 'text-blue-400' : 'text-blue-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                        </svg>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(task.status, task)}`}>
                                        {isOverdue(task) ? 'Overdue' : task.status}
                                    </span>
                                </div>

                                <h3 className="font-bold text-lg mb-2 truncate" title={task.filename}>
                                    {task.filename}
                                </h3>

                                <div className="space-y-3 mb-6">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className={darkMode ? 'text-gray-400' : 'text-slate-500'}>Assigned to:</span>
                                        <span className="font-medium">{task.assigned_to?.username || 'Unknown'}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className={darkMode ? 'text-gray-400' : 'text-slate-500'}>Folder:</span>
                                        <span className="font-medium">{task.folder}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className={darkMode ? 'text-gray-400' : 'text-slate-500'}>Created:</span>
                                        <span>{new Date(task.created_at).toLocaleDateString()}</span>
                                    </div>
                                    {task.due_date && (
                                        <div className="flex items-center justify-between text-sm">
                                            <span className={darkMode ? 'text-gray-400' : 'text-slate-500'}>Due:</span>
                                            <span className={isOverdue(task) ? 'text-red-500 font-semibold' : ''}>
                                                {new Date(task.due_date).toLocaleDateString()}
                                                {isOverdue(task) && ' ⚠️'}
                                            </span>
                                        </div>
                                    )}
                                    {task.instruction && (
                                        <div className={`p-3 rounded-lg text-sm ${darkMode ? 'bg-gray-700/50 text-gray-300' : 'bg-slate-50 text-slate-600'}`}>
                                            "{task.instruction}"
                                        </div>
                                    )}
                                </div>

                                {task.status !== 'Done' && (
                                    <button
                                        onClick={() => handleStatusUpdate(task, 'Done')}
                                        className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors flex items-center justify-center gap-2"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                                        </svg>
                                        Mark as Done
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <style>{`
                @keyframes flyToTarget {
                    0% {
                        transform: translate(0, 0) scale(1);
                        opacity: 1;
                    }
                    100% {
                        transform: translate(calc(var(--target-x) - 50vw), calc(var(--target-y) - 50vh)) scale(0.2);
                        opacity: 0;
                    }
                }
                .animate-fly-to-target {
                    animation: flyToTarget 0.8s cubic-bezier(0.4, 0, 0.2, 1) forwards;
                    position: fixed;
                    z-index: 9999;
                }
            `}</style>
        </div>
    );
};

export default Tasks;
