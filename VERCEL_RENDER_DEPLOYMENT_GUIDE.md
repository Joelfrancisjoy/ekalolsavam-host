# Vercel + Render Deployment Guide for Kalolsavam

## Architecture Overview
- **Backend (Django API)**: Deployed on Vercel
- **Frontend (React App)**: Deployed on Render
- **Database**: External MySQL service (PlanetScale, AWS RDS, etc.)

## Prerequisites
- GitHub repository with your project
- Vercel account (sign up at vercel.com)
- Render account (sign up at render.com)
- External MySQL database service

## Step 1: Project Preparation ✅

### Backend Files Created/Updated:
- `vercel.json` - Vercel configuration
- `backend/vercel_wsgi.py` - Vercel-specific WSGI configuration
- `backend/requirements.txt` - Updated with Vercel support
- `backend/e_kalolsavam/settings.py` - Updated for Vercel deployment

### Frontend Files Created:
- `frontend/render.yaml` - Render configuration for static site

## Step 2: External MySQL Database Setup

### Recommended MySQL Services:
1. **PlanetScale** (Free tier available, serverless)
2. **AWS RDS** (Pay-as-you-go, managed)
3. **Google Cloud SQL** (Free tier available)
4. **Railway** (Free tier available)

### Database Setup Commands:
```sql
-- Connect to your MySQL database
mysql -h your-host -u your-username -p

-- Create the database
CREATE DATABASE kalolsavam_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Verify database creation
SHOW DATABASES;
```

## Step 3: Backend Deployment to Vercel

### Method 1: Using Vercel CLI (Recommended)

1. **Install Vercel CLI**:
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Deploy Backend**:
   ```bash
   # From project root directory
   vercel --prod
   ```

4. **Set Environment Variables in Vercel Dashboard**:
   - Go to your project dashboard on vercel.com
   - Navigate to Settings → Environment Variables
   - Add the following variables:

   ```bash
   SECRET_KEY=your-super-secret-key-here
   DEBUG=False
   ALLOWED_HOSTS=your-app-name.vercel.app
   DATABASE_NAME=kalolsavam_db
   DATABASE_USER=your-db-username
   DATABASE_PASSWORD=your-db-password
   DATABASE_HOST=your-mysql-host.com
   DATABASE_PORT=3306
   SOCIAL_AUTH_GOOGLE_OAUTH2_KEY=your-google-client-id
   SOCIAL_AUTH_GOOGLE_OAUTH2_SECRET=your-google-client-secret
   EMAIL_HOST_USER=your-email@gmail.com
   EMAIL_HOST_PASSWORD=your-app-password
   ```

### Method 2: Using Vercel Dashboard

1. **Connect Repository**:
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository

2. **Configure Project**:
   - Framework Preset: Other
   - Root Directory: `backend`
   - Build Command: `pip install -r requirements.txt`
   - Output Directory: Leave empty

3. **Set Environment Variables** (same as above)

## Step 4: Frontend Deployment to Render

### Deploy Frontend to Render:

1. **Connect Repository**:
   - Go to [render.com](https://render.com)
   - Click "New +" → "Static Site"
   - Connect your GitHub repository

2. **Configure Static Site**:
   - **Name**: `kalolsavam-frontend`
   - **Branch**: `main` (or your main branch)
   - **Root Directory**: `frontend`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `build`
   - **Plan**: Free (or choose based on needs)

3. **Set Environment Variables**:
   ```bash
   REACT_APP_API_URL=https://your-backend-app.vercel.app
   REACT_APP_ENVIRONMENT=production
   ```

## Step 5: Post-Deployment Configuration

### Update CORS Settings:
After deploying both services, update your backend CORS settings:

```python
# In backend/e_kalolsavam/settings.py
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://kalolsavam-frontend.onrender.com",
    "https://your-actual-frontend-url.onrender.com",
]
```

### Create Superuser:
```bash
# Using Vercel CLI
vercel env pull .env.local
# Then run locally with production database
python backend/manage.py createsuperuser
```

## Step 6: Testing Deployment

### Test Backend API:
```bash
# Test API endpoints
curl https://your-backend-app.vercel.app/api/
curl https://your-backend-app.vercel.app/admin/
```

### Test Frontend:
- Visit your Render frontend URL
- Test login functionality
- Verify API communication

## Step 7: Commands Summary

### Backend (Vercel) Commands:
```bash
# Install Vercel CLI
npm install -g vercel

# Login and deploy
vercel login
vercel --prod

# Pull environment variables locally
vercel env pull .env.local

# Run migrations (if needed)
vercel env pull .env.local
python backend/manage.py migrate
```

### Frontend (Render) Commands:
```bash
# Build locally for testing
cd frontend
npm install
npm run build

# Test build locally
npx serve -s build
```

## Step 8: Monitoring and Maintenance

### Vercel Monitoring:
- Use Vercel dashboard for backend monitoring
- Check function logs and performance
- Monitor API response times

### Render Monitoring:
- Use Render dashboard for frontend monitoring
- Check build logs and deployment status
- Monitor static site performance

## Troubleshooting

### Common Backend Issues:

1. **Vercel Build Failures**:
   ```bash
   # Check build logs in Vercel dashboard
   # Common fixes:
   pip install --upgrade pip
   pip install -r requirements.txt
   ```

2. **Database Connection Issues**:
   - Verify database credentials in Vercel environment variables
   - Check database host accessibility
   - Ensure database exists and is accessible

3. **Static Files Issues**:
   ```bash
   python backend/manage.py collectstatic --noinput
   ```

### Common Frontend Issues:

1. **Build Failures**:
   ```bash
   # Check build logs in Render dashboard
   # Common fixes:
   npm install
   npm run build
   ```

2. **API Connection Issues**:
   - Verify `REACT_APP_API_URL` environment variable
   - Check CORS settings in backend
   - Ensure backend URL is correct

## Production Checklist

### Backend (Vercel):
- [ ] Environment variables set correctly
- [ ] Database migrations applied
- [ ] DEBUG set to False
- [ ] ALLOWED_HOSTS configured
- [ ] CORS settings updated
- [ ] API endpoints responding
- [ ] Admin panel accessible

### Frontend (Render):
- [ ] Environment variables set correctly
- [ ] Build successful
- [ ] API URL configured correctly
- [ ] Static files loading
- [ ] Authentication working
- [ ] All pages accessible

## Cost Considerations

### Vercel:
- **Free Tier**: 100GB bandwidth, 1000 serverless function invocations
- **Pro Plan**: $20/month, unlimited bandwidth, better performance

### Render:
- **Free Tier**: Limited to 750 hours/month, sleeps after inactivity
- **Starter Plan**: $7/month, always-on, better performance

### Database:
- **PlanetScale**: Free tier available
- **AWS RDS**: Pay-as-you-go
- **Google Cloud SQL**: Free tier available

## Security Notes

- Never commit sensitive data to Git
- Use environment variables for all secrets
- Enable HTTPS (automatic on both platforms)
- Regular security updates
- Monitor access logs
- Use strong database passwords
- Enable database SSL connections

## Custom Domains

### Backend (Vercel):
1. Go to project settings
2. Add custom domain
3. Update DNS records
4. Update `ALLOWED_HOSTS` environment variable

### Frontend (Render):
1. Go to service settings
2. Add custom domain
3. Update DNS records
4. Update `REACT_APP_API_URL` if needed

## Performance Optimization

### Backend:
- Use Vercel's edge functions for better performance
- Optimize database queries
- Implement caching strategies
- Use CDN for static files

### Frontend:
- Optimize bundle size
- Use code splitting
- Implement lazy loading
- Optimize images and assets

This deployment architecture provides excellent scalability, performance, and cost-effectiveness for your Kalolsavam application!


