// src/contexts/AuthContext.js
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from './ToastContext';

// יצירת הקונטקסט של האימות
const AuthContext = createContext(null);

// הוק מותאם אישית לשימוש בקונטקסט האימות
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    // זרוק שגיאה אם useAuth לא נקרא בתוך AuthProvider
    throw new Error('useAuth חייב לשמש בתוך AuthProvider');
  }
  return context;
};

// קומפוננטת ספק האימות
export const AuthProvider = ({ children }) => {
  // מצב המשתמש הנוכחי (או null אם לא מחובר)
  const [user, setUser] = useState(null);
  // מצב טעינה: true כאשר בודקים אימות, false לאחר מכן
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate(); // הוק לניווט בין דפים
  const { addToast } = useToast(); // קבלת פונקציה להצגת הודעות טוסט

  // כתובת ה-URL הבסיסית של שרת ה-Backend
  const backendUrl = 'http://127.0.0.1:8000';

  // פונקציה מממוזערת לשליפת פרטי המשתמש מהשרת
  // (השתמש ב-useCallback כדי שהפונקציה תהיה יציבה ולא תיווצר מחדש בכל רינדור)
  const fetchUser = useCallback(async (initialLoad = false) => {
    // אם זו לא טעינה ראשונית, וכרגע כבר בטעינה, צא כדי למנוע כפל קריאות.
    // אם זו טעינה ראשונית, תמיד נמשיך.
    if (!initialLoad && loading) {
      return;
    }

    setLoading(true); // הגדר מצב טעינה ל-true עם תחילת הפעולה
    const token = localStorage.getItem('authToken'); // נסה לקבל טוקן אימות

    if (!token) {
      // אם אין טוקן, אין משתמש מאומת, סיים טעינה מיד
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${backendUrl}/api/users/me/`, {
        headers: {
          'Authorization': `Token ${token}`, // שליחת הטוקן בכותרת Authorization
        },
      });

      if (response.ok) {
        // אם התגובה 200 OK (הצלחה)
        const data = await response.json();
        setUser(data); // הגדר את פרטי המשתמש
      } else {
        // אם השרת החזיר שגיאה (לדוגמה: 401 Unauthorized, 403 Forbidden)
        localStorage.removeItem('authToken'); // נקה טוקן לא תקין
        setUser(null); // נקה משתמש
        addToast("אימות משתמש נכשל או פג תוקף. אנא התחבר מחדש.", "error"); // הודעה למשתמש
        navigate('/login'); // הפנה לדף ההתחברות
      }
    } catch (error) {
      // אם הייתה שגיאת רשת (לדוגמה, השרת לא מחובר)
      console.error("שגיאה באחזור פרטי משתמש (בעיית רשת או תקלה לא צפויה).", error);
      setUser(null); // נקה משתמש
      addToast("שגיאת רשת. נכשל באחזור פרטי משתמש.", "error"); // הודעה למשתמש
    } finally {
      // בלוק זה ירוץ תמיד, בין אם הייתה הצלחה או שגיאה
      setLoading(false); // תמיד כבה את מצב הטעינה בסיום התהליך
    }
  }, [loading, setUser, setLoading, addToast, navigate, backendUrl]); // התלויות של fetchUser


  // useEffect ירוץ פעם אחת כאשר הקומפוננטה נטענת, ויבדוק את סטטוס האימות הראשוני
  useEffect(() => {
    // בצע שליפה רק אם זו הפעם הראשונה שה-effect רץ (initialLoad = true)
    // ובדיקת האימות עדיין לא הסתיימה (loading = true)
    if (loading && user === null) {
      fetchUser(true); // קרא לפונקציה עם דגל initialLoad
    }
  }, [fetchUser, loading, user]); // התלויות של useEffect: fetchUser, loading, user

  // פונקציית התחברות לשימוש בקומפוננטות אחרות
  const login = useCallback((token, userData) => {
    localStorage.setItem('authToken', token); // שמור טוקן
    setUser(userData); // הגדר משתמש
    addToast("התחברת בהצלחה!", "success"); // הודעת הצלחה
    setLoading(false); // סיים טעינה בהצלחה
  }, [addToast]); // תלויות

  // פונקציית התנתקות לשימוש בקומפוננטות אחרות
  const logout = useCallback(() => {
    localStorage.removeItem('authToken'); // נקה טוקן
    setUser(null); // נקה משתמש
    addToast('התנתקת בהצלחה.', 'info'); // הודעת התנתקות
    navigate('/login'); // הפנה לדף ההתחברות
    setLoading(false); // סיים טעינה
  }, [addToast, navigate]); // תלויות

  // פונקציה לבדיקת סטטוס אימות מחדש (לשימוש מבחוץ, אם צריך לרענן ידנית)
  const checkAuthStatus = useCallback(() => {
    fetchUser(); // קרא לפונקציה המממוזערת לשליפה
  }, [fetchUser]);

  // הערך של הקונטקסט שיסופק לכל הקומפוננטות הצאצאים
  const authContextValue = {
    user,
    isAuthenticated: !!user, // האם המשתמש מאומת (האם אובייקט המשתמש קיים ולא null)
    loading, // האם מערכת האימות עדיין בטעינה
    login,
    logout,
    checkAuthStatus,
  };

  // רינדור ספק הקונטקסט
  return (
    <AuthContext.Provider value={authContextValue}>
      {children}
    </AuthContext.Provider>
  );
};
