// src/EditEvent.js
import React, { useState, useEffect, useCallback } from 'react'; // ייבוא useCallback
import { useParams, useNavigate } from 'react-router-dom';
import { useToast } from './contexts/ToastContext'; // Import the useToast hook

function EditEvent() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState('');
  const [price, setPrice] = useState('');
  const [availableTickets, setAvailableTickets] = useState('');
  const [currentImage, setCurrentImage] = useState(''); // State to display current image
  const [newImage, setNewImage] = useState(null); // State for new image upload

  const [dynamicCategories, setDynamicCategories] = useState([]); // <--- חדש: מצב עבור קטגוריות דינמיות
  const [dynamicLocations, setDynamicLocations] = useState([]);   // <--- חדש: מצב עבור מיקומים דינמיים
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);


  // <--- חדש: פונקציות useCallback לטעינת קטגוריות ומיקומים --->
  const fetchCategories = useCallback(async () => {
    try {
      const response = await fetch('http://127.0.0.1:8000/api/events/categories/');
      if (!response.ok) {
        throw new Error('Failed to fetch categories');
      }
      const data = await response.json();
      setDynamicCategories(data.sort());
    } catch (error) {
      console.error("Error fetching categories for EditEvent:", error);
      addToast("נכשל בטעינת קטגוריות עבור טופס האירוע.", "error");
    }
  }, [addToast]);

  const fetchLocations = useCallback(async () => {
    try {
      const response = await fetch('http://127.0.0.1:8000/api/events/locations/');
      if (!response.ok) {
        throw new Error('Failed to fetch locations');
      }
      const data = await response.json();
      setDynamicLocations(data.sort());
    } catch (error) {
      console.error("Error fetching locations for EditEvent:", error);
      addToast("נכשל בטעינת מיקומים עבור טופס האירוע.", "error");
    }
  }, [addToast]);
  // <--------------------------------------------------->

  // Effect לטעינת פרטי האירוע, קטגוריות ומיקומים
  useEffect(() => {
    const fetchEventData = async () => {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('authToken');
      if (!token) {
        addToast("עליך להתחבר כדי לערוך אירוע.", 'error');
        navigate('/login');
        setLoading(false);
        return;
      }

      try {
        await fetchCategories(); // טען קטגוריות לפני טעינת האירוע
        await fetchLocations();   // טען מיקומים לפני טעינת האירוע

        const response = await fetch(`http://127.0.0.1:8000/api/events/${id}/`, {
          headers: {
            'Authorization': `Token ${token}`,
          },
        });

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error("אירוע לא נמצא או שאין לך הרשאה לגשת אליו.");
          }
          throw new Error('נכשל בטעינת פרטי האירוע.');
        }

        const data = await response.json();
        setTitle(data.title);
        setDescription(data.description);
        // Format dates to fit datetime-local input
        setStartDate(data.start_date ? new Date(data.start_date).toISOString().slice(0, 16) : '');
        setEndDate(data.end_date ? new Date(data.end_date).toISOString().slice(0, 16) : '');
        setLocation(data.location);
        setCategory(data.category);
        setPrice(data.price);
        setAvailableTickets(data.available_tickets);
        setCurrentImage(data.image); // Store current image URL
      } catch (err) {
        setError(err.message);
        addToast(err.message, 'error');
        console.error("Error fetching event:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchEventData();
  }, [id, navigate, addToast, fetchCategories, fetchLocations]); // <--- הוספנו תלויות לפונקציות הממוזזות

  const handleSubmit = async (e) => {
    e.preventDefault();
    addToast('מעדכן אירוע...', 'info');

    // Basic client-side validation
    if (!title || !description || !startDate || !location || !category || !price || !availableTickets) {
      addToast("אנא מלא את כל השדות הנדרשים.", 'error');
      return;
    }
    if (new Date(startDate) < new Date()) {
        addToast("תאריך התחלה אינו יכול להיות בעבר.", 'error');
        return;
    }
    if (endDate && new Date(endDate) < new Date(startDate)) {
        addToast("תאריך סיום אינו יכול להיות לפני תאריך התחלה.", 'error');
        return;
    }
    if (parseFloat(price) < 0) {
        addToast("מחיר אינו יכול להיות שלילי.", 'error');
        return;
    }
    if (parseInt(availableTickets) <= 0) {
        addToast("מספר הכרטיסים הזמינים חייב להיות לפחות 1.", 'error');
        return;
    }

    const token = localStorage.getItem('authToken');
    if (!token) {
      addToast("עליך להתחבר כדי לערוך אירוע.", 'error');
      navigate('/login');
      return;
    }

    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', description);
    formData.append('start_date', startDate);
    if (endDate) {
      formData.append('end_date', endDate);
    }
    formData.append('location', location);
    formData.append('category', category);
    formData.append('price', price);
    formData.append('available_tickets', availableTickets);
    // Only append new image if selected
    if (newImage) {
      formData.append('image', newImage);
    } else if (currentImage && !currentImage.startsWith('http')) {
        // If currentImage exists and is not a URL (meaning it's from previous data without a real URL),
        // we might need to handle it or ensure backend doesn't expect it if no new image.
        // For now, if no new image, we just don't send the 'image' field for update,
        // relying on the backend to keep the existing one if not provided.
    }

    try {
      const response = await fetch(`http://127.0.0.1:8000/api/events/${id}/`, {
        method: 'PUT', // or 'PATCH' depending on API design
        headers: {
          'Authorization': `Token ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        let errorMessage = 'עדכון אירוע נכשל.';
        if (errorData) {
            errorMessage = Object.entries(errorData)
              .map(([field, messages]) => Array.isArray(messages) ? `${field}: ${messages.join(', ')}` : `${field}: ${messages}`)
              .join('; ');
          }
        addToast(errorMessage, 'error');
        throw new Error(errorMessage);
      }

      const data = await response.json();
      addToast(`אירוע "${data.title}" עודכן בהצלחה!`, 'success');

      setTimeout(() => {
        navigate('/my-events', { state: { refreshEvents: true } });
      }, 2000);

    } catch (err) {
      console.error("Error updating event:", err);
      if (!err.message.includes('עדכון אירוע נכשל')) { // Prevent duplicate toasts if message is already specific
        addToast(err.message || 'אירעה שגיאה בלתי צפויה.', 'error');
      }
    }
  };

  if (loading) {
    return <div className="text-center text-gray-600 text-xl mt-8">טוען אירוע...</div>;
  }

  if (error) {
    return <div className="text-center text-red-600 text-xl mt-8">שגיאה: {error}</div>;
  }

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <h2 className="text-3xl font-bold mb-6 text-center text-gray-900">Edit Event</h2>

      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-lg shadow-xl space-y-6">
        {/* Title */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">Title:</label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">Description:</label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            rows="4"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          ></textarea>
        </div>

        {/* Start Date */}
        <div>
          <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">Start Date:</label>
          <input
            type="datetime-local"
            id="startDate"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>

        {/* End Date (Optional) */}
        <div>
          <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">End Date (Optional):</label>
          <input
            type="datetime-local"
            id="endDate"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>

        {/* Location (בחירה דינמית) */}
        <div>
          <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">Location:</label>
          <select
            id="location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            required
            className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          >
            <option value="">Select a location</option>
            {dynamicLocations.map(loc => <option key={loc} value={loc}>{loc}</option>)} {/* שימוש במיקומים דינמיים */}
            <option value="אחר">אחר (יש לציין מיקום מלא בתיאור האירוע)</option> {/* אפשרות "אחר" */}
          </select>
        </div>

        {/* Category (בחירה דינמית) */}
        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">Category:</label>
          <select
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            required
            className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          >
            <option value="">Select a category</option>
            {dynamicCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)} {/* שימוש בקטגוריות דינמיות */}
            <option value="Other">Other</option> {/* אפשרות "אחר" */}
          </select>
        </div>

        {/* Price */}
        <div>
          <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">Price ($):</label>
          <input
            type="number"
            id="price"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
            min="0"
            step="0.01"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>

        {/* Available Tickets */}
        <div>
          <label htmlFor="availableTickets" className="block text-sm font-medium text-gray-700 mb-1">Available Tickets:</label>
          <input
            type="number"
            id="availableTickets"
            value={availableTickets}
            onChange={(e) => setAvailableTickets(e.target.value)}
            required
            min="1"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>

        {/* Current Event Image */}
        {currentImage && (
          <div className="flex flex-col items-center">
            <label className="block text-sm font-medium text-gray-700 mb-2">Current Event Image:</label>
            <img
              src={currentImage}
              alt="Current Event"
              className="w-48 h-auto rounded-lg shadow-md mb-4"
              onError={(e) => { e.target.onerror = null; e.target.src = `https://placehold.co/192x108/cccccc/333333?text=No+Image`; }}
            />
          </div>
        )}

        {/* New Event Image */}
        <div>
          <label htmlFor="newImage" className="block text-sm font-medium text-gray-700 mb-1">Change Image (Optional):</label>
          <input
            type="file"
            id="newImage"
            accept="image/*"
            onChange={(e) => setNewImage(e.target.files[0])}
            className="mt-1 block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none focus:border-blue-500 focus:ring-blue-500"
          />
          <p className="mt-1 text-sm text-gray-500">JPG, PNG, GIF (Max 5MB). ישאיר את התמונה הנוכחית אם לא נבחרה תמונה חדשה.</p>
        </div>

        {/* Submit Button */}
        <div>
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-md shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-200 ease-in-out text-lg"
          >
            Update Event
          </button>
        </div>
      </form>
    </div>
  );
}

export default EditEvent;


