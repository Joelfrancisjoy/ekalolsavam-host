# Authentication Setup Guide

This guide will help you set up the authentication system for the E-Kalolsavam project.

## Backend Setup

### 1. Environment Variables
Create a `.env` file in the `backend/` directory with the following variables:

```env
# Django Settings
SECRET_KEY=your-secret-key-here
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# Database Configuration
DATABASE_NAME=your_database_name
DATABASE_USER=your_database_user
DATABASE_PASSWORD=your_database_password
DATABASE_HOST=localhost
DATABASE_PORT=3306

# Google OAuth2 Configuration
SOCIAL_AUTH_GOOGLE_OAUTH2_KEY=your-google-client-id
SOCIAL_AUTH_GOOGLE_OAUTH2_SECRET=your-google-client-secret

# Email Configuration
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password

# Frontend URL
FRONTEND_URL=http://localhost:3000
```

### 2. Google OAuth2 Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API
4. Go to "Credentials" and create OAuth 2.0 Client IDs
5. Add authorized redirect URIs:
   - `http://localhost:8000/auth/complete/google-oauth2/`
   - `http://127.0.0.1:8000/auth/complete/google-oauth2/`
6. Copy the Client ID and Client Secret to your `.env` file

### 3. Database Setup
1. Install MySQL server
2. Create a database for the project
3. Update the database configuration in `.env`
4. Run migrations:
   ```bash
   cd backend
   python manage.py makemigrations
   python manage.py migrate
   ```

### 4. Install Dependencies
```bash
cd backend
pip install -r requirements.txt
```

## Frontend Setup

### 1. Environment Variables
Create a `.env` file in the `frontend/` directory:

```env
# API Configuration
REACT_APP_API_URL=http://localhost:8000

# Google OAuth2 Configuration
# Use the SAME Client ID from backend SOCIAL_AUTH_GOOGLE_OAUTH2_KEY
REACT_APP_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

**IMPORTANT**: The `REACT_APP_GOOGLE_CLIENT_ID` must be the **exact same value** as `SOCIAL_AUTH_GOOGLE_OAUTH2_KEY` in the backend `.env` file.

### 2. Install Dependencies
```bash
cd frontend
npm install
```

## Running the Application

### Backend
```bash
cd backend
python manage.py runserver
```

### Frontend
```bash
cd frontend
npm start
```

## Authentication Features Fixed

### 1. Normal Login
- Fixed case-insensitive username authentication
- Improved error handling
- Consistent API URL configuration

### 2. User Registration
- Fixed validation for different user roles (student, judge, volunteer)
- Proper file upload handling for ID photos
- School selection validation
- Password confirmation validation

### 3. Google Sign-In
- Fixed Google OAuth2 token verification
- Proper user creation and role assignment
- Error handling for invalid tokens
- Admin user auto-promotion

### 4. Error Handling
- Consistent error messages across all authentication flows
- Proper HTTP status codes
- User-friendly error display in frontend

## Testing Authentication

### Test Normal Login
1. Register a new user
2. Try logging in with the credentials
3. Verify role-based redirection

### Test Google Sign-In
1. Click "Sign in with Google"
2. Complete Google authentication
3. Verify user creation and role assignment

### Test Registration
1. Try registering as different roles (student, judge, volunteer)
2. Upload required ID photos
3. Verify validation works correctly

## Troubleshooting

### Common Issues
1. **Google OAuth Error**: Check if Google OAuth2 credentials are properly configured
2. **Database Connection Error**: Verify database credentials and MySQL server status
3. **CORS Error**: Ensure CORS settings allow frontend origin
4. **File Upload Error**: Check file size limits and allowed formats

### Debug Mode
Set `DEBUG=True` in your `.env` file to see detailed error messages.

