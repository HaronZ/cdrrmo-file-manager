import { useState, useEffect, useRef } from 'react';
import { useTheme } from '../context/ThemeContext';
import api from '../services/api';

export default function FilePreviewModal({ file, onClose }) {
    const [previewUrl, setPreviewUrl] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { darkMode } = useTheme();
    const urlRef = useRef(null);

    useEffect(() => {
        const loadPreview = async () => {
            if (!file) return;

            try {
                setLoading(true);
                setError(null);

                const response = await api.get(`/files/${file.id}/preview`, {
                    responseType: 'blob'
                });

                const url = URL.createObjectURL(response.data);
                urlRef.current = url;
                setPreviewUrl(url);
            } catch (err) {
                console.error('Preview error:', err);
                setError(err.response?.data?.detail || 'Failed to load preview');
            } finally {
                setLoading(false);
            }
        };

        loadPreview();

        return () => {
            if (urlRef.current) {
                URL.revokeObjectURL(urlRef.current);
                urlRef.current = null;
            }
        };
    }, [file]);

    if (!file) return null;

    const ext = file.filename.split('.').pop().toLowerCase();
    const isPDF = ext === 'pdf';
    const isImage = ['jpg', 'jpeg', 'png', 'gif', 'bmp'].includes(ext);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
            <div className={`w-full max-w-5xl h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col ${darkMode ? 'bg-gray-800' : 'bg-white'
                }`}>
                {/* Header */}
                <div className={`px-6 py-4 border-b flex items-center justify-between ${darkMode ? 'border-gray-700 bg-gray-750' : 'border-gray-200 bg-gray-50'
                    }`}>
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${isPDF ? 'bg-red-100 text-red-600' : 'bg-purple-100 text-purple-600'
                            }`}>
                            {isPDF ? (
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                                </svg>
                            ) : (
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                                </svg>
                            )}
                        </div>
                        <div>
                            <h3 className="font-semibold truncate max-w-md">{file.filename}</h3>
                            <p className="text-sm text-gray-500">{ext.toUpperCase()} Preview</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className={`p-2 rounded-lg transition-colors ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'
                            }`}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Preview Content */}
                <div className="flex-1 overflow-hidden p-4">
                    {loading ? (
                        <div className="h-full flex flex-col items-center justify-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                            <p className="text-gray-500">Loading preview...</p>
                        </div>
                    ) : error ? (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400">
                            <svg className="w-16 h-16 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            <p className="text-lg font-medium mb-2">Preview not available</p>
                            <p className="text-sm">{error}</p>
                        </div>
                    ) : isPDF ? (
                        <iframe
                            src={previewUrl}
                            className="w-full h-full rounded-lg border border-gray-200 dark:border-gray-600"
                            title={file.filename}
                        />
                    ) : isImage ? (
                        <div className="h-full flex items-center justify-center">
                            <img
                                src={previewUrl}
                                alt={file.filename}
                                className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                            />
                        </div>
                    ) : (
                        <div className="h-full flex items-center justify-center text-gray-400">
                            Preview not supported for this file type
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className={`px-6 py-4 border-t flex justify-end gap-3 ${darkMode ? 'border-gray-700' : 'border-gray-200'
                    }`}>
                    <button
                        onClick={onClose}
                        className={`px-4 py-2 rounded-lg ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
                            }`}
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
