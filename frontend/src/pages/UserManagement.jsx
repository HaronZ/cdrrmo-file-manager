import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../services/api';

export default function UserManagement() {
    const { user } = useAuth();
    const { darkMode } = useTheme();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingUser, setEditingUser] = useState(null);

    // Form states
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const response = await api.get('/users/');
            setUsers(response.data);
        } catch (error) {
            console.error('Failed to fetch users', error);
            alert('Failed to load users');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateUser = async (e) => {
        e.preventDefault();
        try {
            await api.post('/users/', {
                username,
                password,
                is_admin: isAdmin
            });
            setShowCreateModal(false);
            setUsername('');
            setPassword('');
            setIsAdmin(false);
            fetchUsers();
        } catch (error) {
            console.error('Failed to create user', error);
            alert('Failed to create user: ' + (error.response?.data?.detail || error.message));
        }
    };

    const handleEditUser = async (e) => {
        e.preventDefault();
        try {
            await api.put(`/users/${editingUser.id}`, {
                username,
                password: password || undefined,
                is_admin: isAdmin
            });
            setShowEditModal(false);
            setEditingUser(null);
            setUsername('');
            setPassword('');
            setIsAdmin(false);
            fetchUsers();
        } catch (error) {
            console.error('Failed to update user', error);
            alert('Failed to update user: ' + (error.response?.data?.detail || error.message));
        }
    };

    const handleDeleteUser = async (userId) => {
        if (!window.confirm('Are you sure you want to delete this user?')) return;

        try {
            await api.delete(`/users/${userId}`);
            fetchUsers();
        } catch (error) {
            console.error('Failed to delete user', error);
            alert('Failed to delete user: ' + (error.response?.data?.detail || error.message));
        }
    };

    const openEditModal = (user) => {
        setEditingUser(user);
        setUsername(user.username);
        setPassword('');
        setIsAdmin(user.is_admin);
        setShowEditModal(true);
    };

    return (
        <div className={`min-h-screen p-6 ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-4xl font-bold mb-2">👥 User Management</h1>
                    <p className="text-gray-500 dark:text-gray-400">Manage CDRRMO system users</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold flex items-center space-x-2"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                    </svg>
                    <span>Add New User</span>
                </button>
            </div>

            {/* Users Table */}
            {loading ? (
                <div className="text-center py-10">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p>Loading users...</p>
                </div>
            ) : (
                <div className={`rounded-xl shadow-lg overflow-hidden ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className={`${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                                <tr>
                                    <th className="text-left py-4 px-6 font-semibold">ID</th>
                                    <th className="text-left py-4 px-6 font-semibold">Username</th>
                                    <th className="text-left py-4 px-6 font-semibold">Role</th>
                                    <th className="text-left py-4 px-6 font-semibold">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((u) => (
                                    <tr
                                        key={u.id}
                                        className={`border-b ${darkMode ? 'border-gray-700 hover:bg-gray-750' : 'border-gray-100 hover:bg-gray-50'}`}
                                    >
                                        <td className="py-4 px-6 text-gray-500 dark:text-gray-400">
                                            #{u.id}
                                        </td>
                                        <td className="py-4 px-6">
                                            <div className="flex items-center space-x-3">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                                                    {u.username[0].toUpperCase()}
                                                </div>
                                                <span className="font-medium">{u.username}</span>
                                                {u.id === user?.id && (
                                                    <span className="text-xs bg-blue-200 dark:bg-blue-900/50 text-blue-900 dark:text-blue-100 px-2 py-1 rounded">You</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="py-4 px-6">
                                            {u.is_admin ? (
                                                <span className="px-3 py-1 rounded-full text-sm font-semibold bg-purple-200 dark:bg-purple-900/50 text-purple-900 dark:text-purple-100">
                                                    👑 Admin
                                                </span>
                                            ) : (
                                                <span className="px-3 py-1 rounded-full text-sm font-semibold bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                                                    👤 User
                                                </span>
                                            )}
                                        </td>
                                        <td className="py-4 px-6">
                                            <div className="flex space-x-2">
                                                <button
                                                    onClick={() => openEditModal(u)}
                                                    className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition-colors text-sm font-semibold"
                                                >
                                                    ✏️ Edit
                                                </button>
                                                {u.id !== user?.id && (
                                                    <button
                                                        onClick={() => handleDeleteUser(u.id)}
                                                        className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors text-sm font-semibold"
                                                    >
                                                        🗑️ Delete
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {users.length === 0 && (
                            <div className="text-center py-10 text-gray-500">
                                No users found
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Create User Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className={`p-8 rounded-xl w-full max-w-md ${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}`}>
                        <h2 className="text-2xl font-bold mb-6">👤 Create New User</h2>
                        <form onSubmit={handleCreateUser}>
                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-2">Username</label>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
                                    required
                                />
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-2">Password</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
                                    required
                                />
                            </div>
                            <div className="mb-6">
                                <label className="flex items-center space-x-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={isAdmin}
                                        onChange={(e) => setIsAdmin(e.target.checked)}
                                        className="w-4 h-4"
                                    />
                                    <span className="text-sm font-medium">Make this user an administrator</span>
                                </label>
                            </div>
                            <div className="flex justify-end space-x-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowCreateModal(false);
                                        setUsername('');
                                        setPassword('');
                                        setIsAdmin(false);
                                    }}
                                    className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-semibold"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                                >
                                    Create User
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit User Modal */}
            {showEditModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className={`p-8 rounded-xl w-full max-w-md ${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}`}>
                        <h2 className="text-2xl font-bold mb-6">✏️ Edit User</h2>
                        <form onSubmit={handleEditUser}>
                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-2">Username</label>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
                                    required
                                />
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-2">New Password (leave blank to keep current)</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Leave blank to keep same password"
                                    className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
                                />
                            </div>
                            <div className="mb-6">
                                <label className="flex items-center space-x-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={isAdmin}
                                        onChange={(e) => setIsAdmin(e.target.checked)}
                                        className="w-4 h-4"
                                    />
                                    <span className="text-sm font-medium">Administrator privileges</span>
                                </label>
                            </div>
                            <div className="flex justify-end space-x-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowEditModal(false);
                                        setEditingUser(null);
                                        setUsername('');
                                        setPassword('');
                                        setIsAdmin(false);
                                    }}
                                    className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-semibold"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-3 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors font-semibold"
                                >
                                    Update User
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
