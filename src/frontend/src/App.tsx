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
import UserList from './pages/admin/UserList';
import UserDetail from './pages/admin/UserDetail';
import AdminDashboard from './pages/admin/AdminDashboard';
import OrganizerList from './pages/admin/OrganizerList';
import AdminEventList from './pages/admin/EventList';
import AdminEventDetail from './pages/admin/EventDetail';
import { PushNotificationDemo } from './pages/PushNotificationDemo';
import OrganizerDetail from './pages/admin/OrganizerDetail';
// Context
import { AuthProvider } from './context/AuthContext';
import Search from 'pages/search/Search';

import Messages from './pages/chat/Messages';
import PrivateChat from './pages/chat/PrivateChat';
import UserProfile from './pages/user/UserProfile';
import VenueProfile from './pages/venues/VenueProfile';
import ArtistProfile from './pages/artists/ArtistProfile';

import VenuesDetail from 'pages/venues/VenuesDetail';
import ArtistsDetail from 'pages/artists/ArtistDetails';
import OrganizerDetails from 'pages/organizer/organizer-3rd-view/OrganizerDetails';
import MapPage from 'pages/map/Map';


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
            <Route path="/search" element={<Search />} />
            <Route path='/search/:index_name' element={<Search />} />

            <Route path="/messages" element={<Messages />} />
            <Route path="/chat/private/:userId" element={<PrivateChat />} />
            <Route path="/profile/:userId" element={<UserProfile />} />
            <Route path="/venue/:slug" element={<VenueProfile />} />
            <Route path="/artist/:slug" element={<ArtistProfile />} />

            <Route path="/venues/:slug" element={<VenuesDetail />} />
            <Route path="/artists/:slug" element={<ArtistsDetail />} />
            <Route path="/push-notification-demo" element={<PushNotificationDemo />} />
            <Route path="/map" element={<MapPage />} />

          </Route>

          {/* User Routes */}
          <Route element={<MainLayout />}>
            <Route path="/profile" element={
              <ProtectedRoute requiredRole="USER">
                <Profile />
              </ProtectedRoute>
            } />
            <Route path="/verify-phone" element={
              <ProtectedRoute requiredRole="USER">
                <PhoneVerify />
              </ProtectedRoute>
            } />
            <Route path="/user/settings" element={
              <ProtectedRoute requiredRole="USER">
                <Settings />
              </ProtectedRoute>
            } />
            <Route path="/my-tickets" element={
              <ProtectedRoute requiredRole="USER">
                <MyTickets />
              </ProtectedRoute>
            } />
            <Route path="/events/:slug/purchase" element={
              <ProtectedRoute requiredRole="USER">
                <EventPurchase />
              </ProtectedRoute>
            } />
            <Route path="/events/:slug/participant-info" element={
              <ProtectedRoute requiredRole="USER">
                <ParticipantInfo />
              </ProtectedRoute>
            } />
            <Route path="/events/:slug/chat" element={
              <ProtectedRoute>
                <EventChat />
              </ProtectedRoute>
            } />
            <Route path="/purchase-success" element={
              <ProtectedRoute requiredRole="USER">
                <PurchaseSuccess />
              </ProtectedRoute>
            } />
          </Route>

          {/* Organizer Routes */}
          <Route element={<MainLayout />}>
            <Route path="/organizer" element={
              <ProtectedRoute requiredRole="ORGANIZER">
                <OrganizerDashboard />
              </ProtectedRoute>
            } />
            <Route path="/organizer/events" element={
              <ProtectedRoute requiredRole="ORGANIZER">
                <OrganizerEvents />
              </ProtectedRoute>
            } />
            <Route path="/organizer/events/create" element={
              <ProtectedRoute requiredRole="ORGANIZER">
                <OrganizerEventCreate />
              </ProtectedRoute>
            } />
            <Route path="/organizer/events/:id/edit" element={
              <ProtectedRoute requiredRole="ORGANIZER">
                <OrganizerEventEdit />
              </ProtectedRoute>
            } />
            <Route path="/organizer/profile" element={
              <ProtectedRoute requiredRole="ORGANIZER">
                <OrganizerProfile />
              </ProtectedRoute>
            } />
            <Route path="/organizer/:id" element={
              <OrganizerDetails />
            } />
            <Route path="/organizer/devices" element={
              <ProtectedRoute requiredRole="ORGANIZER">
                <OrganizerDevices />
              </ProtectedRoute>
            } />
            <Route path="/organizer/events/create-success" element={
              <ProtectedRoute requiredRole="ORGANIZER">
                <OrganizerEventCreateSuccess />
              </ProtectedRoute>
            } />
            <Route path="/verify-phone-organizer" element={
              <ProtectedRoute requiredRole="ORGANIZER">
                <PhoneVerifyOrganizer />
              </ProtectedRoute>
            } />

          </Route>

          {/* Admin Routes */}
          <Route element={<MainLayout />}>

            <Route path="/admin" element={
              <ProtectedRoute requiredRole="ADMIN">
                <AdminDashboard />
              </ProtectedRoute>
            } />
            <Route path="/admin/users" element={
              <ProtectedRoute requiredRole="ADMIN">
                <UserList />
              </ProtectedRoute>
            } />
            <Route path="/admin/users/:id" element={
              <ProtectedRoute requiredRole="ADMIN">
                <UserDetail />
              </ProtectedRoute>
            } />
            <Route path="/admin/organizers" element={
              <ProtectedRoute requiredRole="ADMIN">
                <OrganizerList />
              </ProtectedRoute>
            } />
            <Route path="/admin/organizers/:id" element={
              <ProtectedRoute requiredRole="ADMIN">
                <OrganizerDetail />
              </ProtectedRoute>
            } />
            <Route path="/admin/events" element={
              <ProtectedRoute requiredRole="ADMIN">
                <AdminEventList />
              </ProtectedRoute>
            } />
            <Route path="/admin/events/:id" element={
              <ProtectedRoute requiredRole="ADMIN">
                <AdminEventDetail />
              </ProtectedRoute>
            } />
          </Route>

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>

      <ToastContainer
        position="top-right"
        autoClose={1500}
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
