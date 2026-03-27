# PS-CRM - Smart Public Service CRM

A blockchain-enabled transparent grievance management system with a Node/Express + MySQL backend and a static frontend.

## Features

- **Citizen Portal**: Submit complaints with location tracking and evidence upload
- **Department Dashboard**: Manage assigned complaints with response tracking
- **Admin Dashboard**: System-wide oversight with analytics and escalation
- **Public Portal**: View all complaints with support voting
- **Blockchain Integration**: Immutable audit trail for all actions
- **MySQL Backend**: Persistent storage with JWT authentication

## Quick Start

### Prerequisites
- Node.js (v18+ recommended)
- MySQL Server (v8+) or managed MySQL
- Modern web browser

### 1. Setup Database
```bash
# Create the database you want the app to use
CREATE DATABASE ps_crm_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 2. Install Backend Dependencies
```bash
cd server
npm install
```

### 3. Configure Environment
Copy `server/.env.example` to `server/.env` and update it:
```env
DATABASE_URL=
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your-password
DB_NAME=ps_crm_db
JWT_SECRET=your_jwt_secret_here
PORT=5000
ALLOWED_ORIGINS=http://localhost:5500
```

For Railway or another managed MySQL provider, you can use either:

- `DATABASE_URL` as a full connection string, or
- the separate `DB_HOST` / `DB_PORT` / `DB_USER` / `DB_PASSWORD` / `DB_NAME` variables

If `DATABASE_URL` is provided, the backend will use it automatically.

### 4. Start Backend
```bash
cd server
npm run dev  # or npm start
```

### 5. Open Frontend
You now have 2 ways to run the frontend:

- Local static file mode: open `index.html` in your browser. It will call `http://localhost:5000/api`.
- Single-server mode: visit `http://localhost:5000/`. The Express app serves the frontend and API together.

### 6. Health Check
```bash
curl http://localhost:5000/api/health
```

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
- **Deployment**: Can be deployed as a single Express service or split frontend/backend

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
├── .env.example    # Safe environment template
└── .env           # Local configuration (do not commit secrets)
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
3. Verify the configured database exists and the user can access it
4. Check server logs for errors

### Frontend Issues
1. Open browser console (F12) for errors
2. Check network tab for failed API calls
3. If deployed separately, set `ALLOWED_ORIGINS` on the backend
4. Try switching to localStorage mode: `storage.setApiMode(false)`

### Database Issues
1. Reset database: `DROP DATABASE ps_crm_db; CREATE DATABASE ps_crm_db...`
2. Re-run server to auto-create tables and seed data

## Deployment

### Option A: Single-service deployment on Render or Railway

This is the easiest way to use the app on multiple devices. The Express server will serve both the frontend and the API.

1. Push the repository to GitHub.
2. Create a new web service on Render or Railway from this repo.
3. Use these commands:
   - Build command: `cd server && npm install`
   - Start command: `cd server && npm start`
4. Add environment variables from `server/.env.example`.
5. Set `APP_URL` to your public app URL, for example `https://ps-crm.onrender.com`.
6. Leave `ALLOWED_ORIGINS` empty when the frontend is served by the same Express service.
7. Open your deployed URL from any phone or laptop on the internet.

### Option B: Split deployment

Use this if you want the frontend on Netlify/Vercel and the backend on Render/Railway.

1. Deploy the backend from the `server` folder.
2. Set `ALLOWED_ORIGINS` to your frontend domain, for example `https://your-site.netlify.app`.
3. Deploy the frontend files (`index.html`, `css/`, `js/`) to a static host.
4. The frontend will automatically call `${window.location.origin}/api` when served from the same domain.
5. If frontend and backend are on different domains, inject `window.PSCRM_CONFIG = { apiBase: 'https://your-backend/api' }` before loading `js/storage.js`.

## Security Notes

- Do not commit `server/.env` with real credentials.
- Rotate any database password or JWT secret that has already been exposed.
- Use a long random `JWT_SECRET` in production.
- Prefer `DATABASE_URL` on Railway when it is available.

## License

MIT License
