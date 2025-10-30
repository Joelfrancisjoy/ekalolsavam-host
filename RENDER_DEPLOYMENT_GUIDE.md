# Backend Deployment Guide for Render

## Prerequisites
- GitHub repository with your project
- Render account (sign up at render.com)
- External MySQL database service

## Step 1: Project Preparation ✅

### Files Created:
- `backend/Procfile` - Defines how to run the application
- `backend/runtime.txt` - Specifies Python version
- `backend/render.yaml` - Render configuration file
- Updated `backend/requirements.txt` - Added gunicorn and whitenoise
- Updated `backend/e_kalolsavam/settings.py` - Added whitenoise middleware

## Step 2: External MySQL Database Setup

### Recommended MySQL Services:
1. **PlanetScale** (Free tier available)
2. **AWS RDS** (Pay-as-you-go)
3. **Google Cloud SQL** (Free tier available)
4. **Railway** (Free tier available)

### Database Setup Commands:
```bash
# Connect to your MySQL database and create the database
mysql -h your-host -u your-username -p
CREATE DATABASE kalolsavam_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

## Step 3: Environment Variables Setup

### Required Environment Variables for Render:

```bash
# Django Core Settings
SECRET_KEY=your-super-secret-key-here
DEBUG=False
ALLOWED_HOSTS=kalolsavam-backend.onrender.com

# Database Configuration
DATABASE_NAME=kalolsavam_db
DATABASE_USER=your-db-username
DATABASE_PASSWORD=your-db-password
DATABASE_HOST=your-mysql-host.com
DATABASE_PORT=3306

# Google OAuth Configuration
SOCIAL_AUTH_GOOGLE_OAUTH2_KEY=your-google-client-id
SOCIAL_AUTH_GOOGLE_OAUTH2_SECRET=your-google-client-secret

# Email Configuration
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
```

## Step 4: Deploy to Render

### Method 1: Using Render Dashboard

1. **Connect Repository**:
   - Go to [render.com](https://render.com)
   - Click "New +" → "Web Service"
   - Connect your GitHub repository

2. **Configure Service**:
   - **Name**: `kalolsavam-backend`
   - **Environment**: `Python 3`
   - **Build Command**: `cd backend && pip install -r requirements.txt && python manage.py migrate && python manage.py collectstatic --noinput`
   - **Start Command**: `cd backend && gunicorn e_kalolsavam.wsgi:application`
   - **Plan**: Free (or choose based on needs)

3. **Set Environment Variables**:
   - Add all variables from Step 3
   - Make sure `DEBUG=False` for production

### Method 2: Using Render CLI

```bash
# Install Render CLI
npm install -g @render/cli

# Login to Render
render login

# Deploy (if using render.yaml)
render deploy

# Or deploy specific service
render services create --type web --name kalolsavam-backend
```

## Step 5: Post-Deployment Commands

### Create Superuser:
```bash
# Using Render Shell
render shell kalolsavam-backend
python manage.py createsuperuser
```

### Verify Deployment:
```bash
# Test API endpoints
curl https://kalolsavam-backend.onrender.com/api/
curl https://kalolsavam-backend.onrender.com/admin/
```

## Step 6: Frontend Configuration Update

Update your frontend to point to the new backend URL:

```javascript
// In your frontend API configuration
const API_BASE_URL = 'https://kalolsavam-backend.onrender.com/api';
```

## Step 7: CORS Configuration Update

Update CORS settings in your Django settings for production:

```python
# In settings.py
CORS_ALLOWED_ORIGINS = [
    "https://your-frontend-domain.com",
    "https://your-frontend.onrender.com",
]

# Remove this line for production:
# CORS_ALLOW_ALL_ORIGINS = DEBUG
```

## Step 8: Monitoring and Maintenance

### Health Check Endpoint:
Create a simple health check endpoint in your Django app:

```python
# In your main urls.py
from django.http import JsonResponse

def health_check(request):
    return JsonResponse({"status": "healthy", "service": "kalolsavam-backend"})
```

### Log Monitoring:
- Use Render dashboard to monitor logs
- Set up alerts for errors
- Monitor database connections

## Troubleshooting

### Common Issues:

1. **Build Failures**:
   ```bash
   # Check build logs in Render dashboard
   # Common fixes:
   pip install --upgrade pip
   pip install -r requirements.txt
   ```

2. **Database Connection Issues**:
   - Verify database credentials
   - Check database host accessibility
   - Ensure database exists

3. **Static Files Issues**:
   ```bash
   python manage.py collectstatic --noinput
   ```

4. **CORS Issues**:
   - Update CORS_ALLOWED_ORIGINS
   - Check frontend URL configuration

## Production Checklist

- [ ] Environment variables set correctly
- [ ] Database migrations applied
- [ ] Static files collected
- [ ] DEBUG set to False
- [ ] ALLOWED_HOSTS configured
- [ ] CORS settings updated
- [ ] SSL certificate active
- [ ] Health check endpoint working
- [ ] API endpoints responding
- [ ] Admin panel accessible

## Commands Summary

```bash
# Local testing before deployment
cd backend
pip install -r requirements.txt
python manage.py migrate
python manage.py collectstatic --noinput
python manage.py runserver

# Production deployment commands (handled by Render)
cd backend
pip install -r requirements.txt
python manage.py migrate
python manage.py collectstatic --noinput
gunicorn e_kalolsavam.wsgi:application
```

## Cost Considerations

- **Free Tier**: Limited to 750 hours/month, sleeps after inactivity
- **Starter Plan**: $7/month, always-on, better performance
- **Database**: Consider paid plans for production workloads

## Security Notes

- Never commit sensitive data to Git
- Use environment variables for all secrets
- Enable HTTPS (automatic on Render)
- Regular security updates
- Monitor access logs


