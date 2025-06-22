// src/contexts/ToastContext.js
import React, { createContext, useContext, useState, useCallback, useRef } from 'react'; // <--- נוסף useRef
import ToastNotification from '../components/ToastNotification'; // וודא שהנתיב לקומפוננטה נכון!

// יצירת הקונטקסט
const ToastContext = createContext();

// Hook מותאם אישית לשימוש קל יותר בקונטקסט
export const useToast = () => {
  return useContext(ToastContext);
};

// רכיב ה-Provider שיעטוף את האפליקציה ויספק את פונקציונליות הטוסט
export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const nextIdRef = useRef(0); // <--- שינוי קריטי: nextId מנוהל כ-Ref

  // פונקציה להוספת הודעת טוסט
  // message: תוכן ההודעה
  // type: סוג ההודעה ('success', 'error', 'info')
  const addToast = useCallback((message, type = 'info') => {
    // השתמש ב-nextIdRef.current כדי לקבל את ה-ID הנוכחי ולהגדיל אותו מיד
    const id = nextIdRef.current++;

    setToasts((prevToasts) => [
      ...prevToasts,
      { id, message, type },
    ]);
  }, []); // <--- חשוב: אין תלויות ב-useCallback, מכיוון ש-nextIdRef אינו משתנה.

  // פונקציה להסרת הודעת טוסט
  const removeToast = useCallback((id) => {
    setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      {/* אזור תצוגת הטוסטים - לרוב בפינה קבועה של המסך */}
      <div className="fixed top-4 right-4 z-50 max-w-xs w-full pointer-events-none">
        {toasts.map((toast) => (
          <ToastNotification
            key={toast.id} // המפתח הוא ה-ID הייחודי של הטוסט
            id={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={removeToast}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
};
