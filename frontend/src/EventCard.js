// src/EventCard.js
import React from 'react';
import { Link } from 'react-router-dom';

function EventCard({ event }) {
  return (
    // עוטפים את ה-div ב-Link
    <Link to={`/events/${event.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
      {/* <--- שינוי כאן: מ-<li> ל-<div> */}
      <div style={{ border: '1px solid #ccc', margin: '0', padding: '10px', borderRadius: '5px', cursor: 'pointer' }}>
        <h3>{event.title}</h3>
        <p>{event.description}</p>
        <p>תאריך: {new Date(event.start_date).toLocaleDateString('en-GB')}</p>
        <p>מיקום: {event.location}</p>
        <p>מחיר: ${parseFloat(event.price).toFixed(2)}</p>
        <p>כרטיסים זמינים: {event.available_tickets}</p>
        <p>התקדמות מכירה: {event.sales_progress_percent}%</p>
        <div style={{ background: '#eee', borderRadius: '5px', overflow: 'hidden', height: '10px', marginBottom: '5px' }}>
         <div
           style={{
             width: `${event.sales_progress_percent}%`,
             height: '10px',
             backgroundColor: 'green'
           }}
          ></div>
        </div>
      </div>
      {/* <--- סוף שינוי */}
    </Link>
  );
}

export default EventCard;