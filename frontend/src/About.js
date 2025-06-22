// src/About.js
import React from 'react';

const About = () => {
  return (
    <div className="bg-white py-12 px-6 md:px-20 min-h-screen text-gray-800">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-4xl font-bold text-blue-700 mb-6 text-center" dir="rtl">
          ברוכים הבאים ל־  EventTicketer 🎟️
        </h1>

        <p className="text-lg text-gray-700 leading-relaxed text-center mb-10">
          EventTicketer נבנה כדי לאפשר חוויה פשוטה, מהירה ונגישה של הזמנת כרטיסים לאירועים.
          בין אם אתם מארגנים, משתתפים או רק סקרנים – אנחנו כאן כדי להפוך את התהליך לחלק ונעים.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          <div className="p-6 bg-gray-50 rounded-xl shadow hover:shadow-md transition">
            <div className="text-blue-500 text-4xl mb-3">📅</div>
            <h3 className="text-xl font-semibold mb-2">ניהול אירועים</h3>
            <p className="text-gray-600">הוספת אירועים, ניהול תמחורים מתקדמים לפי שלבים וכמות, שליטה מלאה – והכול בממשק קל ונוח.</p>
          </div>
          <div className="p-6 bg-gray-50 rounded-xl shadow hover:shadow-md transition">
            <div className="text-green-500 text-4xl mb-3">💺</div>
            <h3 className="text-xl font-semibold mb-2">הזמנת מקומות</h3>
            <p className="text-gray-600">בחרו מושב, צפו בזמינות בזמן אמת, ושמרו את המקום שלכם בלחיצת כפתור.</p>
          </div>
          <div className="p-6 bg-gray-50 rounded-xl shadow hover:shadow-md transition">
            <div className="text-purple-500 text-4xl mb-3">🔐</div>
            <h3 className="text-xl font-semibold mb-2">חוויית משתמש בטוחה</h3>
            <p className="text-gray-600">גישה לחשבון, הזמנות וכרטיסים – הכול מאובטח, עם אפשרות לשחזור סיסמה וניהול פרופיל אישי.</p>
          </div>
        </div>

        <div className="mt-16 text-center">
          <h2 className="text-2xl font-bold mb-4">למה לבחור בנו?</h2>
          <ul className="text-gray-700 text-lg space-y-2">
            <li>✅ חוויית משתמש נגישה וידידותית</li>
            <li>✅ מערכת תמחור חכמה ודינמית</li>
            <li>✅ התאמה אישית לאירועים מכל סוג</li>
            <li>✅ תמיכה בעברית ובאנגלית</li>
          </ul>
        </div>

        <div className="mt-12 text-center">
          <h3 className="text-xl font-semibold mb-4 text-blue-600">מצטרפים למהפכת האירועים הדיגיטליים?</h3>
          <a
            href="/register"
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-md font-semibold shadow hover:bg-blue-700 transition"
          >
            התחילו עכשיו
          </a>
        </div>
      </div>
    </div>
  );
};

export default About;
