class ApiConfig {
  // Change this to your backend URL
  // For local development: 'http://10.0.2.2:8000' (Android emulator)
  // For iOS simulator: 'http://localhost:8000'
  // For production: 'https://your-backend-url.com'
  static const String baseUrl = 'http://10.0.2.2:8000';
  static const String apiUrl = '$baseUrl/api';
  
  // API Endpoints
  static const String login = '$apiUrl/users/login/';
  static const String register = '$apiUrl/users/register/';
  static const String googleAuth = '$apiUrl/users/google/';
  static const String currentUser = '$apiUrl/users/current/';
  static const String events = '$apiUrl/events/';
  static const String emergencies = '$apiUrl/emergencies/';
  static const String certificates = '$apiUrl/certificates/';
  static const String feedback = '$apiUrl/feedback/';
  static const String scores = '$apiUrl/scores/';
}
