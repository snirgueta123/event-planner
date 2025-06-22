import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { useToast } from './contexts/ToastContext';

const LoadingSpinner = () => (
  <div className="flex justify-center items-center h-full">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
  </div>
);

function TicketDetail() {
  const { id } = useParams(); // כאן id הוא מזהה ההזמנה (order_id)
  const navigate = useNavigate();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { addToast } = useToast();

  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const hasFetched = useRef(false);

  const addQrImagesToTickets = async (tickets, token) => {
    return await Promise.all(
      tickets.map(async (ticket) => {
        try {
          const response = await fetch(`http://127.0.0.1:8000/api/tickets/${ticket.id}/qr/`, {
            headers: {
              Authorization: `Token ${token}`,
            },
          });

          if (!response.ok) throw new Error('QR fetch failed');
          const blob = await response.blob();
          const qrImageUrl = URL.createObjectURL(blob);

          return { ...ticket, qrImage: qrImageUrl };
        } catch (err) {
          console.warn(`❌ שגיאה ב־QR של כרטיס ${ticket.id}`);
          return { ...ticket, qrImage: null };
        }
      })
    );
  };

  useEffect(() => {
    if (hasFetched.current || authLoading) return;
    hasFetched.current = true;

    const fetchTickets = async () => {
      try {
        const token = localStorage.getItem('authToken');
        if (!token) {
          navigate('/login');
          return;
        }

        // שים לב לכתובת כאן - קוראים לפי מזהה הזמנה
        const response = await fetch(`http://127.0.0.1:8000/api/tickets/by_order/${id}/`, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Token ${token}`,
          },
        });

        if (!response.ok) {
          setError("שגיאה בטעינת הכרטיסים.");
          return;
        }

        const data = await response.json();

        // data מכיל כבר רק את הכרטיסים של ההזמנה
        if (!data.length) {
          setError("לא נמצאו כרטיסים להזמנה זו.");
          return;
        }
        const ticketsWithQR = await addQrImagesToTickets(data, token);
        setTickets(ticketsWithQR);

      } catch (err) {
        setError("שגיאה בעת טעינת הנתונים.");
      } finally {
        setLoading(false);
      }
    };

    fetchTickets();
  }, [authLoading, id, isAuthenticated, navigate]);

  if (authLoading || loading) return <LoadingSpinner />;
  if (error) return <div className="p-6 text-center text-lg text-red-700">שגיאה: {error}</div>;
  if (!tickets.length) return <div className="p-6 text-center text-lg text-gray-700">לא נמצאו כרטיסים.</div>;

  const eventDetails = tickets[0].event_details;

  return (
    <div className="container mx-auto p-4 md:p-8 bg-white rounded-lg shadow-xl my-8 space-y-8">
      <div className="bg-gray-50 p-6 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold mb-4 text-gray-800">🎫 הכרטיסים להזמנה</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {tickets.map((ticket) => (
            <div key={ticket.id} className="border p-4 rounded shadow-sm bg-white">
              <p><strong>מזהה כרטיס:</strong> #{ticket.id}</p>
              <p><strong>קוד:</strong> {ticket.ticket_code}</p>
              <p><strong>מחיר:</strong> ₪{ticket.price}</p>
              <p><strong>שומש:</strong> {ticket.is_scanned ? '✅ כן' : '❌ לא'}</p>
              <p><strong>מושב:</strong> {ticket.seat_assigned || 'לא מוקצה'}</p>
              {ticket.qrImage ? (
                <a href={ticket.qrImage} download={`ticket_${ticket.id}_qr.png`}>
                   <img src={ticket.qrImage} alt="QR Code" className="w-48 h-48 mx-auto cursor-pointer hover:opacity-80" />
                </a>
              ) : (
                <div className="text-center text-gray-500">QR לא זמין</div>
              )}

              <p className="text-center text-sm mt-2">הצג קוד זה בכניסה לאירוע</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-gray-50 p-6 rounded-lg shadow-md">
        <h3 className="text-xl font-bold mb-4 text-gray-800">🎉 פרטי האירוע</h3>
        <p><strong>כותרת:</strong> {eventDetails?.title}</p>
        <p><strong>תיאור:</strong> {eventDetails?.description}</p>
        <p><strong>מיקום:</strong> {eventDetails?.location || 'לא זמין'}</p>
        <p><strong>עיר:</strong> {eventDetails?.city_name}</p>
        <p><strong>קטגוריה:</strong> {eventDetails?.category}</p>
        <p><strong>תאריך התחלה:</strong> {new Date(eventDetails?.start_date).toLocaleString()}</p>
      </div>

      <div className="bg-gray-50 p-6 rounded-lg shadow-md">
        <h3 className="text-xl font-bold mb-4 text-gray-800">🏛️ פרטי המקום</h3>
        <p><strong>שם:</strong> {eventDetails?.venue_detail?.name}</p>
        <p><strong>כתובת:</strong> {eventDetails?.venue_detail?.address}</p>
        <p><strong>עיר:</strong> {eventDetails?.venue_detail?.city}</p>
        <p><strong>מדינה:</strong> {eventDetails?.venue_detail?.country}</p>
      </div>
      <button
  onClick={() => navigate('/my-orders')}
  className="mt-6 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
>
  חזרה להזמנות שלי
</button>
    </div>

  );
}

export default TicketDetail;
