import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useTheme } from '../context/ThemeContext';

export default function AdminPanel() {
    const [users, setUsers] = useState([]);
    const [, setLoading] = useState(false);
    const { darkMode } = useTheme();

    // Create User State
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newUser, setNewUser] = useState({ username: '', password: '', is_admin: false });

    const [searchQuery, setSearchQuery] = useState('');

    const fetchUsers = useCallback(async (search = '') => {
        setLoading(true);
        try {
            const params = search ? { search } : {};
            const response = await api.get('/users/', { params });
            setUsers(response.data);
        } catch (error) {
            console.error("Failed to fetch users", error);
            alert("Failed to load users");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchUsers(searchQuery);
        }, 300);
        return () => clearTimeout(timer);
    }, [fetchUsers, searchQuery]);

    const handleCreateUser = async (e) => {
        e.preventDefault();
        try {
            await api.post('/users/', newUser);
            setShowCreateModal(false);
            setNewUser({ username: '', password: '', is_admin: false });
            fetchUsers(searchQuery);
            alert("User created successfully");
        } catch (error) {
            console.error("Create user failed", error);
            alert("Failed to create user. Username might be taken.");
        }
    };

    const handleDeleteUser = async (userId) => {
        if (!window.confirm("Are you sure you want to delete this user?")) return;
        try {
            await api.delete(`/users/${userId}`);
            fetchUsers(searchQuery);
        } catch (error) {
            console.error("Delete user failed", error);
            alert("Failed to delete user");
        }
    };

    return (
        <div className={`p-6 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <h1 className="text-2xl font-bold">User Management</h1>

                <div className="flex gap-4 w-full md:w-auto">
                    <div className="relative w-full md:w-64">
                        <input
                            type="text"
                            placeholder="Search users..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300'}`}
                        />
                        <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>

                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 whitespace-nowrap"
                    >
                        Add User
                    </button>
                </div>
            </div>

            <div className={`overflow-hidden rounded-lg shadow ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className={darkMode ? 'bg-gray-700' : 'bg-gray-50'}>
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">ID</th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Username</th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Role</th>
                            <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className={`divide-y divide-gray-200 dark:divide-gray-700 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                        {users.map((user) => (
                            <tr key={user.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">{user.id}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{user.username}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.is_admin ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                        {user.is_admin ? 'Admin' : 'User'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <button onClick={() => handleDeleteUser(user.id)} className="text-red-600 hover:text-red-900 ml-4">Delete</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Create User Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className={`p-6 rounded-lg w-96 ${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}`}>
                        <h2 className="text-xl font-bold mb-4">Create New User</h2>
                        <form onSubmit={handleCreateUser}>
                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-1">Username</label>
                                <input
                                    type="text"
                                    value={newUser.username}
                                    onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                                    className={`w-full p-2 border rounded ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
                                    required
                                />
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-1">Password</label>
                                <input
                                    type="password"
                                    value={newUser.password}
                                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                                    className={`w-full p-2 border rounded ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
                                    required
                                />
                            </div>
                            <div className="mb-4 flex items-center">
                                <input
                                    type="checkbox"
                                    checked={newUser.is_admin}
                                    onChange={(e) => setNewUser({ ...newUser, is_admin: e.target.checked })}
                                    className="mr-2"
                                />
                                <label className="text-sm">Is Admin?</label>
                            </div>
                            <div className="flex justify-end space-x-2">
                                <button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600">Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Create</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
