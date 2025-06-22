import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from './contexts/ToastContext';

function EventList({
  events,
  onSearchChange,
  onCategoryChange,
  onLocationChange,
  currentSelectedCategory,
  currentSelectedLocation,
  dynamicCategories,
  dynamicLocations
}) {
  const [localSearchTerm, setLocalSearchTerm] = useState('');
  const debounceTimeoutRef = useRef(null);
  const { addToast } = useToast();

  // Effect לביצוע debounce על localSearchTerm
  useEffect(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    const handler = setTimeout(() => {
      onSearchChange(localSearchTerm);
    }, 500);
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [localSearchTerm, onSearchChange]);

  const handleSearchInputChange = (e) => {
    setLocalSearchTerm(e.target.value);
  };

  const handleCategoryChange = (e) => {
    onCategoryChange(e.target.value);
  };

  const handleLocationChange = (e) => {
    onLocationChange(e.target.value);
  };

   return (
    <div
      className="min-h-screen bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage:
          "url('https://images.unsplash.com/photo-1531058020387-3be344556be6?auto=format&fit=crop&w=1600&q=80')"
      }}
    >
      {/* שכבת כהות מעל התמונה */}
      <div className="min-h-screen bg-blue-900 bg-opacity-80">
        {/* תוכן הדף */}
        <div className="max-w-7xl mx-auto px-4">

          {/* --- קרע עליון (Hero) --- */}
          <section className="text-white text-center py-24">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 drop-shadow-lg" dir="rtl">
              ברוכים הבאים  EventTicketer
            </h1>
            <p className="text-lg md:text-xl mb-6 drop-shadow">
              גלה והזמן כרטיסים לאירועים הקרובים – הופעות, פסטיבלים, תרבות ובידור.
            </p>
            <a
              href="#filters"
              className="inline-block bg-white text-blue-700 font-bold px-6 py-3 rounded-full shadow hover:bg-gray-100 transition"
            >
              חפש אירועים עכשיו
            </a>
          </section>

          {/* --- מסננים וחיפוש --- */}
          <section
            id="filters"
            className="bg-white rounded-2xl shadow-xl p-6 mb-10 border border-gray-200"
          >
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              {/* חיפוש */}
              <div className="relative w-full md:w-1/3">
                <input
                  type="text"
                  placeholder="חפש אירועים לפי שם..."
                  value={localSearchTerm}
                  onChange={handleSearchInputChange}
                  className="p-3 pr-10 border border-gray-300 rounded-xl w-full text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
                <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </span>
              </div>

              {/* קטגוריה + מיקום */}
              <div className="flex flex-col md:flex-row gap-4 w-full md:w-2/3">
                <select
                  value={currentSelectedCategory}
                  onChange={handleCategoryChange}
                  className="p-3 border border-gray-300 rounded-xl w-full text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition bg-white"
                >
                  <option value="">כל הקטגוריות</option>
                  {dynamicCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>

                <select
                  value={currentSelectedLocation}
                  onChange={handleLocationChange}
                  className="p-3 border border-gray-300 rounded-xl w-full text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition bg-white"
                >
                  <option value="">כל המיקומים</option>
                  {dynamicLocations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                </select>
              </div>
            </div>
          </section>

          {/* --- תוצאות --- */}
          <section className="mb-10">
            {events.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-md p-10 text-center text-gray-600 text-xl border border-gray-200">
                <p>😢 לא נמצאו אירועים התואמים את קריטריוני החיפוש שלך.</p>
                <p className="mt-2 text-lg">נסה לשנות את הסינונים או לחפש מונח אחר.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {events.map(event => (
                  <Link to={`/events/${event.id}`} key={event.id} className="block group">
                    <div className="bg-white rounded-2xl shadow-lg hover:shadow-2xl border border-gray-200 transition-all transform hover:-translate-y-1 overflow-hidden">
                      {/* תמונה + תג קטגוריה */}
                      <div className="relative w-full h-48 bg-gray-200">
                        <img
                          src={event.image || 'https://placehold.co/400x200/cccccc/333333?text=Event+Image'}
                          alt={event.title}
                          onError={(e) => { e.target.onerror = null; e.target.src = 'https://placehold.co/400x200/cccccc/333333?text=Event+Image'; }}
                          className="w-full h-full object-cover"
                        />
                        {event.category && (
                          <span className="absolute top-3 right-3 bg-blue-600 text-white text-xs font-semibold px-3 py-1 rounded-full shadow">
                            {event.category}
                          </span>
                        )}
                      </div>

                      {/* מידע */}
                      <div className="p-4">
                        <h3 className="text-xl font-bold text-gray-900 truncate group-hover:text-blue-600 transition">
                          {event.title}
                        </h3>
                        <p className="text-gray-600 text-sm mt-2 flex items-center gap-1">
                          📅 <span className="font-medium">תאריך:</span>{' '}
                          {new Date(event.start_date).toLocaleDateString('he-IL')}
                        </p>
                        <p className="text-gray-600 text-sm flex items-center gap-1">
                          📍 <span className="font-medium">מיקום:</span> {event.location}
                        </p>
                        <p className="text-gray-600 text-sm flex items-center gap-1">
                          ⏰ <span className="font-medium">שעה:</span>{' '}
                          {new Date(event.start_date).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                        </p>

                        {/* מחיר ומדד מכירה */}
                        <div className="mt-4">
                          <p className="text-lg font-bold text-blue-600">
                            {event.dynamic_price ? `${event.dynamic_price.toFixed(2)} ₪` : 'N/A'}
                            {event.is_dynamic_price && event.tier_name !== 'Default' && (
                              <span className="text-sm font-medium text-gray-600 ml-2">({event.tier_name})</span>
                            )}
                          </p>
                          <p className="text-sm text-gray-600 mt-1">
                            כרטיסים זמינים: <strong>{event.available_tickets}</strong>
                          </p>
                          <div className="w-full bg-gray-200 rounded-full h-2.5 mt-1">
                            <div
                              className="bg-green-500 h-2.5 rounded-full"
                              style={{ width: `${event.sales_progress_percent}%` }}
                            ></div>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            התקדמות מכירה: {event.sales_progress_percent}%
                          </p>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

        </div>{/* max-w wrapper */}
      </div>{/* overlay */}
    </div>   /* background */
  );
}

export default EventList;





