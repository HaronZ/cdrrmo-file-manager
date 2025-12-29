import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useTheme } from '../context/ThemeContext';

export default function ActivityLogs() {
    const [logs, setLogs] = useState([]);
    const [, setLoading] = useState(false);
    const { darkMode } = useTheme();

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        try {
            const response = await api.get('/activity_logs/');
            setLogs(response.data);
        } catch (error) {
            console.error("Failed to fetch logs", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    return (
        <div className={`p-6 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            <h1 className="text-2xl font-bold mb-6">Activity Logs</h1>

            <div className={`overflow-hidden rounded-lg shadow ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className={darkMode ? 'bg-gray-700' : 'bg-gray-50'}>
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Timestamp</th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">User</th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Action</th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Details</th>
                        </tr>
                    </thead>
                    <tbody className={`divide-y divide-gray-200 dark:divide-gray-700 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                        {logs.map((log) => (
                            <tr key={log.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                    {new Date(log.timestamp).toLocaleString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                    {log.user ? log.user.username : 'Unknown'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                    ${log.action === 'UPLOAD' ? 'bg-green-100 text-green-800' :
                                            log.action.includes('DELETE') ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>
                                        {log.action}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                    {log.details}
                                </td>
                            </tr>
                        ))}
                        {logs.length === 0 && (
                            <tr>
                                <td colSpan="4" className="px-6 py-4 text-center text-sm text-gray-500">No logs found</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
