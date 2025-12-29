import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';

// Icons
const FolderIcon = () => (
    <svg className="w-12 h-12 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
        <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
    </svg>
);

const FileIcon = ({ ext }) => {
    let color = "text-gray-500";
    if (['.pdf'].includes(ext)) color = "text-red-500";
    if (['.docx', '.doc'].includes(ext)) color = "text-blue-700";
    if (['.xlsx', '.xls'].includes(ext)) color = "text-green-600";
    if (['.jpg', '.png', '.jpeg'].includes(ext)) color = "text-purple-500";

    return (
        <svg className={`w-8 h-8 ${color}`} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
        </svg>
    );
};

const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    if (!bytes || isNaN(bytes)) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export default function FileExplorer() {
    const [files, setFiles] = useState([]);
    const location = useLocation();
    const [currentPath, setCurrentPath] = useState(location.state?.path || '/');
    const [loading, setLoading] = useState(false);
    const { user } = useAuth();
    const { darkMode } = useTheme();
    const { addToast } = useToast();
    const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'

    // Upload State
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [uploadFile, setUploadFile] = useState(null);
    const [assignedTo, setAssignedTo] = useState('');
    const [instruction, setInstruction] = useState('');
    const [users, setUsers] = useState([]); // For admin assignment
    const [showOverwriteModal, setShowOverwriteModal] = useState(false);

    // Edit Instruction State
    const [showEditInstructionModal, setShowEditInstructionModal] = useState(false);
    const [editingFile, setEditingFile] = useState(null);
    const [newInstruction, setNewInstruction] = useState('');

    // Create Folder State
    const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');

    const [selectedFiles, setSelectedFiles] = useState([]);
    const [isSelectionMode, setIsSelectionMode] = useState(false);

    const [searchQuery, setSearchQuery] = useState('');
    const [isDragging, setIsDragging] = useState(false);
    const [sortConfig, setSortConfig] = useState({ key: 'filename', direction: 'asc' });

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const sortedFiles = [...files].sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        // Handle case-insensitive string sorting for filename
        if (typeof aValue === 'string') aValue = aValue.toLowerCase();
        if (typeof bValue === 'string') bValue = bValue.toLowerCase();

        if (aValue < bValue) {
            return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
            return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
    });

    const getBreadcrumbs = () => {
        const parts = currentPath.split('/').filter(p => p);
        let path = '';
        return parts.map((part, index) => {
            path += (index === 0 ? '' : '/') + part;
            return { name: part, path: path };
        });
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            setUploadFile(e.dataTransfer.files);
            e.dataTransfer.clearData();
        }
    };

    useEffect(() => {
        if (location.state?.path) {
            setCurrentPath(location.state.path);
        }
        setSelectedFiles([]);
        setIsSelectionMode(false);
        setSearchQuery('');
    }, [location.state]);

    const fetchFiles = useCallback(async (path, search = '') => {
        setLoading(true);
        try {
            const params = search ? { search } : { path };
            const response = await api.get('/files/', { params });
            let data = response.data;

            // Dashboard Logic: If at root and NOT searching, only show specific folders
            if (path === '/' && !search) {
                const allowed = ['Operation', 'Research', 'Training'];
                data = data.filter(item => allowed.includes(item.filename));
            }

            setFiles(data);
        } catch (error) {
            console.error("Failed to fetch files", error);
            addToast("Failed to load files", "error");
        } finally {
            setLoading(false);
        }
    }, [addToast]);

    const fetchUsers = useCallback(async () => {
        if (user?.is_admin) {
            try {
                const response = await api.get('/users/');
                // Filter out admins, show only regular users
                const regularUsers = response.data.filter(u => !u.is_admin);
                setUsers(regularUsers);
            } catch (error) {
                console.error("Failed to fetch users", error);
            }
        }
    }, [user]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchFiles(currentPath, searchQuery);
        }, 300);
        return () => clearTimeout(timer);
    }, [currentPath, fetchFiles, searchQuery]);

    const handleNavigate = (folderName) => {
        const newPath = currentPath === '/' ? folderName : `${currentPath}/${folderName}`;
        setCurrentPath(newPath);
        setSearchQuery(''); // Clear search on navigate
    };

    const handleGoUp = () => {
        if (currentPath === '/') return;
        const parts = currentPath.split('/');
        parts.pop();
        const newPath = parts.join('/') || '/';
        setCurrentPath(newPath);
    };

    const performUpload = async (filesToUpload, overwrite) => {
        const currentFiles = filesToUpload || Array.from(uploadFile);

        const allowedExtensions = ['.pdf', '.docx', '.xlsx', '.pptx', '.doc', '.xls', '.ppt'];

        for (const file of currentFiles) {
            const fileExt = '.' + file.name.split('.').pop().toLowerCase();
            if (!allowedExtensions.includes(fileExt)) {
                addToast(`File type not allowed: ${file.name}. Only Word, Excel, PowerPoint, and PDF are allowed.`, "error");
                continue;
            }

            const formData = new FormData();
            formData.append('folder', currentPath);
            formData.append('file', file);
            if (user?.is_admin && assignedTo) {
                formData.append('assigned_to_id', assignedTo);
            }
            if (user?.is_admin && instruction) {
                formData.append('instruction', instruction);
            }
            if (overwrite) {
                formData.append('overwrite', 'true');
            }

            try {
                await api.post('/files/upload', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            } catch (error) {
                console.error(`Upload failed for ${file.name}`, error);
                addToast(`Upload failed for ${file.name}: ${error.response?.data?.detail || error.message}`, "error");
            }
        }

        addToast("Upload process completed", "success");

        setShowUploadModal(false);
        setShowOverwriteModal(false);
        setUploadFile(null);
        setAssignedTo('');
        setInstruction('');
        fetchFiles(currentPath);
    };

    const handleEditInstructionSubmit = async (e) => {
        e.preventDefault();
        if (!editingFile) return;

        const formData = new FormData();
        formData.append('instruction', newInstruction);

        try {
            await api.put(`/files/${editingFile.id}/instruction`, formData);
            setShowEditInstructionModal(false);
            setEditingFile(null);
            setNewInstruction('');
            fetchFiles(currentPath);
        } catch (error) {
            console.error("Update instruction failed", error);
            addToast("Update instruction failed", "error");
        }
    };

    const handleCreateFolder = async (e) => {
        e.preventDefault();
        if (!newFolderName) return;

        const path = currentPath === '/' ? newFolderName : `${currentPath}/${newFolderName}`;
        const formData = new FormData();
        formData.append('path', path);

        try {
            await api.post('/files/dir', formData);
            setShowCreateFolderModal(false);
            setNewFolderName('');
            fetchFiles(currentPath);
        } catch (error) {
            console.error("Create folder failed", error);
            addToast("Create folder failed", "error");
        }
    };

    const handleDownload = async (file) => {
        try {
            const response = await api.get(`/files/download/${file.id}`, {
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', file.filename);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error("Download failed", error);
            addToast("Download failed", "error");
        }
    };

    const handleDelete = async (file) => {
        if (!window.confirm(`Are you sure you want to delete ${file.filename}?`)) return;

        try {
            if (file.is_dir) {
                const path = currentPath === '/' ? file.filename : `${currentPath}/${file.filename}`;
                await api.delete(`/files/dir/${path}`);
            } else {
                await api.delete(`/files/${file.id}`);
            }
            fetchFiles(currentPath);
        } catch (error) {
            console.error("Delete failed", error);
            addToast("Delete failed: " + (error.response?.data?.detail || error.message), "error");
        }
    };

    const toggleSelection = (fileId) => {
        setSelectedFiles(prev =>
            prev.includes(fileId) ? prev.filter(id => id !== fileId) : [...prev, fileId]
        );
    };

    const handleBulkDelete = async () => {
        if (!window.confirm(`Delete ${selectedFiles.length} items?`)) return;
        try {
            await api.post('/files/batch/delete', { file_ids: selectedFiles });
            setSelectedFiles([]);
            fetchFiles(currentPath);
        } catch (error) {
            console.error("Bulk delete failed", error);
            addToast("Bulk delete failed", "error");
        }
    };

    const handleBulkDownload = async () => {
        try {
            const response = await api.post('/files/batch/download', { file_ids: selectedFiles }, {
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'files.zip');
            document.body.appendChild(link);
            link.click();
            link.remove();
            setSelectedFiles([]);
        } catch (error) {
            console.error("Bulk download failed", error);
            addToast("Bulk download failed", "error");
        }
    };



    // Helper to get file icon color/type
    const getFileIcon = (filename, isDir) => {
        if (isDir) return (
            <svg className="w-10 h-10 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
            </svg>
        );

        const ext = filename.slice(filename.lastIndexOf('.')).toLowerCase();
        if (['.pdf'].includes(ext)) return (
            <svg className="w-8 h-8 text-red-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" /></svg>
        );
        if (['.docx', '.doc'].includes(ext)) return (
            <svg className="w-8 h-8 text-blue-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" /></svg>
        );
        if (['.xlsx', '.xls'].includes(ext)) return (
            <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" /></svg>
        );
        if (['.jpg', '.png', '.jpeg'].includes(ext)) return (
            <svg className="w-8 h-8 text-purple-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" /></svg>
        );

        return (
            <svg className="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" /></svg>
        );
    };

    return (
        <div className={`p-6 min-h-full ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            {/* Toolbar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                {/* Breadcrumbs */}
                <div className="flex items-center space-x-2 text-lg overflow-hidden">
                    <button
                        onClick={() => setCurrentPath('/')}
                        className={`font-semibold hover:text-blue-500 transition-colors ${currentPath === '/' ? (darkMode ? 'text-white' : 'text-slate-900') : (darkMode ? 'text-gray-400' : 'text-slate-500')}`}
                    >
                        Home
                    </button>
                    {getBreadcrumbs().map((crumb, index) => (
                        <div key={crumb.path} className="flex items-center space-x-2">
                            <span className="text-gray-400">/</span>
                            <button
                                onClick={() => setCurrentPath(crumb.path)}
                                className={`font-semibold hover:text-blue-500 transition-colors ${index === getBreadcrumbs().length - 1 ? (darkMode ? 'text-white' : 'text-slate-900') : (darkMode ? 'text-gray-400' : 'text-slate-500')}`}
                            >
                                {crumb.name}
                            </button>
                        </div>
                    ))}
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-3">
                    {/* View Toggle */}
                    <div className={`flex p-1 rounded-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-200'}`}>
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? (darkMode ? 'bg-gray-700 text-white shadow-sm' : 'bg-slate-100 text-slate-900 shadow-sm') : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path></svg>
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-2 rounded-md transition-all ${viewMode === 'list' ? (darkMode ? 'bg-gray-700 text-white shadow-sm' : 'bg-slate-100 text-slate-900 shadow-sm') : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
                        </button>
                    </div>

                    {/* Search */}
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Search..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className={`pl-10 pr-4 py-2.5 rounded-xl border focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all w-48 md:w-64 ${darkMode ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500' : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400'}`}
                        />
                        <svg className="w-5 h-5 text-gray-400 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>

                    {/* Bulk Actions */}
                    {selectedFiles.length > 0 && (
                        <div className="flex items-center gap-2 animate-fade-in">
                            <button onClick={handleBulkDownload} className="p-2.5 bg-blue-100 text-blue-600 rounded-xl hover:bg-blue-200 transition-colors" title="Download Selected">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                            </button>
                            {user?.is_admin && (
                                <button onClick={handleBulkDelete} className="p-2.5 bg-red-100 text-red-600 rounded-xl hover:bg-red-200 transition-colors" title="Delete Selected">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                </button>
                            )}
                        </div>
                    )}

                    <div className="h-8 w-px bg-gray-200 dark:bg-gray-700 mx-1"></div>

                    <button onClick={handleGoUp} disabled={currentPath === '/'} className="p-2.5 rounded-xl border hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors" title="Go Up">
                        <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 10l7-7m0 0l7 7m-7-7v18"></path></svg>
                    </button>



                    {currentPath !== '/' && (
                        <>
                            <button onClick={() => setShowCreateFolderModal(true)} className="flex items-center px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-medium transition-all shadow-sm dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-700">
                                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"></path></svg>
                                New Folder
                            </button>
                            <button onClick={() => setShowUploadModal(true)} className="flex items-center px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-all shadow-md shadow-blue-500/20">
                                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                                Upload
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Content Area */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4"></div>
                    <p className="text-gray-500">Loading files...</p>
                </div>
            ) : files.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed rounded-3xl border-gray-200 dark:border-gray-700">
                    <div className="p-4 rounded-full bg-gray-50 dark:bg-gray-800 mb-4">
                        <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z"></path></svg>
                    </div>
                    <p className="text-lg font-medium text-gray-600 dark:text-gray-300">This folder is empty</p>
                    <p className="text-gray-400 mt-1">Upload files or create a folder to get started</p>
                </div>
            ) : (
                <>
                    {viewMode === 'grid' ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                            {sortedFiles.map((file) => (
                                <div
                                    key={file.id}
                                    onClick={() => {
                                        if (isSelectionMode) {
                                            if (!file.is_dir) toggleSelection(file.id);
                                        } else {
                                            file.is_dir ? handleNavigate(file.filename) : null;
                                        }
                                    }}
                                    className={`
                                        group relative p-4 rounded-2xl border transition-all duration-200 cursor-pointer
                                        ${darkMode ? 'bg-gray-800 border-gray-700 hover:bg-gray-750' : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-md'}
                                        ${selectedFiles.includes(file.id) ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20' : ''}
                                    `}
                                >
                                    {!file.is_dir && (
                                        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <input
                                                type="checkbox"
                                                checked={selectedFiles.includes(file.id)}
                                                onChange={(e) => { e.stopPropagation(); toggleSelection(file.id); setIsSelectionMode(true); }}
                                                className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                            />
                                        </div>
                                    )}

                                    <div className="flex flex-col items-center text-center space-y-3">
                                        <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50 group-hover:scale-110 transition-transform duration-200">
                                            {getFileIcon(file.filename, file.is_dir)}
                                        </div>
                                        <div className="w-full">
                                            <p className="font-medium truncate text-sm" title={file.filename}>{file.filename}</p>
                                            <p className="text-xs text-gray-400 mt-1">{file.is_dir ? 'Folder' : formatFileSize(file.size)}</p>
                                        </div>
                                    </div>

                                    {/* Hover Actions */}
                                    <div className="absolute inset-x-0 bottom-0 p-2 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-b-2xl opacity-0 group-hover:opacity-100 transition-opacity flex justify-center gap-2 border-t dark:border-gray-700">
                                        <button onClick={(e) => { e.stopPropagation(); handleDownload(file); }} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg" title="Download">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                                        </button>
                                        {(user?.is_admin || (file.owner && file.owner.id === user?.id)) && (
                                            <button onClick={(e) => { e.stopPropagation(); handleDelete(file); }} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg" title="Delete">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className={`rounded-xl shadow-sm border overflow-hidden ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-200'}`}>
                            <table className="w-full text-left">
                                <thead>
                                    <tr className={`border-b text-xs uppercase tracking-wider ${darkMode ? 'border-gray-700 bg-gray-750 text-gray-400' : 'border-slate-100 bg-slate-50 text-slate-500'}`}>
                                        <th className="p-4 w-10"></th>
                                        <th className="p-4 font-medium cursor-pointer hover:text-blue-500 transition-colors" onClick={() => handleSort('filename')}>
                                            <div className="flex items-center gap-1">
                                                Name
                                                {sortConfig.key === 'filename' && (
                                                    <svg className={`w-4 h-4 transition-transform ${sortConfig.direction === 'asc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                                )}
                                            </div>
                                        </th>
                                        <th className="p-4 font-medium">Uploader</th>
                                        <th className="p-4 font-medium cursor-pointer hover:text-blue-500 transition-colors" onClick={() => handleSort('size')}>
                                            <div className="flex items-center gap-1">
                                                Size
                                                {sortConfig.key === 'size' && (
                                                    <svg className={`w-4 h-4 transition-transform ${sortConfig.direction === 'asc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                                )}
                                            </div>
                                        </th>
                                        <th className="p-4 font-medium cursor-pointer hover:text-blue-500 transition-colors" onClick={() => handleSort('created_at')}>
                                            <div className="flex items-center gap-1">
                                                Date
                                                {sortConfig.key === 'created_at' && (
                                                    <svg className={`w-4 h-4 transition-transform ${sortConfig.direction === 'asc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                                )}
                                            </div>
                                        </th>
                                        <th className="p-4 font-medium text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {sortedFiles.map((file) => (
                                        <tr
                                            key={file.id}
                                            onClick={() => {
                                                if (isSelectionMode) {
                                                    if (!file.is_dir) toggleSelection(file.id);
                                                } else {
                                                    file.is_dir ? handleNavigate(file.filename) : null;
                                                }
                                            }}
                                            className={`
                                                transition-colors cursor-pointer
                                                ${darkMode ? 'hover:bg-gray-700/50' : 'hover:bg-slate-50'}
                                                ${selectedFiles.includes(file.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''}
                                            `}
                                        >
                                            <td className="p-4">
                                                {!file.is_dir && (
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedFiles.includes(file.id)}
                                                        onChange={(e) => { e.stopPropagation(); toggleSelection(file.id); setIsSelectionMode(true); }}
                                                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                    />
                                                )}
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 flex-shrink-0">
                                                        {getFileIcon(file.filename, file.is_dir)}
                                                    </div>
                                                    <span className="font-medium text-sm">{file.filename}</span>
                                                </div>
                                            </td>
                                            <td className="p-4 text-sm text-gray-500">
                                                {file.is_dir ? '-' : (file.owner?.username || 'System')}
                                            </td>
                                            <td className="p-4 text-sm text-gray-500 font-mono">
                                                {file.is_dir ? '-' : formatFileSize(file.size)}
                                            </td>
                                            <td className="p-4 text-sm text-gray-500">
                                                {file.is_dir ? '-' : new Date(file.created_at).toLocaleDateString()}
                                            </td>
                                            <td className="p-4 text-right">
                                                <div className="flex justify-end gap-2">

                                                    <button onClick={(e) => { e.stopPropagation(); handleDownload(file); }} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Download">
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                                                    </button>
                                                    {(user?.is_admin || (file.owner && file.owner.id === user?.id)) && (
                                                        <button onClick={(e) => { e.stopPropagation(); handleDelete(file); }} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            )}

            {/* Upload Modal */}
            {showUploadModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
                    <div className={`w-full max-w-md rounded-2xl shadow-2xl overflow-hidden transform transition-all scale-100 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                        <div className="p-6">
                            <h3 className="text-xl font-bold mb-4">Upload Files</h3>
                            <form onSubmit={(e) => { e.preventDefault(); performUpload(); }} className="space-y-4">
                                <div
                                    className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${isDragging
                                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                        : darkMode ? 'border-gray-600 hover:border-gray-500' : 'border-slate-300 hover:border-slate-400'
                                        }`}
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    onDrop={handleDrop}
                                >
                                    <input
                                        type="file"
                                        multiple
                                        onChange={(e) => setUploadFile(e.target.files)}
                                        className="hidden"
                                        id="file-upload"
                                    />
                                    <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center gap-3">
                                        <div className={`p-3 rounded-full ${darkMode ? 'bg-gray-700' : 'bg-slate-100'}`}>
                                            <svg className={`w-8 h-8 ${darkMode ? 'text-gray-400' : 'text-slate-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                                            </svg>
                                        </div>
                                        <div>
                                            <p className={`font-medium ${darkMode ? 'text-gray-200' : 'text-slate-700'}`}>
                                                Click to upload or drag and drop
                                            </p>
                                            <p className={`text-sm mt-1 ${darkMode ? 'text-gray-500' : 'text-slate-500'}`}>
                                                Word, PDF, Excel, PowerPoint (max. 100MB)
                                            </p>
                                        </div>
                                    </label>
                                    {uploadFile && uploadFile.length > 0 && (
                                        <div className="mt-4 flex flex-wrap gap-2 justify-center">
                                            {Array.from(uploadFile).map((file, index) => (
                                                <span key={`${file.name}-${index}`} className={`text-xs px-2 py-1 rounded-full ${darkMode ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-50 text-blue-600'}`}>
                                                    {file.name}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                {user?.is_admin && (
                                    <>
                                        <div>
                                            <label className="block text-sm font-medium mb-1 text-gray-500">Assign To (Optional)</label>
                                            <select
                                                value={assignedTo}
                                                onChange={(e) => setAssignedTo(e.target.value)}
                                                className={`w-full p-3 rounded-xl border ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-slate-50 border-slate-200'} focus:ring-2 focus:ring-blue-500 outline-none`}
                                            >
                                                <option value="">Select User</option>
                                                {users.map(u => (
                                                    <option key={u.id} value={u.id}>{u.username}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1 text-gray-500">Instruction (Optional)</label>
                                            <textarea
                                                value={instruction}
                                                onChange={(e) => setInstruction(e.target.value)}
                                                className={`w-full p-3 rounded-xl border ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-slate-50 border-slate-200'} focus:ring-2 focus:ring-blue-500 outline-none`}
                                                rows="3"
                                            />
                                        </div>
                                    </>
                                )}
                                <div className="flex justify-end gap-3 mt-6">
                                    <button
                                        type="button"
                                        onClick={() => setShowUploadModal(false)}
                                        className="px-4 py-2 rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium shadow-lg shadow-blue-500/30 transition-all"
                                    >
                                        Upload
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Folder Modal */}
            {showCreateFolderModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
                    <div className={`w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                        <div className="p-6">
                            <h3 className="text-xl font-bold mb-4">New Folder</h3>
                            <form onSubmit={handleCreateFolder}>
                                <input
                                    type="text"
                                    placeholder="Folder Name"
                                    value={newFolderName}
                                    onChange={(e) => setNewFolderName(e.target.value)}
                                    className={`w-full p-3 rounded-xl border mb-6 ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-slate-50 border-slate-200'} focus:ring-2 focus:ring-blue-500 outline-none`}
                                    autoFocus
                                />
                                <div className="flex justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setShowCreateFolderModal(false)}
                                        className="px-4 py-2 rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium shadow-lg shadow-blue-500/30 transition-all"
                                    >
                                        Create
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Overwrite Confirmation Modal */}
            {showOverwriteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
                    <div className={`w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                        <div className="p-6 text-center">
                            <div className="w-12 h-12 rounded-full bg-yellow-100 text-yellow-600 flex items-center justify-center mx-auto mb-4">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                            </div>
                            <h3 className="text-xl font-bold mb-2">File Already Exists</h3>
                            <p className="text-gray-500 mb-6">Some files already exist in this folder. Do you want to overwrite them?</p>
                            <div className="flex justify-center gap-3">
                                <button
                                    onClick={() => { setShowOverwriteModal(false); performUpload(null, false); }}
                                    className="px-4 py-2 rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                >
                                    Skip
                                </button>
                                <button
                                    onClick={() => { setShowOverwriteModal(false); performUpload(null, true); }}
                                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium shadow-lg shadow-blue-500/30 transition-all"
                                >
                                    Overwrite
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Instruction Modal */}
            {showEditInstructionModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
                    <div className={`w-full max-w-md rounded-2xl shadow-2xl overflow-hidden ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                        <div className="p-6">
                            <h3 className="text-xl font-bold mb-4">Edit Instruction</h3>
                            <form onSubmit={handleEditInstructionSubmit}>
                                <textarea
                                    value={newInstruction}
                                    onChange={(e) => setNewInstruction(e.target.value)}
                                    className={`w-full p-3 rounded-xl border mb-6 ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-slate-50 border-slate-200'} focus:ring-2 focus:ring-blue-500 outline-none`}
                                    rows="4"
                                    placeholder="Enter instruction..."
                                />
                                <div className="flex justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setShowEditInstructionModal(false)}
                                        className="px-4 py-2 rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium shadow-lg shadow-blue-500/30 transition-all"
                                    >
                                        Save
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

