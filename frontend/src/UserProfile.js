// src/UserProfile.js
import React, { useState, useEffect, useCallback } from 'react';
// אין צורך ב-useNavigate כאן, רק אם היית מנווט ישירות מדף הפרופיל,
// אבל הניווט להתחברות כבר מטופל ב-AuthContext אם הסשן פג.
// לכן, נסיר את הייבוא כדי לפשט.
// import { useNavigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext'; // ייבוא ה-hook של ה-Auth
import { useToast } from './contexts/ToastContext'; // ייבוא ה-hook של ה-Toast

function UserProfile() {
  // *** שינוי קריטי 1: קבל את ה-user, loading, isAuthenticated ו-checkAuthStatus ישירות מהקונטקסט ***
  const { user, loading, isAuthenticated, checkAuthStatus } = useAuth();
  const { addToast } = useToast();

  const [isEditing, setIsEditing] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword1, setNewPassword1] = useState('');
  const [newPassword2, setNewPassword2] = useState('');

  // *** שינוי קריטי 2: useEffect יעדכן את ה-state המקומי רק כשה-user מהקונטקסט משתנה ***
  // אין כאן קריאת API עצמאית ל-`/api/users/me/` בטעינה הראשונית!
  useEffect(() => {
    // console.log("UserProfile useEffect: User context updated. Current user:", user);
    if (user) {
      setUsername(user.username || '');
      setEmail(user.email || '');
      setFirstName(user.first_name || '');
      setLastName(user.last_name || '');
    }
  }, [user]); // תלות ב-user: יופעל רק כשאובייקט ה-user מהקונטקסט משתנה

  // אם המשתמש לא מאומת וסיים לטעון, נווט אותו להתחברות
  // בדרך כלל ה-AuthContext כבר מטפל בניווט במקרה של 401/403
  // אבל זו בדיקה נוספת
  if (!loading && !isAuthenticated) {
    // זה כבר אמור לקרות ב-AuthContext דרך navigate('/login')
    // אבל אם מגיעים לכאן בגלל מצב ביניים, ניתן להציג הודעה
    return <div className="p-6 text-center text-lg text-red-600">עליך להיות מחובר כדי לצפות בפרופיל שלך.</div>;
  }

  // טיפול במצב טעינה
  if (loading) {
    return <div className="p-6 text-center text-lg text-gray-700">טוען פרופיל...</div>;
  }

  // אם הגענו לכאן ו-user עדיין null (לדוגמה, אם אין טוקן ולא הצלחנו לאחזר)
  if (!user) {
    return <div className="p-6 text-center text-lg text-gray-700">לא נמצאו פרטי משתמש.</div>;
  }

  const handleEditToggle = () => {
    setIsEditing(!isEditing);
    // כאשר מבטלים עריכה, נחזיר את הנתונים המקוריים מאובייקט ה-user
    if (isEditing && user) {
      setUsername(user.username || '');
      setEmail(user.email || '');
      setFirstName(user.first_name || '');
      setLastName(user.last_name || '');
    }
  };

  const handleSubmitProfileUpdate = async (e) => {
    e.preventDefault();
    addToast('מעדכן פרופיל...', 'info');

    const token = localStorage.getItem('authToken');
    if (!token) {
      addToast("עליך להיות מחובר כדי לעדכן את הפרופיל שלך.", 'error');
      return;
    }

    try {
      // setLoading(true); // כבר מטופל על ידי AuthContext.loading
      const response = await fetch('https://event-planner-backend-kssg.onrender.com/api/users/me/', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${token}`,
        },
        body: JSON.stringify({
          username,
          email,
          first_name: firstName,
          last_name: lastName,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.detail || Object.values(errorData).flat().join('; ') || 'נכשל בעדכון הפרופיל.';
        throw new Error(errorMessage);
      }

      // *** שינוי קריטי 3: קריאה ל-checkAuthStatus מהקונטקסט כדי לרענן את הנתונים הגלובליים ***
      await checkAuthStatus();
      addToast('פרופיל עודכן בהצלחה!', 'success');
      setIsEditing(false);

    } catch (error) {
      console.error('Error updating profile:', error);
      addToast(`שגיאה בעדכון הפרופיל: ${error.message}`, 'error');
    } finally {
      // setLoading(false); // כבר מטופל על ידי AuthContext.loading
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    addToast('משנה סיסמה...', 'info');

    const token = localStorage.getItem('authToken');
    if (!token) {
      addToast('עליך להיות מחובר כדי לשנות סיסמה.', 'error');
      return;
    }

    if (newPassword1 !== newPassword2) {
      addToast('הסיסמאות החדשות אינן תואמות.', 'error');
      return;
    }
    if (!oldPassword || !newPassword1 || !newPassword2) {
      addToast('אנא מלא את כל שדות הסיסמה.', 'error');
      return;
    }

    try {
      const response = await fetch('https://event-planner-backend-kssg.onrender.com/api/users/change-password/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${token}`,
        },
        body: JSON.stringify({
          old_password: oldPassword,
          new_password1: newPassword1,
          new_password2: newPassword2,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        let errorMessage = 'שינוי הסיסמה נכשל. אנא בדוק את הקלט שלך.';
        if (errorData) {
          if (errorData.non_field_errors) {
            errorMessage = errorData.non_field_errors.join('; ');
          } else {
            errorMessage = Object.entries(errorData)
              .map(([field, messages]) => {
                const msg = Array.isArray(messages) ? messages.join(', ') : messages;
                return `${field}: ${msg}`;
              })
              .join('; ');
          }
        }
        throw new Error(errorMessage);
      }

      setOldPassword('');
      setNewPassword1('');
      setNewPassword2('');
      addToast('הסיסמה שונתה בהצלחה!', 'success');
    } catch (err) {
      console.error("שגיאה בשינוי סיסמה:", err);
      addToast(`שגיאה בשינוי סיסמה: ${err.message}`, 'error');
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-8 bg-white rounded-lg shadow-xl my-8">
      <h2 className="text-3xl font-bold mb-6 text-center text-gray-900">הפרופיל שלי</h2>

      {/* User Details Section */}
      <div className="bg-gray-50 p-6 rounded-lg shadow-inner mb-8">
        <h3 className="text-2xl font-bold mb-4 text-gray-800">פרטי משתמש</h3>
        {isEditing ? (
          <form onSubmit={handleSubmitProfileUpdate} className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700">שם משתמש:</label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="mt-1 block w-full p-2 border border-blue-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">אימייל:</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-1 block w-full p-2 border border-blue-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label htmlFor="first_name" className="block text-sm font-medium text-gray-700">שם פרטי:</label>
              <input
                type="text"
                id="first_name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="mt-1 block w-full p-2 border border-blue-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label htmlFor="last_name" className="block text-sm font-medium text-gray-700">שם משפחה:</label>
              <input
                type="text"
                id="last_name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="mt-1 block w-full p-2 border border-blue-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex justify-center space-x-4 mt-6">
              <button
                type="submit"
                className="px-6 py-2 bg-green-600 text-white font-semibold rounded-md shadow-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors duration-200"
                disabled={loading}
              >
                {loading ? 'שומר...' : 'שמור שינויים'}
              </button>
              <button
                type="button"
                onClick={handleEditToggle}
                className="px-6 py-2 bg-gray-400 text-white font-semibold rounded-md shadow-md hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-300 transition-colors duration-200"
                disabled={loading}
              >
                בטל
              </button>
            </div>
          </form>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-lg">
              <div className="font-semibold text-gray-700">שם משתמש:</div>
              <div className="text-gray-900">{user.username}</div>

              <div className="font-semibold text-gray-700">אימייל:</div>
              <div className="text-gray-900">{user.email}</div>

              {user.first_name && (
                <>
                  <div className="font-semibold text-gray-700">שם פרטי:</div>
                  <div className="text-gray-900">{user.first_name}</div>
                </>
              )}

              {user.last_name && (
                <>
                  <div className="font-semibold text-gray-700">שם משפחה:</div>
                  <div className="text-gray-900">{user.last_name}</div>
                </>
              )}

              <div className="font-semibold text-gray-700">הצטרף בתאריך:</div>
              <div className="text-gray-900">{new Date(user.date_joined).toLocaleDateString('en-GB')}</div>

              <div className="font-semibold text-gray-700">סטטוס צוות:</div>
              <div className={`font-bold ${user.is_staff ? 'text-blue-600' : 'text-gray-600'}`}>
                {user.is_staff ? 'כן' : 'לא'}
              </div>
            </div>
            <div className="flex justify-center mt-6">
              <button
                type="button"
                onClick={handleEditToggle}
                className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-md shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
              >
                ערוך פרופיל
              </button>
            </div>
          </>
        )}
      </div>

      {/* Change Password Section */}
      <div className="bg-white p-8 rounded-lg shadow-xl border border-gray-200">
        <h3 className="text-2xl font-bold mb-6 text-gray-800">שנה סיסמה</h3>

        <form onSubmit={handleChangePassword} className="space-y-6">
          {/* Old Password */}
          <div>
            <label htmlFor="old-password" className="block text-sm font-medium text-gray-700 mb-1">סיסמה ישנה:</label>
            <input
              type="password"
              id="old-password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>

          {/* New Password 1 */}
          <div>
            <label htmlFor="new-password1" className="block text-sm font-medium text-gray-700 mb-1">סיסמה חדשה:</label>
            <input
              type="password"
              id="new-password1"
              value={newPassword1}
              onChange={(e) => setNewPassword1(e.target.value)}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>

          {/* New Password 2 */}
          <div>
            <label htmlFor="new-password2" className="block text-sm font-medium text-gray-700 mb-1">אשר סיסמה חדשה:</label>
            <input
              type="password"
              id="new-password2"
              value={newPassword2}
              onChange={(e) => setNewPassword2(e.target.value)}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>

          {/* Submit Button */}
          <div>
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-md shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-200 ease-in-out text-lg"
            >
              שנה סיסמה
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default UserProfile;
