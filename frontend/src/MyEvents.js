// src/MyEvents.js
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useToast } from './contexts/ToastContext';
import ConfirmationDialog from './components/ConfirmationDialog';

function MyEvents() {
  const [events, setEvents] = useState([]);
  const [loadingInitial, setLoadingInitial] = useState(true); // מצב לטעינה ראשונית של הדף
  const [isSearching, setIsSearching] = useState(false); // מצב לחיפוש/סינון פעיל
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [eventIdToDelete, setEventIdToDelete] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');

  const categories = ['Concert', 'Sport', 'Conference', 'Festival', 'Other'];
  const locations = ['תל אביב', 'ירושלים', 'חיפה', 'באר שבע', 'אילת', 'אחר'];

  const searchTermValueRef = useRef('');
  const selectedCategoryValueRef = useRef('');
  const selectedLocationValueRef = useRef('');

  const debounceTimeoutRef = useRef(null);

  useEffect(() => {
    searchTermValueRef.current = searchTerm;
  }, [searchTerm]);

  useEffect(() => {
    selectedCategoryValueRef.current = selectedCategory;
  }, [selectedCategory]);

  useEffect(() => {
    selectedLocationValueRef.current = selectedLocation;
  }, [selectedLocation]);

  const performFetch = useCallback(async (initialLoad = false) => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      addToast("עליך להיות מחובר כדי לצפות באירועים שלך.", 'error');
      if (initialLoad) setLoadingInitial(false);
      else setIsSearching(false);
      navigate('/login');
      return;
    }

    try {
      if (initialLoad) {
        setLoadingInitial(true); // הצג ספינר טעינה מלא רק בטעינה הראשונית
      } else {
        setIsSearching(true); // הצג אינדיקטור חיפוש עדין בחיפוש/סינון
      }

      const queryParams = new URLSearchParams();
      if (searchTermValueRef.current) {
        queryParams.append('search', searchTermValueRef.current);
      }
      if (selectedCategoryValueRef.current) {
        queryParams.append('category', selectedCategoryValueRef.current);
      }
      if (selectedLocationValueRef.current) {
        queryParams.append('location', selectedLocationValueRef.current);
      }

      const url = `https://event-planner-backend-kssg.onrender.com/api/events/my_events/?${queryParams.toString()}`;

      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          addToast("הסשן פג או שאינך מורשה. אנא התחבר שוב.", 'error');
          localStorage.removeItem('authToken');
          navigate('/login');
          return;
        }
        let errorText = await response.text();
        try {
            const errorData = JSON.parse(errorText);
            errorText = errorData.detail || errorData.error || errorText;
        } catch (e) {
        }
        throw new Error(`שגיאת HTTP! סטטוס: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const fetchedEvents = data.results || [];

      const eventsWithDynamicPrices = await Promise.all(
        fetchedEvents.map(async (event) => {
          try {
            const priceResponse = await fetch(`https://event-planner-backend-kssg.onrender.com/api/events/${event.id}/current-price/`);
            if (!priceResponse.ok) {
              console.warn(`Failed to fetch dynamic price for event ${event.id}: ${priceResponse.statusText}`);
              return { ...event, dynamic_price: event.price, tier_name: 'N/A', is_dynamic_price: false };
            }
            const priceData = await priceResponse.json();
            return {
              ...event,
              dynamic_price: priceData.price,
              tier_name: priceData.tier_name,
              is_dynamic_price: priceData.is_dynamic_price // הוספת דגל האם זה מחיר דינמי
            };
          } catch (priceError) {
            console.error(`Error fetching dynamic price for event ${event.id}:`, priceError);
            return { ...event, dynamic_price: event.price, tier_name: 'N/A', is_dynamic_price: false }; // Fallback to base price
          }
        })
      );

      setEvents(eventsWithDynamicPrices);
    } catch (err) {
      console.error("נכשל בטעינת האירועים שלי:", err);
      addToast(err.message || "אירעה שגיאה בלתי צפויה בטעינת האירועים.", 'error');
    } finally {
      if (initialLoad) setLoadingInitial(false); // כבה מצב טעינה ראשונית
      else setIsSearching(false); // כבה מצב חיפוש
    }
  }, [navigate, addToast]); // performFetch תלוי רק ב-navigate ו-addToast, כך שהוא יציב

  useEffect(() => {
    performFetch(true); // קרא לפונקציה performFetch עם דגל initialLoad = true
  }, [performFetch]); // performFetch נמצא ב-useCallback ויציב, אז בטוח להשתמש בו כתלות

  useEffect(() => {
    const DEBOUNCE_TIME = 300; // זמן ה-debounce במילישניות

    if (loadingInitial) {
        return;
    }

    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      performFetch(false); // זו לא טעינה ראשונית
    }, DEBOUNCE_TIME);

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [searchTerm, selectedCategory, selectedLocation, performFetch, loadingInitial]); // תלויות שיגרמו לאפקט זה לרוץ מחדש

  const handleDeleteEvent = (eventId) => {
    setEventIdToDelete(eventId);
    setShowConfirmDialog(true);
  };

  const handleConfirmDelete = async () => {
    setShowConfirmDialog(false);
    if (!eventIdToDelete) return;

    addToast('מוחק אירוע...', 'info');

    const token = localStorage.getItem('authToken');
    if (!token) {
      addToast("עליך להיות מחובר כדי למחוק אירועים.", 'error');
      navigate('/login');
      return;
    }

    try {
      const response = await fetch(`https://event-planner-backend-kssg.onrender.com/api/events/${eventIdToDelete}/`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Token ${token}`,
        },
      });

      if (!response.ok) {
        let errorText = await response.text();
        try {
            const errorData = JSON.parse(errorText);
            errorText = errorData.detail || errorData.error || errorText;
        } catch (e) {
            // אם התגובה אינה JSON, השתמש בטקסט הגולמי
        }
        addToast(`מחיקת אירוע נכשלה: ${errorText}`, 'error');
        throw new Error(`מחיקת אירוע נכשלה: ${errorText}`);
      }

      addToast('האירוע נמחק בהצלחה!', 'success');
      performFetch(false); // רענן את הרשימה לאחר המחיקה (זו לא טעינה ראשונית)
    } catch (err) {
      console.error("שגיאה במחיקת אירוע:", err);
      if (!err.message.includes('מחיקת אירוע נכשלה')) {
        addToast(err.message || "אירעה שגיאה בלתי צפויה במחיקת האירוע.", 'error');
      }
    } finally {
      setEventIdToDelete(null);
    }
  };

  const handleCancelDelete = () => {
    setShowConfirmDialog(false);
    setEventIdToDelete(null);
    addToast("מחיקת האירוע בוטלה.", 'info');
  };

  // הצגת ספינר טעינה מלא רק בטעינה הראשונית של הדף
  if (loadingInitial) {
    return <div className="p-6 text-center text-lg text-gray-700">טוען את האירועים שלך...</div>;
  }

   return (
    <div
      className="relative min-h-screen bg-gray-100"
      style={{
        backgroundImage: `url('https://images.unsplash.com/photo-1531058020387-3be344556be6?auto=format&fit=crop&w=1600&q=80')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="absolute inset-0 bg-blue-900 bg-opacity-70 rounded-3xl"></div>
      <div className="relative z-10 max-w-screen-xl mx-auto px-4">
        <div className="text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-4 drop-shadow-lg text-white">האירועים שלי</h2>
          <p className="text-lg md:text-xl mb-6 drop-shadow text-white">
            כאן תוכל לצפות, לערוך או למחוק את כל האירועים שיצרת.
          </p>
        </div>

        <div className="bg-white bg-opacity-30 backdrop-blur-md px-6 py-4 shadow-inner mb-10 w-full border-b border-white text-white rounded-xl">
          <h3 className="text-lg font-semibold mb-4 text-center md:text-right">חיפוש וסינון האירועים שלי</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label htmlFor="search" className="block text-sm font-medium mb-1">חפש לפי כותרת/תיאור:</label>
              <input
                type="text"
                id="search"
                placeholder="הקלד לחיפוש..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900"
              />
            </div>
            <div>
              <label htmlFor="category" className="block text-sm font-medium mb-1">קטגוריה:</label>
              <select
                id="category"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900"
              >
                <option value="">כל הקטגוריות</option>
                {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="location" className="block text-sm font-medium mb-1">מיקום:</label>
              <select
                id="location"
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900"
              >
                <option value="">כל המיקומים</option>
                {locations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
              </select>
            </div>
          </div>
        </div>

        {isSearching && (
          <div className="text-center text-white mt-4 mb-4 flex items-center justify-center">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white inline-block mr-2"></div>
            <p>מחפש אירועים...</p>
          </div>
        )}

        {events.length === 0 && !isSearching ? (
          (searchTerm || selectedCategory || selectedLocation) ? (
            <div className="text-center text-gray-200 text-lg p-6 bg-white bg-opacity-90 rounded-lg shadow-md">
              <p className="mb-4">לא נמצאו אירועים התואמים את קריטריוני החיפוש/סינון.</p>
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedCategory('');
                  setSelectedLocation('');
                }}
                className="inline-block bg-gray-700 hover:bg-gray-800 text-white font-bold py-2 px-4 rounded-md transition"
              >
                נקה סינון
              </button>
            </div>
          ) : (
            <div className="text-center text-gray-200 text-lg p-6 bg-white bg-opacity-90 rounded-lg shadow-md">
              <p className="mb-4">לא יצרת עדיין אירועים.</p>
              <Link to="/create-event" className="inline-block bg-blue-700 hover:bg-blue-800 text-white font-bold py-2 px-4 rounded-md transition">
                צור את האירוע הראשון שלך
              </Link>
            </div>
          )
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6 mb-10">
            {events.map(event => (
              <div
                key={event.id}
                className="bg-white bg-opacity-95 rounded-3xl shadow-xl overflow-hidden hover:shadow-2xl transition-shadow duration-300 flex flex-col w-full max-w-md mx-auto"
              >
                <img
                  src={event.image || `https://placehold.co/400x200/cccccc/333333?text=${encodeURIComponent(event.title || 'Event Image')}`}
                  alt={event.title}
                  className="w-full h-52 object-cover"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = `https://placehold.co/400x200/cccccc/333333?text=${encodeURIComponent(event.title || 'Event Image')}`;
                  }}
                />
                <div className="p-5 flex-grow flex flex-col">
                  <h4 className="text-xl font-bold text-gray-900 mb-2 truncate">{event.title}</h4>
                  <p className="text-gray-700 text-sm mb-3 line-clamp-3">{event.description}</p>
                  <p className="text-gray-700 text-sm mb-1"><strong>תאריך:</strong> {new Date(event.start_date).toLocaleDateString('he-IL')}</p>
                  <p className="text-gray-700 text-sm mb-1"><strong>מיקום:</strong> {event.location}</p>
                  <p className="text-gray-700 text-sm mb-1">
                    <strong>מחיר:</strong> {event.dynamic_price ? `${event.dynamic_price.toFixed(2)} ₪` : 'N/A'}
                    {event.is_dynamic_price && event.tier_name !== 'Default' && (
                      <span className="text-blue-600 font-semibold ml-1">({event.tier_name})</span>
                    )}
                  </p>
                  <p className={`text-sm font-semibold mt-2 ${event.available_tickets === 0 ? 'text-red-600' : 'text-green-700'}`}>
                    כרטיסים זמינים: {event.available_tickets}
                  </p>
                  <div className="mt-auto flex space-x-3 pt-3">
                    <Link
                      to={`/events/${event.id}`}
                      className="flex-1 text-center bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-3xl"
                    >
                      הצג פרטים
                    </Link>
                    <Link
                      to={`/edit-event/${event.id}`}
                      className="flex-1 text-center bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-2 rounded-3xl"
                    >
                      ערוך
                    </Link>
                    <button
                      onClick={() => handleDeleteEvent(event.id)}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 rounded-3xl"
                    >
                      מחק
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="text-center mt-10">
          <Link
            to="/create-event"
            className="inline-block bg-white text-blue-700 font-bold px-6 py-3 rounded-full shadow hover:bg-gray-100 transition"
          >
            צור אירוע חדש
          </Link>
        </div>

        <ConfirmationDialog
          isOpen={showConfirmDialog}
          title="אישור מחיקת אירוע"
          message="האם אתה בטוח שברצונך למחוק אירוע זה לצמיתות? פעולה זו אינה הפיכה."
          onConfirm={handleConfirmDelete}
          onCancel={handleCancelDelete}
        />
      </div>
    </div>
  );
}

export default MyEvents;