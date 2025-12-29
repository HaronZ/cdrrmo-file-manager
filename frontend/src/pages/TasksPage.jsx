import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useToast } from '../context/ToastContext';

export default function TasksPage() {
    const { user } = useAuth();
    const { darkMode } = useTheme();
    const navigate = useNavigate();
    const [assignedFiles, setAssignedFiles] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const { addToast } = useToast();

    useEffect(() => {
        const fetchAssigned = async () => {
            if (!user) return;
            setIsLoading(true);
            try {
                const res = await api.get('/files/assigned');
                setAssignedFiles(res.data);
            } catch (err) {
                console.error("Failed to fetch tasks", err);
                addToast("Failed to load assigned tasks", "error");
            } finally {
                setIsLoading(false);
            }
        };
        fetchAssigned();
    }, [user, addToast]);

    const handleTaskClick = (file) => {
        navigate('/files', { state: { path: file.folder } });
    };

    const filteredFiles = assignedFiles.filter(file =>
        file.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (file.instruction && file.instruction.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    return (
        <div className={`p-6 max-w-7xl mx-auto ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Assigned Tasks</h1>
                    <p className={`mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        Manage and track your assigned file operations
                    </p>
                </div>

                <div className="relative w-full md:w-64">
                    <input
                        type="text"
                        placeholder="Search tasks..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className={`w-full pl-10 pr-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${darkMode ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'}`}
                    />
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                </div>
            </div>

            {isLoading ? (
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                </div>
            ) : assignedFiles.length === 0 ? (
                <div className={`text-center py-16 rounded-xl border-2 border-dashed ${darkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50'}`}>
                    <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path>
                    </svg>
                    <h3 className="text-lg font-medium">No tasks assigned</h3>
                    <p className={`mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>You're all caught up! Check back later for new assignments.</p>
                </div>
            ) : filteredFiles.length === 0 ? (
                <div className="text-center py-12">
                    <p className="text-lg text-gray-500">No tasks match your search criteria.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredFiles.map(file => (
                        <div
                            key={file.id}
                            onClick={() => handleTaskClick(file)}
                            className={`group p-6 rounded-xl border cursor-pointer transition-all hover:shadow-lg transform hover:-translate-y-1 ${darkMode ? 'bg-gray-800 border-gray-700 hover:border-blue-500' : 'bg-white border-gray-200 hover:border-blue-400'}`}
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                    </svg>
                                </div>
                                <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2.5 py-0.5 rounded-full dark:bg-blue-900 dark:text-blue-200">
                                    New
                                </span>
                            </div>

                            <h3 className="text-lg font-bold mb-2 truncate" title={file.filename}>{file.filename}</h3>

                            <div className={`flex items-center text-sm mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path>
                                </svg>
                                {file.folder}
                            </div>

                            {file.instruction && (
                                <div className={`mt-auto text-sm p-3 rounded-lg border ${darkMode ? 'bg-yellow-900/20 border-yellow-900/30 text-yellow-200' : 'bg-yellow-50 border-yellow-100 text-yellow-800'}`}>
                                    <p className="font-semibold text-xs uppercase tracking-wide mb-1 opacity-75">Instruction</p>
                                    <p>{file.instruction}</p>
                                </div>
                            )}

                            <div className={`mt-4 pt-4 border-t flex justify-end ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
                                <span className="text-sm font-medium text-blue-500 group-hover:text-blue-600 flex items-center">
                                    View File
                                    <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3"></path>
                                    </svg>
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
