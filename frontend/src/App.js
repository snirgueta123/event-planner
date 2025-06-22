// src/App.js
import React, { useState, useEffect, useCallback, useRef } from 'react';
import './App.css';
import About from './About';
import EventList from './EventList';
import EventDetail from './EventDetail'; // *** תיקון קריטי: חזרה לנתיב המקורי והנכון ***
import Login from './Login';
import Register from './Register';
import { Routes, Route, Link, useNavigate, useLocation, Navigate } from 'react-router-dom';

import CreateEvent from './CreateEvent';
import MyEvents from './MyEvents';
import MyOrders from './MyOrders';
import TicketDetail from './TicketDetail';
import UserProfile from './UserProfile';
import EditEvent from './EditEvent';
import API_BASE_URL from './config';

import ForgotPassword from './ForgotPassword';
import ResetPassword from './ResetPassword';

import { ToastProvider, useToast } from './contexts/ToastContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import SeatBookingPage from './components/SeatBookingPage';

// Navbar Component - Corrected and Enhanced
const Navbar = () => {
  const { user, logout, isAuthenticated } = useAuth();
  return (
    <nav className="bg-gradient-to-r from-blue-600 to-purple-700 p-4 shadow-lg">
      <div className="container mx-auto flex justify-between items-center px-6 py-3">
        <Link to="/" className="text-white text-2xl font-bold hover:text-blue-200 transition-colors duration-300">
          EventTicketer
        </Link>
        <div className="flex items-center space-x-6">
          <Link to="/" className="text-white text-lg hover:text-blue-200 transition-colors duration-300">Home</Link>

          <Link to="/about" className="text-white text-lg hover:text-blue-200 transition-colors duration-300">About</Link>
          <Link to="/seat-booking" className="text-white text-lg hover:text-blue-200 transition-colors duration-300">Book Seats</Link>


          {isAuthenticated ? (
            <>
              {user?.is_staff && (
                <Link to="/create-event" className="text-white text-lg hover:text-blue-200 transition-colors duration-300">Create Event</Link>
              )}
              {user?.is_staff && (
                <Link to="/my-events" className="text-white text-lg hover:text-blue-200 transition-colors duration-300">My Events</Link>
              )}
              <Link to="/my-orders" className="text-white text-lg hover:text-blue-200 transition-colors duration-300">My Orders</Link>
              <Link to="/profile" className="text-white text-lg hover:text-blue-200 transition-colors duration-300">My Profile ({user.username})</Link>
              <button
                onClick={logout}
                className="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-md shadow-md transition-colors duration-300"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-md shadow-md transition-colors duration-300">Login</Link>
              <Link to="/register" className="bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-2 px-4 rounded-md shadow-md transition-colors duration-300">Register</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

// Main App Content Component
function AppContent() {
  const [events, setEvents] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const { addToast } = useToast();

  const [currentSearchTerm, setCurrentSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');

  const [dynamicCategories, setDynamicCategories] = useState([]);
  const [dynamicLocations, setDynamicLocations] = useState([]);

  const currentSearchTermRef = useRef('');
  const selectedCategoryRef = useRef('');
  const selectedLocationRef = useRef('');
  const debounceTimeoutRef = useRef(null);

  useEffect(() => { currentSearchTermRef.current = currentSearchTerm; }, [currentSearchTerm]);
  useEffect(() => { selectedCategoryRef.current = selectedCategory; }, [selectedCategory]);
  useEffect(() => { selectedLocationRef.current = selectedLocation; }, [selectedLocation]);


  const fetchDynamicCategories = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/events/categories/`);
      if (!response.ok) {
        throw new Error('Failed to fetch categories');
      }
      const data = await response.json();
      setDynamicCategories(data.sort());
    } catch (error) {
      console.error("Error fetching dynamic categories:", error);
      addToast("Failed to load categories for filtering.", "error");
    }
  }, [addToast]);

  const fetchDynamicLocations = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/events/locations/`);
      if (!response.ok) {
        throw new Error('Failed to fetch locations');
      }
      const data = await response.json();
      setDynamicLocations(data.sort());
    } catch (error) {
      console.error("Error fetching dynamic locations:", error);
      addToast("Failed to load locations for filtering.", "error");
    }
  }, [addToast]);

  useEffect(() => {
    fetchDynamicCategories();
    fetchDynamicLocations();
  }, [fetchDynamicCategories, fetchDynamicLocations]);

  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      const headers = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Token ${token}`;
      }

      const queryParams = new URLSearchParams();
      if (currentSearchTermRef.current) {
        queryParams.append('search', currentSearchTermRef.current);
      }
      if (selectedCategoryRef.current) {
        queryParams.append('category', selectedCategoryRef.current);
      }
      if (selectedLocationRef.current) {
        queryParams.append('city_name', selectedLocationRef.current);
      }

      const queryString = queryParams.toString();
      const url = `${API_BASE_URL}/events/${queryString ? '?' + queryString : ''}`;

      console.log("Attempting to fetch events from URL:", url);

      const response = await fetch(url, { headers });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error('Server responded with HTTP error:', errorBody);
        throw new Error(`HTTP error! Status: ${response.status}. Server message: ${errorBody}`);
      }
      const data = await response.json();
      const fetchedEvents = data.results || [];

      const eventsWithDynamicPrices = await Promise.all(
        fetchedEvents.map(async (event) => {
          try {
            const priceResponse = await fetch(`${API_BASE_URL}/events/${event.id}/current-price/`);
            if (!priceResponse.ok) {
              console.warn(`Failed to fetch dynamic price for event ${event.id}: ${priceResponse.statusText}`);
              return { ...event, dynamic_price: event.price, tier_name: 'N/A', is_dynamic_price: false };
            }
            const priceData = await priceResponse.json();
            return {
              ...event,
              dynamic_price: priceData.price,
              tier_name: priceData.tier_name,
              is_dynamic_price: priceData.is_dynamic_price
            };
          } catch (priceError) {
            console.error(`Error fetching dynamic price for event ${event.id}:`, priceError);
            return { ...event, dynamic_price: event.price, tier_name: 'N/A', is_dynamic_price: false };
          }
        })
      );

      setEvents(eventsWithDynamicPrices);
    } catch (err) {
      console.error("Failed to fetch events:", err);
      setError(err.message || "An unknown error occurred.");
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  useEffect(() => {
    const DEBOUNCE_TIME = 300;

    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      fetchEvents();
    }, DEBOUNCE_TIME);

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [currentSearchTerm, selectedCategory, selectedLocation, fetchEvents]);


  useEffect(() => {
    if (location.pathname === '/' && location.state?.refreshEvents) {
      fetchEvents();
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, fetchEvents, navigate]);

  const handleSearchChange = useCallback((term) => {
    setCurrentSearchTerm(term);
  }, []);

  const handleCategoryChange = useCallback((category) => {
    setSelectedCategory(category);
  }, []);

  const handleLocationChange = useCallback((location) => {
    setSelectedLocation(location);
  }, []);

  const HomePageContent = () => {
    if (loading) {
      return <div className="p-5 text-center text-lg">Loading Events...</div>;
    }

    if (error) {
      return <div className="p-5 text-center text-lg text-red-500">Error: {error}</div>;
    }

    return (
      <>
        <h2 className="text-2xl font-bold mb-6 text-center">Available Events</h2>
        <EventList
          events={events}
          onSearchChange={handleSearchChange}
          onCategoryChange={handleCategoryChange}
          onLocationChange={handleLocationChange}
          currentSelectedCategory={selectedCategory}
          currentSelectedLocation={selectedLocation}
          dynamicCategories={dynamicCategories}
          dynamicLocations={dynamicLocations}
        />
      </>
    );
  };

  const ProtectedRoute = ({ children }) => {
    const { isAuthenticated, loading: authLoading } = useAuth();

    if (authLoading) return null;
    return isAuthenticated ? children : <Navigate to="/login" />;
  };


  return (
    <div className="flex flex-col min-h-screen bg-gray-100 font-sans antialiased text-gray-800">
      <Navbar /> {/* Calling the correct Navbar component */}

      <main className="flex-grow p-6">
        <Routes>
          <Route path="/" element={<HomePageContent />} />
          {/* Note: /events route is effectively merged into / */}
          <Route path="/about" element={<About />} />
          <Route path="/events/:id" element={<EventDetail />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:uidb64/:token/" element={<ResetPassword />} />

          <Route path="/seat-booking" element={<SeatBookingPage />} />
          <Route path="/event/:eventId/select-seats" element={<SeatBookingPage />} />

          <Route path="/create-event" element={<ProtectedRoute><CreateEvent /></ProtectedRoute>} />
          <Route path="/my-events" element={<ProtectedRoute><MyEvents /></ProtectedRoute>} />
          <Route path="/edit-event/:id" element={<ProtectedRoute><EditEvent /></ProtectedRoute>} />
          <Route path="/my-orders" element={<ProtectedRoute><MyOrders /></ProtectedRoute>} />
          <Route path="/tickets/:id" element={<ProtectedRoute><TicketDetail /></ProtectedRoute>} />
          <Route path="/orders/:id/tickets" element={<ProtectedRoute><TicketDetail /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><UserProfile /></ProtectedRoute>} />
        </Routes>
      </main>
      <footer className="bg-gray-700 text-white text-center p-4 mt-8">
        <p>&copy; {new Date().getFullYear()} Event Ticketing System. All rights reserved.</p>
      </footer>
    </div>
  );
}

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;

