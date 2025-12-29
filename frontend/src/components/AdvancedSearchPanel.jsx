import { useState } from 'react';
import { useTheme } from '../context/ThemeContext';

export default function AdvancedSearchPanel({ onSearch, onClose, users = [] }) {
    const { darkMode } = useTheme();
    const [filters, setFilters] = useState({
        q: '',
        folder: '',
        file_type: '',
        date_from: '',
        date_to: '',
        uploader_id: '',
        status: '',
        assigned_to_id: '',
        overdue_only: false
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        // Remove empty values
        const activeFilters = Object.fromEntries(
            Object.entries(filters).filter((entry) => entry[1] !== '' && entry[1] !== false)
        );
        onSearch(activeFilters);
    };

    const handleReset = () => {
        setFilters({
            q: '',
            folder: '',
            file_type: '',
            date_from: '',
            date_to: '',
            uploader_id: '',
            status: '',
            assigned_to_id: '',
            overdue_only: false
        });
        onSearch({});
    };

    const inputClass = `w-full p-2.5 rounded-lg border ${darkMode
        ? 'bg-gray-700 border-gray-600 text-white'
        : 'bg-white border-gray-300 text-gray-900'
        } focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none`;

    return (
        <div className={`p-4 rounded-xl border mb-4 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'
            }`}>
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold flex items-center gap-2">
                    <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                    </svg>
                    Advanced Filters
                </h3>
                <button
                    onClick={onClose}
                    className={`p-1 rounded-lg ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'}`}
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Search Query */}
                    <div>
                        <label className="block text-sm font-medium mb-1 text-gray-500">Filename</label>
                        <input
                            type="text"
                            placeholder="Search in filename..."
                            value={filters.q}
                            onChange={(e) => setFilters({ ...filters, q: e.target.value })}
                            className={inputClass}
                        />
                    </div>

                    {/* File Type */}
                    <div>
                        <label className="block text-sm font-medium mb-1 text-gray-500">File Type</label>
                        <select
                            value={filters.file_type}
                            onChange={(e) => setFilters({ ...filters, file_type: e.target.value })}
                            className={inputClass}
                        >
                            <option value="">All Types</option>
                            <option value="pdf">PDF</option>
                            <option value="docx">Word (DOCX)</option>
                            <option value="xlsx">Excel (XLSX)</option>
                            <option value="pptx">PowerPoint (PPTX)</option>
                        </select>
                    </div>

                    {/* Status */}
                    <div>
                        <label className="block text-sm font-medium mb-1 text-gray-500">Status</label>
                        <select
                            value={filters.status}
                            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                            className={inputClass}
                        >
                            <option value="">All Status</option>
                            <option value="Pending">Pending</option>
                            <option value="Done">Done</option>
                        </select>
                    </div>

                    {/* Folder */}
                    <div>
                        <label className="block text-sm font-medium mb-1 text-gray-500">Folder</label>
                        <select
                            value={filters.folder}
                            onChange={(e) => setFilters({ ...filters, folder: e.target.value })}
                            className={inputClass}
                        >
                            <option value="">All Folders</option>
                            <option value="Operation">Operation</option>
                            <option value="Research">Research</option>
                            <option value="Training">Training</option>
                        </select>
                    </div>

                    {/* Date From */}
                    <div>
                        <label className="block text-sm font-medium mb-1 text-gray-500">From Date</label>
                        <input
                            type="date"
                            value={filters.date_from}
                            onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
                            className={inputClass}
                        />
                    </div>

                    {/* Date To */}
                    <div>
                        <label className="block text-sm font-medium mb-1 text-gray-500">To Date</label>
                        <input
                            type="date"
                            value={filters.date_to}
                            onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
                            className={inputClass}
                        />
                    </div>

                    {/* Assigned To */}
                    {users.length > 0 && (
                        <div>
                            <label className="block text-sm font-medium mb-1 text-gray-500">Assigned To</label>
                            <select
                                value={filters.assigned_to_id}
                                onChange={(e) => setFilters({ ...filters, assigned_to_id: e.target.value })}
                                className={inputClass}
                            >
                                <option value="">Anyone</option>
                                {users.map(user => (
                                    <option key={user.id} value={user.id}>{user.username}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Overdue Only */}
                    <div className="flex items-end">
                        <label className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer ${filters.overdue_only
                            ? 'bg-red-50 border-red-300 text-red-600'
                            : darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                            }`}>
                            <input
                                type="checkbox"
                                checked={filters.overdue_only}
                                onChange={(e) => setFilters({ ...filters, overdue_only: e.target.checked })}
                                className="w-4 h-4 rounded"
                            />
                            <span className="text-sm font-medium">Overdue Only</span>
                        </label>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 mt-4 pt-4 border-t dark:border-gray-700">
                    <button
                        type="button"
                        onClick={handleReset}
                        className={`px-4 py-2 rounded-lg ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
                            }`}
                    >
                        Reset
                    </button>
                    <button
                        type="submit"
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
                    >
                        Apply Filters
                    </button>
                </div>
            </form>
        </div>
    );
}
