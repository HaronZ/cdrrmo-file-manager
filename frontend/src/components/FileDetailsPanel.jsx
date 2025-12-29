import { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import api from '../services/api';

export default function FileDetailsPanel({ file, onClose, onPreview, onDownload }) {
    const [details, setDetails] = useState(null);
    const [versions, setVersions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [restoring, setRestoring] = useState(false);
    const [activeTab, setActiveTab] = useState('details');
    const { darkMode } = useTheme();

    useEffect(() => {
        const loadDetails = async () => {
            if (!file) return;

            try {
                setLoading(true);
                const [detailsRes, versionsRes] = await Promise.all([
                    api.get(`/files/${file.id}/details`),
                    api.get(`/files/${file.id}/versions`)
                ]);
                setDetails(detailsRes.data);
                setVersions(versionsRes.data);
            } catch (error) {
                console.error('Failed to load file details:', error);
            } finally {
                setLoading(false);
            }
        };

        loadDetails();
    }, [file]);

    const handleRestore = async (versionId, versionNumber) => {
        if (!confirm(`Restore to version ${versionNumber}? Current file will be saved as a new version.`)) {
            return;
        }

        try {
            setRestoring(true);
            await api.post(`/files/${file.id}/restore/${versionId}`);
            // Reload versions
            const versionsRes = await api.get(`/files/${file.id}/versions`);
            setVersions(versionsRes.data);
            alert('File restored successfully!');
        } catch (error) {
            console.error('Restore failed:', error);
            alert('Failed to restore file: ' + (error.response?.data?.detail || error.message));
        } finally {
            setRestoring(false);
        }
    };

    const formatSize = (bytes) => {
        if (!bytes || bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'Unknown';
        return new Date(dateString).toLocaleString();
    };

    if (!file) return null;

    return (
        <div className={`fixed right-0 top-0 h-full w-96 shadow-2xl z-40 transform transition-transform duration-300 ${darkMode ? 'bg-gray-800' : 'bg-white'
            }`}>
            {/* Header */}
            <div className={`px-6 py-4 border-b flex items-center justify-between ${darkMode ? 'border-gray-700' : 'border-gray-200'
                }`}>
                <h3 className="font-semibold">File Details</h3>
                <button
                    onClick={onClose}
                    className={`p-2 rounded-lg transition-colors ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                        }`}
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            {loading ? (
                <div className="p-6 flex justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
            ) : (
                <>
                    {/* Tabs */}
                    <div className={`px-6 py-2 border-b flex gap-4 ${darkMode ? 'border-gray-700' : 'border-gray-200'
                        }`}>
                        <button
                            onClick={() => setActiveTab('details')}
                            className={`py-2 px-1 border-b-2 transition-colors ${activeTab === 'details'
                                    ? 'border-blue-500 text-blue-500'
                                    : 'border-transparent text-gray-400 hover:text-gray-600'
                                }`}
                        >
                            Details
                        </button>
                        <button
                            onClick={() => setActiveTab('versions')}
                            className={`py-2 px-1 border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'versions'
                                    ? 'border-blue-500 text-blue-500'
                                    : 'border-transparent text-gray-400 hover:text-gray-600'
                                }`}
                        >
                            Versions
                            {versions.length > 0 && (
                                <span className="bg-blue-100 text-blue-600 text-xs px-2 py-0.5 rounded-full">
                                    {versions.length}
                                </span>
                            )}
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6 overflow-y-auto" style={{ height: 'calc(100% - 180px)' }}>
                        {activeTab === 'details' && details && (
                            <div className="space-y-4">
                                {/* File Icon & Name */}
                                <div className="text-center pb-4 border-b dark:border-gray-700">
                                    <div className={`inline-flex p-4 rounded-2xl mb-3 ${details.file_type === 'PDF' ? 'bg-red-100' :
                                            details.file_type === 'DOCX' ? 'bg-blue-100' :
                                                details.file_type === 'XLSX' ? 'bg-green-100' : 'bg-gray-100'
                                        }`}>
                                        <svg className={`w-12 h-12 ${details.file_type === 'PDF' ? 'text-red-500' :
                                                details.file_type === 'DOCX' ? 'text-blue-500' :
                                                    details.file_type === 'XLSX' ? 'text-green-500' : 'text-gray-500'
                                            }`} fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                    <h4 className="font-medium break-words">{details.filename}</h4>
                                    <p className="text-sm text-gray-500">{details.file_type} • {formatSize(details.size)}</p>
                                </div>

                                {/* Metadata */}
                                <div className="space-y-3">
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Location</span>
                                        <span className="font-medium">{details.folder}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Uploaded by</span>
                                        <span className="font-medium">{details.owner || 'Unknown'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Created</span>
                                        <span className="font-medium text-sm">{formatDate(details.created_at)}</span>
                                    </div>
                                    {details.assigned_to && (
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Assigned to</span>
                                            <span className="font-medium text-blue-500">{details.assigned_to}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Status</span>
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${details.status === 'Done'
                                                ? 'bg-green-100 text-green-600'
                                                : 'bg-yellow-100 text-yellow-600'
                                            }`}>
                                            {details.status}
                                        </span>
                                    </div>
                                    {details.due_date && (
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Due date</span>
                                            <span className={`font-medium ${new Date(details.due_date) < new Date() && details.status !== 'Done'
                                                    ? 'text-red-500' : ''
                                                }`}>
                                                {formatDate(details.due_date)}
                                            </span>
                                        </div>
                                    )}
                                    {details.instruction && (
                                        <div className="pt-3 border-t dark:border-gray-700">
                                            <p className="text-gray-500 text-sm mb-1">Instructions</p>
                                            <p className={`text-sm p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'
                                                }`}>
                                                {details.instruction}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === 'versions' && (
                            <div className="space-y-3">
                                {versions.length === 0 ? (
                                    <div className="text-center py-8 text-gray-400">
                                        <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <p>No version history available</p>
                                        <p className="text-sm mt-1">Versions are created when files are overwritten</p>
                                    </div>
                                ) : (
                                    versions.map((version) => (
                                        <div
                                            key={version.id}
                                            className={`p-4 rounded-xl border ${darkMode ? 'bg-gray-750 border-gray-700' : 'bg-gray-50 border-gray-200'
                                                }`}
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="font-medium">Version {version.version_number}</span>
                                                <span className="text-xs text-gray-400">
                                                    {formatSize(version.size)}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-500 mb-3">
                                                {formatDate(version.created_at)}
                                            </p>
                                            <button
                                                onClick={() => handleRestore(version.id, version.version_number)}
                                                disabled={restoring}
                                                className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
                                            >
                                                {restoring ? 'Restoring...' : 'Restore this version'}
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className={`absolute bottom-0 left-0 right-0 p-4 border-t ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'
                        }`}>
                        <div className="flex gap-2">
                            {details?.can_preview && (
                                <button
                                    onClick={() => onPreview && onPreview(file)}
                                    className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                                >
                                    Preview
                                </button>
                            )}
                            <button
                                onClick={() => onDownload && onDownload(file)}
                                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${darkMode
                                        ? 'bg-gray-700 hover:bg-gray-600 text-white'
                                        : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                                    }`}
                            >
                                Download
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
