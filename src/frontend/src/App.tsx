import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Layouts
import MainLayout from './components/layouts/MainLayout';
import ProtectedRoute from './components/layouts/ProtectedRoute';

// Pages
import Home from './pages/Home';
import EventList from './pages/events/EventList';
import EventDetail from './pages/events/EventDetail';
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
import EventPurchase from './pages/events/EventPurchase';
import PurchaseSuccess from './pages/events/PurchaseSuccess';
import EventTicketCategories from './pages/events/EventTicketCategories';
import EventChat from './pages/events/EventChat';
import ParticipantInfo from './pages/events/ParticipantInfo';
import Settings from './pages/user/settings/Settings';
import PhoneVerify from './pages/user/PhoneVerify';
import PhoneVerifyOrganizer from './pages/organizer/PhoneVerify';
import CalendarPage from './pages/Calendar';
import NotificationsDemo from 'pages/NotificationsDemo';
// Context
import { AuthProvider } from './context/AuthContext';
import Search from 'pages/search/Search';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route element={<MainLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/events" element={<EventList />} />
            <Route path="/events/:slug" element={<EventDetail />} />
            <Route path="/events/:slug/event-ticket-categories" element={<EventTicketCategories />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/register/organizer" element={<OrganizerRegister />} />
            <Route path="/notifications-demo" element={<NotificationsDemo />} />
            <Route path="/search" element={<Search />} />
            <Route path='/search/:query' element={<Search />} />
          </Route>

          {/* User Routes */}
          <Route element={<MainLayout />}>
            <Route path="/profile" element={
              <ProtectedRoute requiredRole="user">
                <Profile />
              </ProtectedRoute>
            } />
            <Route path="/verify-phone" element={
              <ProtectedRoute requiredRole="user">
                <PhoneVerify />
              </ProtectedRoute>
            } />
            <Route path="/user/settings" element={
              <ProtectedRoute requiredRole="user">
                <Settings />
              </ProtectedRoute>
            } />
            <Route path="/my-tickets" element={
              <ProtectedRoute requiredRole="user">
                <MyTickets />
              </ProtectedRoute>
            } />
            <Route path="/events/:slug/purchase" element={
              <ProtectedRoute requiredRole="user">
                <EventPurchase />
              </ProtectedRoute>
            } />
            <Route path="/events/:slug/participant-info" element={
              <ProtectedRoute requiredRole="user">
                <ParticipantInfo />
              </ProtectedRoute>
            } />
            <Route path="/events/:slug/chat" element={
              <ProtectedRoute>
                <EventChat />
              </ProtectedRoute>
            } />
            <Route path="/purchase-success" element={
              <ProtectedRoute requiredRole="user">
                <PurchaseSuccess />
              </ProtectedRoute>
            } />
          </Route>

          {/* Organizer Routes */}
          <Route element={<MainLayout />}>
            <Route path="/organizer" element={
              <ProtectedRoute requiredRole="organizer">
                <OrganizerDashboard />
              </ProtectedRoute>
            } />
            <Route path="/organizer/events" element={
              <ProtectedRoute requiredRole="organizer">
                <OrganizerEvents />
              </ProtectedRoute>
            } />
            <Route path="/organizer/events/create" element={
              <ProtectedRoute requiredRole="organizer">
                <OrganizerEventCreate />
              </ProtectedRoute>
            } />
            <Route path="/organizer/events/:id/edit" element={
              <ProtectedRoute requiredRole="organizer">
                <OrganizerEventEdit />
              </ProtectedRoute>
            } />
            <Route path="/organizer/profile" element={
              <ProtectedRoute requiredRole="organizer">
                <OrganizerProfile />
              </ProtectedRoute>
            } />
            <Route path="/organizer/devices" element={
              <ProtectedRoute requiredRole="organizer">
                <OrganizerDevices />
              </ProtectedRoute>
            } />
            <Route path="/organizer/events/create-success" element={
              <ProtectedRoute requiredRole="organizer">
                <OrganizerEventCreateSuccess />
              </ProtectedRoute>
            } />
            <Route path="/verify-phone-organizer" element={
              <ProtectedRoute requiredRole="organizer">
                <PhoneVerifyOrganizer />
              </ProtectedRoute>
            } />

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