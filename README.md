# 🎉 Event Planner

**Event Planner** is a **smart, comprehensive platform** designed for **seamless event management**.  
This application centralizes the entire event workflow, transforming complex planning into an efficient, enjoyable experience.  

From **creating and promoting events**, to **managing tickets and seating arrangements**, handling **user authentication and permissions**, and providing **real-time updates and notifications** – Event Planner consolidates all essential tools into one intuitive platform.

## 🚀 Key Features

- 🎫 **Comprehensive Event Creation**  
  Intuitive interface for setting up events with all necessary details.

- 🪑 **Advanced Ticketing & Seat Management**  
  Dynamic ticket generation, flexible pricing mechanisms (including planned dynamic pricing), and interactive seating arrangements.

- 🔐 **Robust User & Permission Management**  
  Secure user authentication (Token-based), with distinct roles for staff (organizers) and regular users.

- 💬 **Real-time Communication**  
  Integrated toast notifications for immediate feedback and email functionality for password resets.

- 📊 **Efficient Data Handling**  
  Pagination for large datasets, advanced filtering options, and complex data relationships (events, tickets, users, venues).

- 🔗 **Secure API Interactions**  
  Backend built with Django REST Framework, ensuring secure and efficient data exchange with the frontend via Token Authentication and CORS middleware.

---

🛠️ Technologies & Stack  
Backend: Django 4.x, Django REST Framework, PostgreSQL (planned for production), SQLite (default for development), Token Authentication, CORS Middleware, Custom User Model (`users.User`), Email Backend configured for Gmail SMTP.  
Frontend: React 19.x, React Router DOM, Tailwind CSS, Context API (`AuthContext`, `ToastContext`).  

📁 Project Structure  
/PythonProjects  
├── frontend/                     # React application  
│   ├── public/                   # Static assets  
│   ├── src/                      # React source code  
│   │   ├── components/  
│   │   ├── contexts/  
│   │   └── ... (other modules)  
│   ├── package.json              # Frontend dependencies  
│   └── tailwind.config.js        # Tailwind CSS configuration  
├── backend/                      # Django backend  
│   ├── manage.py                 # Django management script  
│   ├── event_ticketing_system/   # Main Django project settings  
│   ├── users/                    # User authentication and management app  
│   ├── events/                   # Events management app  
│   ├── seats/                   # Seat booking and seating map app  
│   ├── tickets/                  # Ticket handling app  
│   ├── venues/                   # Venue management app  
│   └── requirements.txt          # Backend Python dependencies  
└── README.md                     # This file  

⚙️ Getting Started  
Backend Setup (Django)  
1. Navigate to the backend directory: `cd backend`  
2. Create and activate a Python virtual environment:  
`python -m venv venv`  
Windows: `.\venv\Scripts\activate`  
Linux/macOS: `source venv/bin/activate`  
3. Install dependencies: `pip install -r requirements.txt`  
4. Configure database (default SQLite; for production, configure PostgreSQL)  
5. Apply migrations: `python manage.py migrate`  
6. (Optional) Create superuser: `python manage.py createsuperuser`  
7. Run development server: `python manage.py runserver`  
Backend API accessible at http://localhost:8000  

Frontend Setup (React)  
1. Navigate to frontend directory: `cd frontend`  
2. Install dependencies: `npm install`  
3. Start frontend server: `npm start`  
Frontend app accessible at http://localhost:3000  

🎯 Future Enhancements  
- Automated testing (unit, integration, e2e)  
- CI/CD pipelines for build and deploy automation  
- Docker containerization for deployment scalability  
- Improved dynamic ticket pricing algorithms  
- Integration with payment gateways and external APIs  
- Real-time event updates via WebSockets  

📄 License  
This project is licensed under the MIT License. See LICENSE file for details.  

✉️ Contact  
GitHub: https://github.com/snirgueta123  

