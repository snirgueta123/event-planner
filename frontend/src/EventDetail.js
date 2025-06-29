// src/EventDetail.js
import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useToast } from './contexts/ToastContext';
import { useAuth } from './contexts/AuthContext'; // ייבוא useAuth כדי לבדוק אם המשתמש מחובר

function EventDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { isAuthenticated } = useAuth(); // שימוש ב-useAuth

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [currentDynamicPrice, setCurrentDynamicPrice] = useState(null); // מצב חדש למחיר הדינמי
  const [currentTierName, setCurrentTierName] = useState("Default"); // מצב חדש לשם שכבת התמחור

  // פונקציה לאחזור פרטי אירוע
  const fetchEventDetails = useCallback(async () => {
    try {
      setLoading(true);
      // addToast('טוען פרטי אירוע...', 'info'); // הסרנו, נשתמש בזה לטעינת המחיר הדינמי

      const token = localStorage.getItem('authToken');
      const headers = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Token ${token}`;
      }

      const response = await fetch(`https://event-planner-backend-kssg.onrender.com/api/events/${id}/`, { headers });
      if (!response.ok) {
        if (response.status === 404) {
          addToast("אירוע לא נמצא.", 'error');
        } else {
          throw new Error(`שגיאת HTTP! סטטוס: ${response.status}`);
        }
        setEvent(null); // וודא שהאירוע מאופס אם לא נמצא
      } else {
        const data = await response.json();
        setEvent(data);
      }
    } catch (err) {
      console.error("נכשל בטעינת פרטי האירוע:", err);
      addToast(err.message || "אירעה שגיאה בלתי צפויה בטעינת האירוע.", 'error');
    } finally {
      setLoading(false);
    }
  }, [id, addToast]);

  // פונקציה לאחזור המחיר הדינמי של האירוע
  const fetchDynamicPrice = useCallback(async () => {
    if (!event) return; // ודא שאובייקט האירוע קיים לפני שמנסים לאחזר מחיר דינמי

    try {
      // addToast('טוען מחיר עדכני...', 'info'); // אופציונלי: טוסט לטעינת מחיר

      const response = await fetch(`https://event-planner-backend-kssg.onrender.com/api/events/${event.id}/current-price/`);
      if (!response.ok) {
        throw new Error(`Failed to fetch dynamic price. Status: ${response.status}`);
      }
      const data = await response.json();
      setCurrentDynamicPrice(parseFloat(data.price).toFixed(2));
      setCurrentTierName(data.tier_name);
    } catch (error) {
      console.error("Error fetching dynamic price:", error);
      addToast("נכשל בטעינת המחיר הדינמי של האירוע.", "error");
      // במקרה של כשל, נחזור למחיר הסטטי של האירוע
      if (event && event.price) {
        setCurrentDynamicPrice(parseFloat(event.price).toFixed(2));
        setCurrentTierName("Default");
      }
    }
  }, [event, addToast]); // תלוי באובייקט האירוע

  // useEffect ראשון: טוען את פרטי האירוע
  useEffect(() => {
    fetchEventDetails();
  }, [fetchEventDetails]);

  // useEffect שני: טוען את המחיר הדינמי לאחר שפרטי האירוע נטענו
  useEffect(() => {
    if (event) { // וודא שפרטי האירוע נטענו בהצלחה
      fetchDynamicPrice();
    }
  }, [event, fetchDynamicPrice]);


  const handlePurchase = async () => {
    if (!isAuthenticated) {
      addToast("עליך להיות מחובר כדי לרכוש כרטיסים.", 'error');
      navigate('/login');
      return;
    }
    if (!event) {
        addToast("אירוע אינו זמין לרכישה.", 'error');
        return;
    }
    if (quantity <= 0) {
      addToast("אנא הזן כמות חוקית של כרטיסים.", 'error');
      return;
    }
    // הבדיקה הזו תהיה יותר מחמירה ב-Backend עם ה-refresh_from_db() והטרנזקציה
    // אבל עדיין כדאי לתת משוב מהיר ב-Frontend
    if (event && quantity > event.available_tickets) {
        addToast("אין מספיק כרטיסים זמינים כרגע. אנא נסה כמות קטנה יותר.", 'error');
        return;
    }

    addToast('מבצע רכישה...', 'info');

    const token = localStorage.getItem('authToken');

    try {
      const response = await fetch('https://event-planner-backend-kssg.onrender.com/api/tickets/orders/purchase_tickets/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${token}`,
        },
        body: JSON.stringify({
          event_id: id,
          quantity: quantity,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        let errorMessage = 'רכישת כרטיסים נכשלה.';
        if (errorData) {
          // נסו לפרסר הודעות שגיאה מפורטות מה-Backend
          errorMessage = Object.entries(errorData)
            .map(([field, messages]) => {
                const fieldName = {
                    'non_field_errors': 'שגיאה כללית',
                    'quantity': 'כמות',
                    'event_id': 'מזהה אירוע'
                    // הוסף שמות שדות נוספים כאן אם יש צורך
                }[field] || field; // השתמש בשם קריא או בשם השדה המקורי
                return Array.isArray(messages) ? `${fieldName}: ${messages.join(', ')}` : `${fieldName}: ${messages}`;
            })
            .join('; ');
        }
        addToast(errorMessage, 'error');
        throw new Error(errorMessage);
      }

      const data = await response.json();
      addToast(`רכישת ${data.quantity} כרטיסים ל"${event.title}" בוצעה בהצלחה!`, 'success');

      // עדכן את כמות הכרטיסים הזמינים והמחיר הדינמי באופן מקומי לאחר רכישה מוצלחת
      setEvent(prevEvent => ({
        ...prevEvent,
        available_tickets: prevEvent.available_tickets - quantity
      }));
      setQuantity(1); // אפס את כמות הרכישה
      fetchDynamicPrice(); // טען מחדש את המחיר הדינמי, אולי עברנו שכבה!

    } catch (err) {
      console.error("שגיאה ברכישת כרטיסים:", err);
      // מונע הודעות כפולות אם השגיאה כבר טופלה בבלוק ה-if (!response.ok)
      if (!err.message.includes('רכישת כרטיסים נכשלה')) {
        addToast(err.message || 'אירעה שגיאה בלתי צפויה ברכישה.', 'error');
      }
    }
  };

  if (loading) {
    return <div className="p-6 text-center text-lg text-gray-700">טוען פרטי אירוע...</div>;
  }

  if (!event) {
    return <div className="p-6 text-center text-lg text-gray-700">לא נמצאו פרטים עבור אירוע זה.</div>;
  }

  const isSoldOut = event.available_tickets === 0;

  return (
    <div className="container mx-auto p-4 md:p-8 bg-white rounded-lg shadow-xl my-8">
      {/* כפתור חזרה לדף הבית */}
      <Link to="/" className="inline-block bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-md transition duration-150 ease-in-out mb-6">
        &larr; חזור לאירועים
      </Link>
      <h2 className="text-4xl font-extrabold mb-6 text-center text-gray-900">{event.title}</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* תמונת אירוע */}
        <div className="lg:order-2">
          <img
            src={event.image || `https://placehold.co/600x400/add8e6/000000?text=${encodeURIComponent(event.title || 'Event Image')}`}
            alt={event.title}
            className="w-full h-auto rounded-lg shadow-md object-cover"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = `https://placehold.co/600x400/add8e6/000000?text=${encodeURIComponent(event.title || 'Event Image')}`;
            }}
          />
        </div>

        {/* פרטי אירוע */}
        <div className="lg:order-1 flex flex-col justify-between">
          <div>
            <p className="text-gray-700 mb-4 text-base leading-relaxed">{event.description}</p>
            <p className="text-gray-800 text-lg mb-2"><strong className="font-semibold">תאריך התחלה:</strong> {new Date(event.start_date).toLocaleDateString('he-IL', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}</p>
            {event.end_date && (
                <p className="text-gray-800 text-lg mb-2"><strong className="font-semibold">תאריך סיום:</strong> {new Date(event.end_date).toLocaleDateString('he-IL', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                })}</p>
            )}
            <p className="text-gray-800 text-lg mb-2"><strong className="font-semibold">מיקום:</strong> {event.location}</p>
            <p className="text-gray-800 text-lg mb-2"><strong className="font-semibold">קטגוריה:</strong> {event.category}</p>

            {/* הצגת מחיר דינמי */}
            <p className="text-gray-800 text-lg mb-2">
                <strong className="font-semibold">מחיר לכרטיס:</strong>{' '}
                {currentDynamicPrice !== null ? (
                    <>
                        {currentDynamicPrice} ₪
                        {currentTierName !== "Default" && <span className="text-sm text-gray-500"> ({currentTierName})</span>}
                    </>
                ) : (
                    `טוען מחיר...`
                )}
            </p>

            <p className="text-gray-800 text-lg mb-4">
              <strong className="font-semibold">כרטיסים זמינים:</strong>{' '}
              <span className={`font-bold ${isSoldOut ? 'text-red-600' : 'text-green-600'}`}>
                {event.available_tickets}
              </span>
            </p>
          </div>

          {/* קטע רכישה */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            {isSoldOut ? (
              <p className="text-red-600 font-bold text-xl text-center">אזלו הכרטיסים!</p>
            ) : (
              <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
                <label htmlFor="quantity" className="sr-only">כמות כרטיסים:</label>
                <input
                  type="number"
                  id="quantity"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  min="1"
                  max={event.available_tickets}
                  className="w-full sm:w-24 p-2 border border-gray-300 rounded-md shadow-sm text-center focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
                <button
                  onClick={handlePurchase}
                  className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-md shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-200 ease-in-out text-lg"
                >
                  רכישת כרטיסים
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default EventDetail;
