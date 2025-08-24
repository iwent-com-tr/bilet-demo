import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const AdminDashboard: React.FC = () => {
  const { user, isAdmin, isAuthenticated } = useAuth();

  return (
    <div className="bg-gray-900 text-white min-h-screen p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
        
        {/* Debug Info */}
        <div className="bg-gray-800 p-4 rounded-lg mb-6">
          <h2 className="text-xl font-semibold mb-4">Debug Info</h2>
          <div className="space-y-2">
            <p><strong>Authenticated:</strong> {isAuthenticated ? 'Yes' : 'No'}</p>
            <p><strong>Is Admin:</strong> {isAdmin ? 'Yes' : 'No'}</p>
            <p><strong>User Type:</strong> {user?.userType || 'None'}</p>
            <p><strong>Admin Role:</strong> {user?.adminRole || 'None'}</p>
            <p><strong>User ID:</strong> {user?.id || 'None'}</p>
            <p><strong>Email:</strong> {user?.email || 'None'}</p>
          </div>
        </div>

        {/* Navigation */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Link 
            to="/admin/users" 
            className="bg-blue-600 hover:bg-blue-700 text-white p-6 rounded-lg transition-colors text-center"
          >
            <h3 className="text-xl font-semibold mb-2">User Management</h3>
            <p>Manage users, roles, and permissions</p>
          </Link>
          
          <Link 
            to="/admin/organizers" 
            className="bg-purple-600 hover:bg-purple-700 text-white p-6 rounded-lg transition-colors text-center"
          >
            <h3 className="text-xl font-semibold mb-2">Organizer Management</h3>
            <p>Manage organizers, approvals, and events</p>
          </Link>
          
          <div className="bg-gray-600 text-gray-300 p-6 rounded-lg text-center">
            <h3 className="text-xl font-semibold mb-2">Event Management</h3>
            <p>Coming soon</p>
          </div>
          
          <div className="bg-gray-600 text-gray-300 p-6 rounded-lg text-center">
            <h3 className="text-xl font-semibold mb-2">Analytics</h3>
            <p>Coming soon</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;