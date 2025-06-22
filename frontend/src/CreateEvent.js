// src/CreateEvent.js
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { useToast } from './contexts/ToastContext';

function CreateEvent() {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [eventName, setEventName] = useState('');
  const [description, setDescription] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [initialPrice, setInitialPrice] = useState(''); // This will map to 'price' in backend
  const [venue, setVenue] = useState(''); // ID של האולם הנבחר
  const [category, setCategory] = useState(''); // ID של הקטגוריה הנבחרת
  const [seatMap, setSeatMap] = useState(''); // ID של מפת הישיבה הנבחרת (משמש לאחזור, לא נשלח ביצירה ישירות)
  const [status, setStatus] = useState('upcoming'); // סטטוס ברירת מחדל

  const [venues, setVenues] = useState([]);
  const [categories, setCategories] = useState([]); // Array of strings for categories
  const [seatMaps, setSeatMaps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const backendUrl = 'http://127.0.0.1:8000';

  // פונקציה לאחזור אולמות
  const fetchVenues = useCallback(async () => {
    try {
      const response = await fetch(`${backendUrl}/api/venues/`);
      if (!response.ok) {
        throw new Error(`שגיאה באחזור אולמות: ${response.statusText}`);
      }
      const data = await response.json();
      setVenues(data.results || data);
    } catch (error) {
      console.error("Error fetching venues:", error);
      addToast(`נכשל באחזור אולמות: ${error.message}`, 'error');
      setVenues([]);
    }
  }, [backendUrl, addToast]);

  // פונקציה לאחזור קטגוריות
  const fetchCategories = useCallback(async () => {
    try {
      const response = await fetch(`${backendUrl}/api/events/categories/`);
      if (!response.ok) {
        throw new Error(`שגיאה באחזור קטגוריות: ${response.statusText}`);
      }
      const data = await response.json();
      setCategories(data); // Expecting an array of strings like ["Concert", "Sport"]
    } catch (error) {
      console.error("Error fetching categories:", error);
      addToast(`נכשל באחזור קטגוריות: ${error.message}`, 'error');
      setCategories([]);
    }
  }, [backendUrl, addToast]);

  // פונקציה לאחזור מפות ישיבה לפי אולם
  const fetchSeatMaps = useCallback(async (venueId) => {
    if (!venueId) {
      setSeatMaps([]);
      setSeatMap(''); // נקה את בחירת מפת הישיבה
      return;
    }
    try {
      const response = await fetch(`${backendUrl}/api/venues/seating-maps/by_venue/?venue_id=${venueId}`);
      if (!response.ok) {
        throw new Error(`שגיאה באחזור מפות ישיבה: ${response.statusText}`);
      }
      const data = await response.json();
      setSeatMaps(data.results || data);
    } catch (error) {
      console.error("Error fetching seating maps:", error);
      addToast(`נכשל באחזור מפות ישיבה: ${error.message}`, 'error');
      setSeatMaps([]);
    }
  }, [backendUrl, addToast]);

  // useEffect לטעינת נתונים ראשונית
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchVenues(), fetchCategories()]); // וודא ששתי הפונקציות נקראות
      setLoading(false);
    };

    if (isAuthenticated && user?.is_staff) {
      loadData();
    } else if (!isAuthenticated) {
      addToast('עליך להתחבר כדי ליצור אירוע.', 'info');
      navigate('/login');
    } else if (!user?.is_staff) {
      addToast('אין לך הרשאה ליצור אירועים.', 'error');
      navigate('/');
    }
  }, [isAuthenticated, user, navigate, addToast, fetchVenues, fetchCategories]);

  // useEffect לטעינת מפות ישיבה כאשר האולם נבחר
  useEffect(() => {
    if (venue) {
      fetchSeatMaps(venue);
    } else {
      setSeatMaps([]); // אם אין אולם, נקה את מפות הישיבה
      setSeatMap(''); // ונקה את הבחירה
    }
  }, [venue, fetchSeatMaps]);


  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    addToast('יוצר אירוע חדש...', 'info');

    const token = localStorage.getItem('authToken');
    if (!token) {
      addToast("עליך להיות מחובר כדי ליצור אירוע.", 'error');
      setSubmitting(false);
      navigate('/login');
      return;
    }

    const eventData = {
      title: eventName,
      description,
      start_date: eventDate + 'T' + eventTime + ':00Z',
      end_date: null,
      price: parseFloat(initialPrice),
      venue: parseInt(venue),
      category: category, // Category is a string from the select field
      status,
      location: "", // These might be optional or derived by backend from venue
      city_name: "", // These might be optional or derived by backend from venue
    };

    try {
      const response = await fetch(`${backendUrl}/api/events/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${token}`,
        },
        body: JSON.stringify(eventData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = Object.values(errorData).flat().join('; ') || 'יצירת האירוע נכשלה.';
        throw new Error(errorMessage);
      }

      addToast('אירוע נוצר בהצלחה!', 'success');
      setEventName('');
      setDescription('');
      setEventDate('');
      setEventTime('');
      setInitialPrice('');
      setVenue('');
      setCategory(''); // Clear category field
      setSeatMap('');
      setStatus('upcoming');
      navigate('/my-events');

    } catch (error) {
      console.error("Error creating event:", error);
      addToast(`שגיאה ביצירת אירוע: ${error.message}`, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="text-center text-lg mt-8">טוען נתונים ליצירת אירוע...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white rounded-lg shadow-md my-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">צור אירוע חדש</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Event Name */}
        <div>
          <label htmlFor="eventName" className="block text-sm font-medium text-gray-700">שם האירוע:</label>
          <input
            type="text"
            id="eventName"
            value={eventName}
            onChange={(e) => setEventName(e.target.value)}
            required
            className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">תיאור:</label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows="4"
            className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          ></textarea>
        </div>

        {/* Date and Time */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="eventDate" className="block text-sm font-medium text-gray-700">תאריך האירוע:</label>
            <input
              type="date"
              id="eventDate"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              required
              className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label htmlFor="eventTime" className="block text-sm font-medium text-gray-700">שעת האירוע:</label>
            <input
              type="time"
              id="eventTime"
              value={eventTime}
              onChange={(e) => setEventTime(e.target.value)}
              required
              className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Initial Price (now just "Price") */}
        <div>
          <label htmlFor="initialPrice" className="block text-sm font-medium text-gray-700">מחיר:</label>
          <input
            type="number"
            id="initialPrice"
            value={initialPrice}
            onChange={(e) => setInitialPrice(e.target.value)}
            required
            min="0"
            step="0.01"
            className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Venue Select */}
        <div>
          <label htmlFor="venue" className="block text-sm font-medium text-gray-700">אולם:</label>
          <select
            id="venue"
            value={venue}
            onChange={(e) => setVenue(e.target.value)}
            required
            className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white"
          >
            <option value="">בחר אולם</option>
            {venues.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </div>

        {/* Seating Map Select (only if venue is selected) */}
        {venue && (
          <div>
            <label htmlFor="seatMap" className="block text-sm font-medium text-gray-700">מפת ישיבה (אופציונלי):</label>
            <select
              id="seatMap"
              value={seatMap}
              onChange={(e) => setSeatMap(e.target.value)}
              className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white"
            >
              <option value="">בחר מפת ישיבה (אוטומטי מהאולם)</option>
              {seatMaps.length > 0 ? (
                seatMaps.map((sm) => (
                  <option key={sm.id} value={sm.id}>
                    {sm.name}
                  </option>
                ))
              ) : (
                <option value="" disabled>אין מפות ישיבה זמינות עבור אולם זה.</option>
              )}
            </select>
          </div>
        )}

        {/* Category Select (back to standard select) */}
        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-700">קטגוריה:</label>
          <select
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            required
            className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white"
          >
            <option value="">בחר קטגוריה</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* Status */}
        <div>
          <label htmlFor="status" className="block text-sm font-medium text-gray-700">סטטוס:</label>
          <select
            id="status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            required
            className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white"
          >
            <option value="upcoming">קרוב</option>
            <option value="active">פעיל</option>
            <option value="completed">הסתיים</option>
            <option value="cancelled">בוטל</option>
          </select>
        </div>

        {/* Submit Button */}
        <div className="pt-4">
          <button
            type="submit"
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-lg font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            disabled={submitting}
          >
            {submitting ? 'יוצר...' : 'צור אירוע'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default CreateEvent;
