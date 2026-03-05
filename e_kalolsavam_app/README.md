# E-Kalolsavam Flutter App

Flutter mobile application for E-Kalolsavam that connects to the same Django backend as the web app.

## Setup Instructions

### 1. Install Dependencies

Navigate to the Flutter project directory and run:

```bash
cd e_kalolsavam_app
flutter pub get
```

### 2. Configure Backend URL

Edit `lib/config/api_config.dart` and update the `baseUrl`:

- **Android Emulator**: Use `http://10.0.2.2:8000` (this maps to localhost on your computer)
- **iOS Simulator**: Use `http://localhost:8000`
- **Physical Device**: Use your computer's IP address (e.g., `http://192.168.1.100:8000`)
- **Production**: Use your deployed backend URL

### 3. Backend CORS Configuration

Make sure your Django backend allows requests from the mobile app. The backend is already configured with CORS in `backend/e_kalolsavam/settings.py`.

For local development, you may need to add your device's IP to `CORS_ALLOWED_ORIGINS` if testing on a physical device.

### 4. Run the App

#### Android
```bash
flutter run
```

#### iOS (Mac only)
```bash
flutter run
```

#### Specific device
```bash
flutter devices  # List available devices
flutter run -d <device-id>
```

## Project Structure

```
lib/
├── config/
│   └── api_config.dart          # API endpoints configuration
├── models/
│   └── user_model.dart          # User data model
├── providers/
│   └── auth_provider.dart       # Authentication state management
├── screens/
│   ├── login_screen.dart        # Login UI
│   └── home_screen.dart         # Home screen after login
├── services/
│   ├── auth_service.dart        # Authentication API calls
│   └── storage_service.dart     # Secure token storage
└── main.dart                    # App entry point
```

## Features Implemented

- ✅ User authentication (login)
- ✅ JWT token management
- ✅ Secure token storage
- ✅ User profile display
- ✅ Logout functionality
- ✅ State management with Provider

## API Endpoints Used

The app connects to these Django backend endpoints:

- `POST /api/users/login/` - User login
- `POST /api/users/register/` - User registration
- `GET /api/users/current/` - Get current user info
- `POST /api/users/google/` - Google OAuth (to be implemented)

## Testing

### Test on Android Emulator

1. Start your Django backend: `python manage.py runserver`
2. Start Android emulator from Android Studio
3. Run: `flutter run`

### Test on Physical Device

1. Connect your device via USB
2. Enable USB debugging on your device
3. Update `api_config.dart` with your computer's IP address
4. Run: `flutter run`

## Next Steps

To add more features:

1. **Events**: Create event listing and registration screens
2. **Certificates**: Add certificate viewing functionality
3. **Scores**: Display scores and results
4. **Emergencies**: Emergency reporting feature
5. **Profile**: User profile editing
6. **Google Sign-In**: Implement Google OAuth

## Troubleshooting

### Connection Issues

If you can't connect to the backend:

1. Check that Django backend is running
2. Verify the `baseUrl` in `api_config.dart`
3. For Android emulator, use `10.0.2.2` instead of `localhost`
4. For physical devices, ensure both device and computer are on the same network
5. Check firewall settings

### Build Issues

If you encounter build errors:

```bash
flutter clean
flutter pub get
flutter run
```

## Dependencies

- `http` - HTTP requests
- `dio` - Advanced HTTP client
- `provider` - State management
- `flutter_secure_storage` - Secure token storage
- `shared_preferences` - Local data storage
- `google_sign_in` - Google authentication
- `image_picker` - Image selection
- `qr_flutter` & `qr_code_scanner` - QR code functionality
- `pdf` - PDF generation
- `intl` - Internationalization
- `flutter_spinkit` - Loading indicators
