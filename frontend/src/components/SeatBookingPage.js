// src/components/SeatBookingPage.js
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useParams, useNavigate } from 'react-router-dom';

// רכיב ספיינר טעינה פשוט
const LoadingSpinner = () => (
  <div className="flex justify-center items-center h-full">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
  </div>
);

function SeatBookingPage() {
  const { eventId: paramEventId } = useParams(); // קבלת eventId מכתובת האתר אם זמין
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState(paramEventId || '');
  const [eventDetails, setEventDetails] = useState(null); // שמירת פרטי אירוע מלאים
  const [seats, setSeats] = useState([]); // כל המקומות לאירוע, עם סטטוס
  const [seatingMap, setSeatingMap] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedSeats, setSelectedSeats] = useState({}); // {seat_id: seat_object} לבחירה ב-Frontend (צהוב)
  const [bookingInProgress, setBookingInProgress] = useState(false); // מצב חדש לתהליך ההזמנה

  const { addToast } = useToast();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const backendUrl = 'https://event-planner-backend-kssg.onrender.com/api';

  // אחזור כל האירועים עבור הרשימה הנפתחת
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${backendUrl}/events/`);
        if (!response.ok) {
          throw new Error(`שגיאת HTTP! סטטוס: ${response.status}`);
        }
        const data = await response.json();
        setEvents(data.results);
      } catch (err) {
        setError('נכשל באחזור אירועים: ' + err.message);
        addToast('נכשל בטעינת אירועים לבחירה: ' + err.message, 'error');
      } finally {
        setLoading(false);
      }
    };
    if (!authLoading && isAuthenticated) {
        fetchEvents();
    }
  }, [backendUrl, addToast, authLoading, isAuthenticated]);

  // אחזור פרטי אירוע, מקומות ומפת ישיבה כאשר selectedEventId משתנה
  const fetchEventAndSeatingData = useCallback(async () => {
    if (!selectedEventId) {
      setEventDetails(null);
      setSeats([]);
      setSeatingMap(null);
      setError('');
      return;
    }

    setLoading(true);
    setError('');
    setSelectedSeats({});

    try {
      const eventResponse = await fetch(`${backendUrl}/events/${selectedEventId}/`);
      if (!eventResponse.ok) {
        throw new Error(`נכשל באחזור אירוע (סטטוס: ${eventResponse.status})`);
      }
      const eventData = await eventResponse.json();
      setEventDetails(eventData);

      const venueId = eventData.venue;

      if (!venueId) {
        setError('לאירוע שנבחר אין אולם משויך.');
        addToast('לאירוע שנבחר אין אולם משויך.', 'error');
        setLoading(false);
        return;
      }

      // Fetch ALL seats for the event (pagination_class = None in SeatViewSet)
      const seatsResponse = await fetch(`${backendUrl}/seats/?event_id=${selectedEventId}`);
      if (!seatsResponse.ok) {
        throw new Error(`נכשל באחזור כיסאות (סטטוס: ${seatsResponse.status})`);
      }
      // Assuming Backend now returns a simple array of seats due to pagination_class = None
      const seatsData = await seatsResponse.json();
      setSeats(seatsData.results || seatsData); // Handle both paginated and non-paginated responses

      // Fetch seating map directly by venue_id
      const seatingMapResponse = await fetch(`${backendUrl}/venues/seating-maps/${venueId}/`);
      if (!seatingMapResponse.ok) {
          throw new Error(`נכשל באחזור מפת ישיבה (סטטוס: ${seatingMapResponse.status})`);
      }
      const seatingMapData = await seatingMapResponse.json();
      setSeatingMap(seatingMapData);


    } catch (err) {
      console.error("שגיאה באחזור אירוע או כיסאות:", err);
      setError('נכשל באחזור נתוני אירוע או כיסאות: ' + err.message);
      addToast('נכשל בטעינת נתוני אירוע או כיסאות: ' + err.message, 'error');
      setEventDetails(null);
      setSeats([]);
      setSeatingMap(null);
    } finally {
      setLoading(false);
    }
  }, [selectedEventId, backendUrl, addToast]);

  useEffect(() => {
    if (!authLoading) {
        if (!isAuthenticated) {
            addToast('עליך להתחבר כדי להזמין כיסאות.', 'error');
            navigate('/login');
        } else {
            fetchEventAndSeatingData();
        }
    }
  }, [authLoading, isAuthenticated, navigate, fetchEventAndSeatingData, addToast]);

  useEffect(() => {
    if (paramEventId && paramEventId !== selectedEventId) {
        setSelectedEventId(paramEventId);
    }
  }, [paramEventId, selectedEventId]);

  const handleSeatClick = (seat) => {
    if (seat.status === 'sold' || (seat.status === 'reserved' && (!user || seat.reserved_by?.id !== user.id))) {
      addToast(`כיסא ${seat.seat_number} בשורה ${seat.row_number} כבר תפוס או שמור על ידי אחר.`, 'warning');
      return;
    }

    setSelectedSeats(prevSelectedSeats => {
      const newSelectedSeats = { ...prevSelectedSeats };
      if (newSelectedSeats[seat.id]) {
        delete newSelectedSeats[seat.id];
      } else {
        if (seat.status === 'available' || (seat.status === 'reserved' && seat.reserved_by?.id === user?.id && seat.is_reserved_active)) {
            newSelectedSeats[seat.id] = seat;
        } else {
            addToast("לא ניתן לבחור כיסא זה כרגע.", 'error');
        }
      }
      return newSelectedSeats;
    });
  };

  const handleBookSelectedSeats = async () => {
    if (Object.keys(selectedSeats).length === 0) {
      addToast("אנא בחר לפחות כיסא אחד כדי לבצע הזמנה.", 'warning');
      return;
    }
    if (!isAuthenticated) {
      addToast("עליך להתחבר כדי להזמין כיסאות.", 'error');
      navigate('/login');
      return;
    }
    const token = localStorage.getItem('authToken');
    if (!token) {
      addToast("אסימון אימות לא נמצא. אנא התחבר מחדש.", 'error');
      navigate('/login');
      return;
    }

    setBookingInProgress(true);
    addToast('מבצע הזמנה עבור הכיסאות הנבחרים...', 'info');

    try {
      const selectedSeatIdsToSend = Object.keys(selectedSeats).map(Number); // Ensure they are numbers
      // *** הוספת DEBUG כאן ***
      console.log('Sending selected seat IDs to backend:', selectedSeatIdsToSend);

      const response = await fetch(`${backendUrl}/tickets/orders/purchase_tickets/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${token}`,
        },
        body: JSON.stringify({
          event_id: selectedEventId,
          quantity: selectedSeatIdsToSend.length,
          selected_seats: selectedSeatIdsToSend,
        }),
      });

      if (!response.ok) {
        let errorData = null;
        let responseText = null;
        try {
            responseText = await response.text();
            const contentType = response.headers.get("content-type");
            if (contentType && contentType.indexOf("application/json") !== -1) {
                errorData = JSON.parse(responseText);
            } else {
                errorData = responseText;
            }
        } catch (e) {
            errorData = responseText || `Error parsing response: ${e.message}`;
        }

        console.error('שגיאת תגובה בהזמנת כיסאות:', errorData);
        let errorMessage = 'הזמנת הכיסאות נכשלה.';

        if (typeof errorData === 'object' && errorData !== null) {
          errorMessage = Object.entries(errorData)
            .map(([field, messages]) => Array.isArray(messages) ? `${field}: ${messages.join(', ')}` : `${field}: ${messages}`)
            .join('; ');
        } else if (typeof errorData === 'string') {
          errorMessage = `שגיאת שרת: ${response.status} - ${errorData.substring(0, 200)}...`;
        }
        addToast(errorMessage, 'error');
        throw new Error(errorMessage);
      }

      const data = await response.json();
      addToast(`הזמנתך בוצעה בהצלחה! מספר הזמנה: ${data.id}`, 'success');

      setSelectedSeats({});
      fetchEventAndSeatingData();

      navigate('/my-orders');

    } catch (err) {
      console.error("שגיאה בהזמנת כיסאות:", err);
      addToast(err.message || 'אירעה שגיאה בלתי צפויה בהזמנת הכיסאות.', 'error');
    } finally {
      setBookingInProgress(false);
    }
  };


  // פונקציה לרנדור מקומות בודדים
  const renderSeat = (seat) => {
    const isSelected = !!selectedSeats[seat.id];
    const isReservedByCurrentUser = user && seat.reserved_by?.id === user.id;

    let seatClass = '';
    let seatTooltip = `כיסא ${seat.seat_number} (${seat.status})`;

    if (isSelected) {
      seatClass = 'bg-yellow-500 hover:bg-yellow-600 cursor-pointer';
      seatTooltip = `כיסא ${seat.seat_number} (נבחר)`;
    } else if (seat.status === 'available') {
      seatClass = 'bg-green-500 hover:bg-green-600 cursor-pointer';
      seatTooltip = `כיסא ${seat.seat_number} (פנוי)`;
    } else if (seat.status === 'reserved') {
      seatClass = 'bg-blue-500 opacity-60';
      if (isReservedByCurrentUser) {
          seatTooltip = `כיסא ${seat.seat_number} (שמור על ידך)`;
      } else {
          seatTooltip = `כיסא ${seat.seat_number} (שמור ע"י אחר)`;
      }
      if (!isReservedByCurrentUser || !seat.is_reserved_active) {
          seatClass += ' cursor-not-allowed';
      } else {
          seatClass += ' cursor-pointer hover:bg-blue-600';
      }
    } else if (seat.status === 'sold') {
      seatClass = 'bg-gray-400 opacity-60 cursor-not-allowed';
      seatTooltip = `כיסא ${seat.seat_number} (נמכר)`;
    }

    const isDisabled = seat.status === 'sold' || (seat.status === 'reserved' && (!isReservedByCurrentUser || !seat.is_reserved_active));

    return (
      <button
        key={seat.id}
        className={`inline-flex items-center justify-center min-w-10 min-h-10 rounded-md text-white font-medium m-1 transition-colors duration-150 ${seatClass}`}
        title={seatTooltip}
        onClick={() => handleSeatClick(seat)}
        disabled={isDisabled || loading || bookingInProgress}
      >
        {seat.seat_number}
      </button>
    );
  };

  // פונקציה לרנדור סקשנים ושורות
  const renderSeatingLayout = () => {
    if (loading || authLoading) return <LoadingSpinner />;

    if (error) return <p className="text-red-500 text-center">{error}</p>;

    if (!isAuthenticated) return <p className="text-red-500 text-center">עליך להיות מחובר כדי לראות את מפת הישיבה.</p>;

    if (!seatingMap || !seatingMap.layout_data || Object.keys(seatingMap.layout_data.sections).length === 0) {
      if (!selectedEventId) return <p className="text-gray-600 text-center">אנא בחר אירוע כדי לראות את מפת הישיבה.</p>;
      return <p className="text-gray-600 text-center">אין נתוני מפת ישיבה זמינים לאולם או לאירוע זה.</p>;
    }

    const sectionsData = seatingMap.layout_data.sections;

    return (
      <div className="flex flex-col items-center p-4 bg-gray-100 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">
          מפת ישיבה עבור {eventDetails?.title || 'אירוע נבחר'}
        </h2>
        {Object.entries(sectionsData).map(([sectionName, sectionDetails]) => (
          <div key={sectionName} className="mb-6 w-full max-w-2xl bg-white p-4 rounded-lg shadow-sm">
            <h3 className="text-xl font-semibold mb-3 text-gray-700 border-b pb-2">{sectionName}</h3>
            {Object.entries(sectionDetails.rows).map(([rowName, seatNumbersInRow]) => (
              <div key={rowName} className="flex items-center mb-2 w-full"> {/* Container for ONE row: label + buttons */}
                <span className="font-medium text-gray-600 w-12 text-right mr-3">שורה {rowName}:</span>
                <div className="flex flex-wrap flex-grow"> {/* Container for seat buttons within this specific row, allowing them to wrap */}
                  {seatNumbersInRow.map(seatNum => {
                    const seat = seats.find(s =>
                      s.section === sectionName &&
                      s.row_number === rowName &&
                      s.seat_number === String(seatNum) // Ensure comparison with string
                    );
                    return seat ? renderSeat(seat) : null;
                  })}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 to-blue-100 p-4 font-sans antialiased">
      <div className="max-w-4xl mx-auto bg-white p-6 rounded-xl shadow-lg my-8">
        <h1 className="text-4xl font-extrabold text-center text-purple-700 mb-8">
          הזמנת מקומות לאירועים
        </h1>

        {/* בחירת אירוע */}
        <div className="mb-8 p-4 bg-purple-50 rounded-lg shadow-inner">
          <label htmlFor="event-select" className="block text-lg font-semibold text-purple-800 mb-2">
            בחר אירוע:
          </label>
          <select
            id="event-select"
            className="w-full p-3 border border-purple-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 transition-colors"
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            disabled={loading || authLoading}
          >
            <option value="">-- בחר אירוע --</option>
            {events.map(event => (
              <option key={event.id} value={event.id}>
                {event.title} - {new Date(event.start_date).toLocaleDateString()} ({event.city_name})
              </option>
            ))}
          </select>
        </div>

        {/* הצגת מפת ישיבה */}
        {renderSeatingLayout()}

        {/* סיכום מקומות נבחרים וכפתור הזמנה */}
        {Object.keys(selectedSeats).length > 0 && (
          <div className="mt-8 bg-blue-50 p-6 rounded-lg shadow-md border border-blue-200">
            <h3 className="text-xl font-semibold mb-3 text-blue-800">כיסאות נבחרים:</h3>
            <ul className="list-disc list-inside mb-4 text-gray-700">
              {Object.values(selectedSeats).map(seat => (
                <li key={seat.id}>
                  סקשן {seat.section}, שורה {seat.row_number}, כיסא {seat.seat_number}
                </li>
              ))}
            </ul>
            <button
              onClick={handleBookSelectedSeats}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-md shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-200 ease-in-out text-lg"
              disabled={loading || bookingInProgress}
            >
              {bookingInProgress ? 'מבצע הזמנה...' : `הזמן כיסאות נבחרים (${Object.keys(selectedSeats).length})`}
            </button>
          </div>
        )}

        {/* מקרא לצבעי כיסאות */}
        <div className="mt-8 p-4 bg-gray-100 rounded-lg shadow-inner flex justify-center space-x-4">
          <div className="flex items-center">
            <span className="inline-block w-6 h-6 bg-green-500 rounded-full mr-2"></span>
            <span className="text-gray-700">פנוי</span>
          </div>
          <div className="flex items-center">
            <span className="inline-block w-6 h-6 bg-yellow-500 rounded-full mr-2"></span>
            <span className="text-gray-700">נבחר על ידך</span>
          </div>
          <div className="flex items-center">
            <span className="inline-block w-6 h-6 bg-blue-500 rounded-full mr-2"></span>
            <span className="text-gray-700">שמור (ע"י מישהו)</span>
          </div>
          <div className="flex items-center">
            <span className="inline-block w-6 h-6 bg-gray-400 rounded-full mr-2"></span>
            <span className="text-gray-700">נמכר</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SeatBookingPage;

