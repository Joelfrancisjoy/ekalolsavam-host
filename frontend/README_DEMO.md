# E-Kalolsavam Frontend Demo

## 🎯 Demo Mode Features

This frontend runs in **demo mode** without requiring a backend. All data is simulated for demonstration purposes.

### 🔐 Login Credentials
- **Any email/password combination** will work
- **Google Login** is simulated (no real OAuth needed)
- **User roles** are automatically assigned

### 📊 Sample Data Includes
- **3 Events**: Bharatanatyam, Light Music, Essay Writing
- **4 Venues**: Main Auditorium, Music Hall, Library Hall, Open Grounds  
- **5 Users**: Admin, Judges, Volunteers
- **2 Registrations**: Sample student registrations
- **2 Results**: Sample scoring data

### 🎭 Available User Roles

#### Student Dashboard (`/student`)
- View published events
- Register for events
- View personal registrations
- Check results and rankings

#### Judge Dashboard (`/judge`)
- View assigned events
- Score participants
- Manage scoring criteria
- View participant details

#### Volunteer Dashboard (`/volunteer`)
- View volunteer assignments
- Verify participants by chess number
- Check-in to shifts
- View event participants

#### Admin Dashboard (`/admin`)
- Manage events (create, edit, delete, publish)
- Manage users and permissions
- Publish results
- System administration

## 🚀 Quick Start

### Local Development
```bash
cd frontend
npm install
npm start
# Opens on http://localhost:3000
```

### Production Build
```bash
npm run build
# Creates optimized build in 'build' folder
```

## 🔧 Technical Details

### Mock Data System
- **Service Adapter**: Automatically switches between mock and real APIs
- **Mock Services**: Complete API simulation for all endpoints
- **Sample Data**: Realistic data for testing all features

### Backend Integration
When ready to connect a real backend:
1. Set `REACT_APP_API_URL` environment variable
2. App automatically switches to real API calls
3. No code changes required

### Demo Mode Detection
- App detects if `REACT_APP_API_URL` is set
- Shows demo mode indicator when using mock data
- Seamlessly switches to backend when available

## 📱 Features Demonstrated

- ✅ **Responsive Design** - Works on all devices
- ✅ **Authentication** - Login/logout system
- ✅ **Event Management** - Full CRUD operations
- ✅ **User Registration** - Multi-role registration
- ✅ **Scoring System** - Judge scoring interface
- ✅ **Results Display** - Live results and rankings
- ✅ **Volunteer Coordination** - Participant verification
- ✅ **Admin Panel** - Complete system management

## 🌐 Deployment

### Netlify (Recommended)
1. Connect GitHub repository
2. Set base directory to `frontend`
3. Deploy (no environment variables needed)

### Other Platforms
- Vercel, GitHub Pages, or any static hosting
- Just build and deploy the `build` folder

## 🎨 UI/UX Features

- **Modern Design** - Clean, professional interface
- **Intuitive Navigation** - Easy-to-use dashboards
- **Real-time Updates** - Dynamic content loading
- **Form Validation** - Client-side validation
- **Error Handling** - User-friendly error messages
- **Loading States** - Smooth user experience

## 🔍 Testing the Demo

1. **Login** with any email/password
2. **Navigate** through different dashboards
3. **Register** for events (Student role)
4. **Score** participants (Judge role)
5. **Verify** participants (Volunteer role)
6. **Manage** system (Admin role)

The demo showcases the complete E-Kalolsavam system functionality without requiring any backend setup!


