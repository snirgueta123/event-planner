Event Planner
Event Planner is a smart, comprehensive platform designed for seamless event management. This application centralizes the entire event workflow, transforming complex planning into an efficient, enjoyable experience. From creating and promoting events, to managing tickets and seating arrangements, handling user authentication and permissions, and providing real-time updates and notifications – Event Planner consolidates all essential tools into one intuitive platform.

This system is meticulously crafted to serve event organizers, businesses, and private individuals seeking a modern, efficient, and sophisticated solution to orchestrate unforgettable events.

🚀 Key Features
Comprehensive Event Creation: Intuitive interface for setting up events with all necessary details.

Advanced Ticketing & Seat Management: Dynamic ticket generation, flexible pricing mechanisms (including planned dynamic pricing), and interactive seating arrangements.

Robust User & Permission Management: Secure user authentication (Token-based), with distinct roles for staff (organizers) and regular users.

Real-time Communication: Integrated toast notifications for immediate feedback and email functionality for password resets.

Efficient Data Handling: Pagination for large datasets, advanced filtering options, and complex data relationships (events, tickets, users, venues).

Secure API Interactions: Backend built with Django REST Framework, ensuring secure and efficient data exchange with the frontend via Token Authentication and CORS middleware.

🛠️ Technologies & Stack
Backend:
Django 4.x: Robust web framework for rapid development.

Django REST Framework: For powerful and flexible API creation.

PostgreSQL: (Planned for production) Relational database for scalable data storage.

SQLite: (Default for development) Lightweight database.

Token Authentication: Secure user authentication.

CORS Middleware: Enables cross-origin communication between frontend and backend.

Custom User Model: Flexible user management (users.User).

Email Backend: Configured for Gmail SMTP (for password resets).

Frontend:
React 19.x: Modern JavaScript library for building dynamic user interfaces.

React Router DOM: For declarative navigation and routing.

Tailwind CSS: A utility-first CSS framework for rapid and responsive UI development.

Context API: For global state management (AuthContext, ToastContext).

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
│   ├── seats/                    # Seat booking and seating map app
│   ├── tickets/                  # Ticket handling app
│   ├── venues/                   # Venue management app
│   └── requirements.txt          # Backend Python dependencies
└── README.md                     # This file

⚙️ Getting Started
Follow these steps to get your Event Planner project up and running locally.

Backend Setup (Django)
Navigate to the backend directory:

cd backend

Create and activate a Python virtual environment:

python -m venv venv
# Windows
.\venv\Scripts\activate
# Linux/macOS
source venv/bin/activate

Install backend dependencies:

pip install -r requirements.txt

Database Configuration:

By default, the project uses SQLite for simplicity in development.

For production or a more robust development setup, PostgreSQL is highly recommended. Update your backend/event_ticketing_system/settings.py file with your PostgreSQL database credentials if you wish to use it.

Apply database migrations:

python manage.py migrate

Create a superuser (optional, for admin access):

python manage.py createsuperuser

Start the Django development server:

python manage.py runserver

The backend API will be available at http://localhost:8000.

Frontend Setup (React)
Navigate to the frontend directory (in a new terminal tab/window):

cd frontend

Install frontend dependencies:

npm install

Start the React development server:

npm start

The frontend application will be available at http://localhost:3000.

🎯 Future Enhancements
Automated Testing: Implement comprehensive unit, integration, and end-to-end tests for both frontend and backend.

CI/CD Pipelines: Set up Continuous Integration and Continuous Deployment for automated builds, tests, and deployments.

Docker Support: Containerize the application for easier deployment and scalability.

Improved Ticket Pricing Algorithms: Develop more sophisticated dynamic pricing strategies.

Third-Party API Integrations: Integrate with payment gateways, marketing tools, or external mapping services.

Real-time Event Updates: Utilize WebSockets for live updates on ticket sales, attendance, etc.

📄 License
This project is licensed under the MIT License. See the LICENSE file for more details.

✉️ Contact
For any inquiries, collaborations, or additional information, please feel free to reach out:

GitHub: snirgueta123

Email: your_email@gmail.com (Replace with your actual email address)
