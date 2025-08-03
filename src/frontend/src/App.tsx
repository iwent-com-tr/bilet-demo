import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Layouts
import MainLayout from './components/layouts/MainLayout';
import AuthLayout from './components/layouts/AuthLayout';

// Pages
import Home from './pages/Home';
import EventList from './pages/EventList';
import EventDetail from './pages/EventDetail';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import OrganizerRegister from './pages/auth/OrganizerRegister';
import Profile from './pages/user/Profile';
import MyTickets from './pages/user/MyTickets';
import OrganizerDashboard from './pages/organizer/Dashboard';
import OrganizerEvents from './pages/organizer/Events';
import OrganizerEventCreate from './pages/organizer/EventCreate';
import OrganizerEventEdit from './pages/organizer/EventEdit';
import OrganizerProfile from './pages/organizer/Profile';
import OrganizerDevices from './pages/organizer/Devices';
import NotFound from './pages/NotFound';
import OrganizerEventCreateSuccess from './pages/organizer/EventCreateSuccess';

// Context
import { AuthProvider } from './context/AuthContext';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route element={<MainLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/events" element={<EventList />} />
            <Route path="/events/:id" element={<EventDetail />} />
          </Route>

          {/* Auth Routes */}
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/register/organizer" element={<OrganizerRegister />} />
          </Route>

          {/* User Routes */}
          <Route element={<MainLayout requireAuth />}>
            <Route path="/profile" element={<Profile />} />
            <Route path="/my-tickets" element={<MyTickets />} />
          </Route>

          {/* Organizer Routes */}
          <Route element={<MainLayout requireAuth organizerOnly />}>
            <Route path="/organizer" element={<OrganizerDashboard />} />
            <Route path="/organizer/events" element={<OrganizerEvents />} />
            <Route path="/organizer/events/create" element={<OrganizerEventCreate />} />
            <Route path="/organizer/events/:id/edit" element={<OrganizerEventEdit />} />
            <Route path="/organizer/profile" element={<OrganizerProfile />} />
            <Route path="/organizer/devices" element={<OrganizerDevices />} />
            <Route path="/organizer/events/create-success" element={<OrganizerEventCreateSuccess />} />
          </Route>

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>

      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
    </AuthProvider>
  );
};

export default App; 