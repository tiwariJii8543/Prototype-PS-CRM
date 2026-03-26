# PS-CRM - Smart Public Service CRM

A blockchain-enabled transparent grievance management system with MySQL backend.

## Features

- **Citizen Portal**: Submit complaints with location tracking and evidence upload
- **Department Dashboard**: Manage assigned complaints with response tracking
- **Admin Dashboard**: System-wide oversight with analytics and escalation
- **Public Portal**: View all complaints with support voting
- **Blockchain Integration**: Immutable audit trail for all actions
- **MySQL Backend**: Persistent storage with JWT authentication

## Quick Start

### Prerequisites
- Node.js (v14+)
- MySQL Server (v8+)
- Modern web browser

### 1. Setup Database
```bash
# Create database (run in MySQL shell or use the PowerShell script below)
CREATE DATABASE ps_crm_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

**PowerShell Auto-Setup** (Windows):
```powershell
cd "d:\Prototype PS-CRM\server"
# Edit .env first with your MySQL credentials
# Then run:
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS ps_crm_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci; USE ps_crm_db; SOURCE setup.sql;"
```

### 2. Install Backend Dependencies
```bash
cd server
npm install
```

### 3. Configure Environment
Edit `server/.env`:
```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your-password
DB_NAME=ps_crm_db
JWT_SECRET=your_jwt_secret_here
PORT=5000
```

### 4. Start Backend
```bash
cd server
npm run dev  # or npm start
```

### 5. Open Frontend
Open `index.html` in your browser. The app will automatically connect to the backend API.

## API Endpoints

- `POST /api/auth/login` - User login
- `POST /api/auth/signup` - Citizen signup
- `GET /api/complaints` - Get all complaints
- `POST /api/complaints` - Submit new complaint
- `GET /api/complaints/:id` - Get specific complaint
- `PUT /api/complaints/:id` - Update complaint
- `GET /api/departments` - Get all departments

## Demo Credentials

### Admin
- Username: `admin`
- Password: `admin123`

### Department Users
- Roads: `roads` / `road123`
- Water: `water` / `water123`
- Electricity: `electric` / `electric123`
- Sanitation: `sanitation` / `sanitation123`

### Citizen
- Sign up through the app or use any username/password after signup

## Architecture

- **Frontend**: Vanilla JavaScript + HTML/CSS
- **Backend**: Node.js + Express + MySQL
- **Authentication**: JWT tokens
- **Storage**: MySQL with localStorage fallback
- **Blockchain**: Custom implementation for audit trail

## Development

### Frontend Structure
```
index.html          # Main HTML
css/styles.css      # Styles
js/
├── app.js          # Main application logic
├── storage.js      # Data management (API + localStorage)
├── blockchain.js   # Blockchain implementation
├── map.js          # Map integration
└── analytics.js    # Charts and analytics
```

### Backend Structure
```
server/
├── server.js       # Express server
├── package.json    # Dependencies
└── .env           # Configuration
```

## Switching Between API and LocalStorage

The app supports both backend API and localStorage modes:

- **API Mode** (default): Full backend with MySQL persistence
- **LocalStorage Mode**: Client-only storage for demos/offline

To switch modes programmatically:
```javascript
storage.setApiMode(false); // Use localStorage
storage.setApiMode(true);  // Use API (default)
```

## Troubleshooting

### Backend Connection Issues
1. Ensure MySQL server is running
2. Check `.env` configuration
3. Verify database exists: `SHOW DATABASES;`
4. Check server logs for errors

### Frontend Issues
1. Open browser console (F12) for errors
2. Check network tab for failed API calls
3. Try switching to localStorage mode: `storage.setApiMode(false)`

### Database Issues
1. Reset database: `DROP DATABASE ps_crm_db; CREATE DATABASE ps_crm_db...`
2. Re-run server to auto-create tables and seed data

## License

MIT License