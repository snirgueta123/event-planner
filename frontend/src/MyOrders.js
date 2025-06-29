// src/MyOrders.js
import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { useToast } from './contexts/ToastContext';

function MyOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { user, isAuthenticated, loading: authLoading } = useAuth(); // <--- שינוי: הוספנו authLoading
  const { addToast } = useToast();

  const fetchMyOrders = useCallback(async () => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      setError("עליך להיות מחובר כדי לצפות בהזמנות שלך.");
      setLoading(false); // וודא ש-loading של הקומפוננטה משתנה
      // אין צורך לנווט כאן ל-login, ה-useEffect החיצוני יטפל בזה
      return;
    }

    try {
      setLoading(true); // מתחיל טעינה
      setError(null);
      const response = await fetch('https://event-planner-backend-kssg.onrender.com/api/tickets/orders/', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          setError("הסשן פג או שאינך מורשה. אנא התחבר שוב.");
          localStorage.removeItem('authToken');
          // אין צורך לנווט כאן ל-login, ה-useEffect החיצוני יטפל בזה
          addToast("הסשן פג או שאינך מורשה. אנא התחבר שוב.", "error");
          return;
        }
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      setOrders(data.results);
    } catch (err) {
      console.error("נכשל בטעינת ההזמנות שלי:", err);
      setError(err.message || "אירעה שגיאה בלתי צפויה בטעינת ההזמנות.");
      addToast(err.message || "אירעה שגיאה בלתי צפויה בטעינת ההזמנות.", "error");
    } finally {
      setLoading(false); // מסיים טעינה
    }
  }, [addToast]); // <--- חשוב: navigate הוסר גם מתלויות fetchMyOrders כדי למנוע טריגרים מיותרים

  useEffect(() => {
    // טען הזמנות רק אם המשתמש מאומת ונתוני המשתמש נטענו (authLoading הסתיים)
    // וודא ש-authLoading הוא false (הטעינה הראשונית של המשתמש הסתיימה)
    if (!authLoading) { // רק כאשר טעינת האותנטיקציה הסתיימה
        if (isAuthenticated && user !== null) {
            fetchMyOrders();
        } else {
            // אם לא מאומת לאחר שהטעינה הסתיימה, נווט להתחברות
            navigate('/login');
        }
    }
  }, [fetchMyOrders, isAuthenticated, user, authLoading, navigate]); // <--- חשוב: "loading" הוסר, "authLoading" נוסף


  const handleDeleteOrder = useCallback(async (orderId) => {
    if (!window.confirm("האם אתה בטוח שברצונך למחוק הזמנה זו? פעולה זו בלתי הפיכה.")) {
      return;
    }

    addToast('מוחק הזמנה...', 'info');
    const token = localStorage.getItem('authToken');

    try {
      const response = await fetch(`https://event-planner-backend-kssg.onrender.com/api/tickets/orders/${orderId}/`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Token ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 403) {
          addToast("אין לך הרשאה למחוק הזמנה זו.", 'error');
        } else if (response.status === 404) {
          addToast("הזמנה לא נמצאה.", 'error');
        } else {
          addToast("שגיאה במחיקת ההזמנה.", 'error');
        }
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      addToast("ההזמנה נמחקה בהצלחה!", 'success');
      setOrders(prevOrders => prevOrders.filter(order => order.id !== orderId));
    } catch (err) {
      console.error("שגיאה במחיקת הזמנה:", err);
    }
  }, [addToast]);


  // הצג "טוען את ההזמנות שלך..." בזמן טעינת אימות או טעינת הזמנות
  if (authLoading || loading) {
    return <div className="p-6 text-center text-lg text-gray-700">טוען את ההזמנות שלך...</div>;
  }

  // לאחר שסיימנו לטעון את האותנטיקציה, אם המשתמש לא מאומת, הוא ינותב על ידי ה-useEffect
  // אין צורך בבדיקה נוספת כאן.

  if (error) {
    return <div className="p-6 text-center text-lg text-red-600">שגיאה: {error}</div>;
  }

  const isAdmin = user && (user.is_staff || user.is_superuser);


  return (
    <div className="container mx-auto p-4">
      <h2 className="text-3xl font-bold mb-6 text-center text-gray-900">My Orders</h2>

      {orders.length === 0 ? (
        <div className="text-center text-gray-600 text-lg p-6 bg-white rounded-lg shadow-md">
          <p className="mb-4">עדיין לא ביצעת הזמנות.</p>
          <Link to="/" className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition duration-150 ease-in-out">
            מצא אירועים עכשיו!
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Order ID
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Event Title
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Price
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Order Date
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                    {isAdmin && (
                      <span className="sr-only">Delete</span>
                    )}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {orders.map(order => (
                  <tr key={order.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {order.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {order.tickets && order.tickets.length > 0 && order.tickets[0].event_details
                        ? order.tickets[0].event_details.title
                        : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {order.quantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      ${parseFloat(order.total_amount).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {new Date(order.ordered_at).toLocaleDateString('en-GB')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium flex items-center justify-end space-x-2">
                      {order.tickets && order.tickets.length > 0 ? (
                        <Link
                            to={`/orders/${order.id}/tickets`}
                            className="text-blue-600 hover:text-blue-900"
                        >
                            View Tickets
                        </Link>
                      ) : (
                        <span className="text-gray-500">N/A</span>
                      )}
                      {isAdmin && (
                        <button
                          onClick={() => handleDeleteOrder(order.id)}
                          className="ml-4 text-red-600 hover:text-red-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 rounded-md py-1 px-2 transition duration-150 ease-in-out"
                          title="מחק הזמנה"
                        >
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm6 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd"></path>
                          </svg>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default MyOrders;
