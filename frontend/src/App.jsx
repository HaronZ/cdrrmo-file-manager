import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import FileExplorer from './components/FileExplorer';
import Login from './pages/Login';
import AdminPanel from './pages/AdminPanel';
import ActivityLogs from './pages/ActivityLogs';
import Dashboard from './pages/Dashboard';
import UserManagement from './pages/UserManagement';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import Register from './pages/Register';
import Tasks from './pages/Tasks';
import TasksPage from './pages/TasksPage';
import NotFound from './pages/NotFound';

// ...

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/files" element={<FileExplorer />} />
        <Route path="/tasks" element={<TasksPage />} />
      </Route>

      {/* Admin Routes */}
      <Route element={
        <ProtectedRoute requireAdmin={true}>
          <Layout />
        </ProtectedRoute>
      }>
        <Route path="/admin" element={<AdminPanel />} />
        <Route path="/users" element={<UserManagement />} />
        <Route path="/logs" element={<ActivityLogs />} />
        <Route path="/admin/tasks" element={<Tasks />} />
      </Route>

      {/* Catch-all route for 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default App;
