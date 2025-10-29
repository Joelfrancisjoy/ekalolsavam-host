import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { GoogleLogin } from '@react-oauth/google';
import axios from 'axios';
import { userServiceAdapter as userService } from '../services/serviceAdapter';
import EmailValidationChecker from '../components/EmailValidationChecker';

const Login = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    password_confirm: '',
    first_name: '',
    last_name: '',
    role: 'student',
    phone: ''
  });
  const [collegeIdFile, setCollegeIdFile] = useState(null);
  const [staffIdFile, setStaffIdFile] = useState(null);
  const [schools, setSchools] = useState([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState('');
  const [schoolCategoryExtra, setSchoolCategoryExtra] = useState('');
  const [error, setError] = useState('');
  const [judgeIdFile, setJudgeIdFile] = useState(null);
  const [emailValidForGoogle, setEmailValidForGoogle] = useState(null);
  const [usernameAvailability, setUsernameAvailability] = useState(null); // null | true | false
  const [usernameCheckMsg, setUsernameCheckMsg] = useState('');
  const [fieldErrors, setFieldErrors] = useState({}); // per-field backend validation errors
  const [emailWarning, setEmailWarning] = useState('');
  const [loginEmailWarning, setLoginEmailWarning] = useState('');
  const [phoneWarning, setPhoneWarning] = useState('');

  // Do not revoke existing tokens on visiting the login page.
  // Keeping tokens allows users to navigate here without being logged out unintentionally.
  useEffect(() => {
    // Intentionally left blank
  }, []);

  // Load schools for registration
  useEffect(() => {
    if (!isLogin) {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000';
      axios
        .get(`${apiUrl}/api/auth/schools/`)
        .then((res) => setSchools(res.data))
        .catch(() => setSchools([]));
    }
  }, [isLogin]);

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    if (e.target.name === 'username') {
      if (!isLogin) {
        debouncedCheckUsername(e.target.value);
      } else {
        const v = e.target.value || '';
        if (v.includes('@')) {
          setLoginEmailWarning(isLegitimateGmail(v) ? '' : 'Please provide a valid Gmail address with your real name (e.g., firstname.lastname@gmail.com).');
        } else {
          setLoginEmailWarning('');
        }
      }
    } else if (e.target.name === 'phone') {
      validatePhoneNow(e.target.value);
    }
  };

  // Debounced username availability check
  const debouncedCheckUsername = (() => {
    let t;
    return (val) => {
      clearTimeout(t);
      t = setTimeout(async () => {
        const username = (val || '').trim();
        if (!username) {
          setUsernameAvailability(null);
          setUsernameCheckMsg('');
          return;
        }
        try {
          const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000';
          const res = await axios.get(`${apiUrl}/api/auth/usernames/exists/`, { params: { username } });
          const exists = !!res.data?.exists;
          setUsernameAvailability(!exists);
          setUsernameCheckMsg(exists ? 'Exsisting Username' : '');
        } catch (_) {
          setUsernameAvailability(null);
          setUsernameCheckMsg('');
        }
      }, 350);
    };
  })();

  const isLegitimateGmail = (raw) => {
    const value = String(raw || '').trim().toLowerCase();
    if (!value || !value.endsWith('@gmail.com') || value.indexOf('@') === -1) {
      return false;
    }
    const local = value.split('@')[0] || '';
    if (!local) return false;
    if (/(.)\1{2,}/.test(local)) return false;
    const uniqueChars = new Set(local.split('')).size;
    if (uniqueChars <= 2 && local.length >= 6) return false;
    const blockedLocals = ['gmail', 'email', 'user', 'admin', 'test', 'abcd', 'wxyz', 'qwerty'];
    if (blockedLocals.includes(local)) return false;
    if (!/[aeiou]/.test(local)) return false;
    const letters = (local.match(/[a-z]/g) || []).length;
    if (letters >= 8) {
      const vowels = (local.match(/[aeiou]/g) || []).length;
      if (vowels / Math.max(1, letters) < 0.25 && local.indexOf('.') === -1 && local.indexOf('_') === -1 && local.indexOf('-') === -1) {
        return false;
      }
    }
    return true;
  };

  const validateEmailNow = (raw) => {
    const ok = isLegitimateGmail(raw);
    setEmailWarning(ok ? '' : 'Please provide a valid Gmail address with your real name (e.g., firstname.lastname@gmail.com).');
  };

  const debouncedValidateEmail = (() => {
    let t;
    return (val) => {
      clearTimeout(t);
      t = setTimeout(() => validateEmailNow(val), 400);
    };
  })();

  const isValidPhone = (raw) => {
    const value = String(raw || '');
    if (/[^0-9]/.test(value)) return false; // only digits allowed
    if (value.length !== 10) return false; // exactly 10 digits
    if (!/^[789]/.test(value)) return false; // must start with 7, 8, or 9
    if (value === '0000000000') return false; // all zeros
    if (/(\d)\1{4,}/.test(value)) return false; // long repetitive sequence like 44444 or 22222
    return true;
  };

  const validatePhoneNow = (raw) => {
    const value = String(raw || '');
    if (!value) {
      setPhoneWarning('');
      return;
    }
    if (/[^0-9]/.test(value)) {
      setPhoneWarning('Phone number must contain only digits (0-9), no letters, spaces, or symbols.');
      return;
    }
    if (value.length !== 10) {
      setPhoneWarning('Phone number must be exactly 10 digits.');
      return;
    }
    if (!/^[789]/.test(value)) {
      setPhoneWarning('Phone number must start with 9, 8, or 7.');
      return;
    }
    if (value === '0000000000' || /(\d)\1{4,}/.test(value)) {
      setPhoneWarning('Phone number has an invalid repetitive sequence.');
      return;
    }
    setPhoneWarning('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});

    try {
      if (isLogin) {
        const maybeEmail = String(formData.username || '');
        if (maybeEmail.includes('@')) {
          const ok = isLegitimateGmail(maybeEmail);
          if (!ok) {
            setError('Please provide a valid Gmail address with your real name (e.g., firstname.lastname@gmail.com).');
            return;
          }
        }
      }
      let response;
      if (isLogin) {
        response = await userService.login(formData.username, formData.password);
      } else {
        // Registration: validate password confirmation (not required for judge)
        if (formData.role !== 'judge') {
          if (formData.password !== formData.password_confirm) {
            setError('Passwords do not match');
            return;
          }
        }

        if (emailWarning) {
          setError(emailWarning);
          return;
        }

        // Block if email already exists (EmailValidationChecker sets false when existing)
        if (emailValidForGoogle === false) {
          setError('Exsisting Email ID');
          return;
        }

        // Block if username is taken (judge can skip username/password on form)
        if (formData.role !== 'judge') {
          if (usernameAvailability === false) {
            setError('Exsisting Username');
            return;
          }
        }

        // Validate phone for all roles before proceeding
        const rawPhone = String(formData.phone || '').trim();
        if (!isValidPhone(rawPhone)) {
          setError('Please enter a valid 10-digit phone number starting with 9, 8, or 7, digits only.');
          return;
        }
        const phoneDigits = rawPhone.replace(/\D/g, '');

        // Registration: role-based multipart when student
        if (formData.role === 'student') {
          if (!collegeIdFile) {
            setError('College ID (JPEG) is required for student registration');
            return;
          }
          if (!selectedSchoolId) {
            setError('Please select your school');
            return;
          }

          const fd = new FormData();
          fd.append('username', formData.username);
          fd.append('email', (formData.email || '').toLowerCase());
          fd.append('password', formData.password);
          fd.append('password_confirm', formData.password);
          fd.append('first_name', formData.first_name);
          fd.append('last_name', formData.last_name);
          fd.append('phone', phoneDigits);
          fd.append('role', 'student');
          fd.append('college_id_photo', collegeIdFile);
          fd.append('school', selectedSchoolId);
          if (schools.find((s) => String(s.id) === String(selectedSchoolId))?.category !== 'LP') {
            fd.append('school_category_extra', schoolCategoryExtra || '');
          } else {
          fd.append('school_category_extra', '');
        }

        response = await userService.register({
          username: formData.username,
          email: formData.email,
          password: formData.password,
          first_name: formData.first_name,
          last_name: formData.last_name,
          phone: phoneDigits,
          role: 'student',
          school: selectedSchoolId
        });
        } else if (formData.role === 'volunteer') {
          // Volunteer registration: require JPEG staff ID and multipart
          if (!staffIdFile) {
            setError('Staff ID (JPEG) is required for volunteer registration');
            return;
          }
          response = await userService.register({
            username: formData.username,
            email: formData.email,
            password: formData.password,
            first_name: formData.first_name,
            last_name: formData.last_name,
            phone: phoneDigits,
            role: 'volunteer'
          });
        } else {
          // Judge registration: multipart with Photo ID; username/password optional per backend
          if (!judgeIdFile) {
            setError('Photo ID (JPEG/PNG) is required for judge registration');
            return;
          }
          if (!isLegitimateGmail(formData.email)) {
            setError('Please provide a valid Gmail address with your real name (e.g., firstname.lastname@gmail.com).');
            return;
          }
          response = await userService.register({
            username: formData.username || '',
            email: formData.email,
            password: formData.password || '',
            first_name: formData.first_name,
            last_name: formData.last_name,
            phone: phoneDigits,
            role: 'judge'
          });
        }
      }

      // For judge registration, backend returns message without tokens
      if (!isLogin && formData.role === 'judge') {
        setError('Registration submitted. Await admin approval.');
        return;
      }
      localStorage.setItem('access_token', response.access);
      localStorage.setItem('refresh_token', response.refresh);
      try { localStorage.setItem('last_login_payload', JSON.stringify(response || {})); } catch (e) { }

      // Special handling for cenadmin or joelfrancisjoy@gmail.com - redirect to E-kalolsavam dashboard (admin)
      const user = response.user;
      if (user.username?.toLowerCase() === 'cenadmin' || user.email === 'joelfrancisjoy@gmail.com') {
        navigate('/admin', { replace: true });
        return;
      }

      // Redirect based on user role
      const userRole = user.role;
      if (userRole === 'admin') {
        navigate('/admin', { replace: true });
      } else if (userRole === 'judge') {
        navigate('/judge', { replace: true });
      } else if (userRole === 'volunteer') {
        // Check if volunteer is approved
        if (user.approval_status === 'approved') {
          navigate('/volunteer', { replace: true });
        } else {
          setError('Your volunteer account is pending approval. Please contact the administrator.');
          return;
        }
      } else if (userRole === 'school') {
        navigate('/school', { replace: true });
      } else if (userRole === 'student') {
        // Check if student is blacklisted
        if (user.approval_status === 'rejected') {
          setError('Your account has been blacklisted. Please contact the administrator.');
          return;
        }
        navigate('/dashboard', { replace: true });
      } else {
        // Default to role selection dashboard for others
        navigate('/dashboard', { replace: true });
      }
    } catch (err) {
      const apiError = err.response?.data;
      // Capture field-level errors if present
      if (apiError && typeof apiError === 'object' && !Array.isArray(apiError)) {
        setFieldErrors(apiError || {});
      }
      const msg =
        typeof apiError === 'string'
          ? apiError
          : apiError?.error || apiError?.detail || 'An error occurred';
      // Map Unauthorized Login to popup-like message
      if (msg === 'Unauthorized Login') {
        alert('Unauthorized Login');
      }
      setError(msg);
    }
  };

  const handleGoogleSuccess = async (response) => {
    try {
      // For demo mode, simulate Google login
      const res = await userService.login('demo@example.com', 'demo123');

      localStorage.setItem('access_token', res.access);
      localStorage.setItem('refresh_token', res.refresh);
      try { localStorage.setItem('last_login_payload', JSON.stringify(res || {})); } catch (e) { }

      // Special handling for cenadmin or joelfrancisjoy@gmail.com - redirect to E-kalolsavam dashboard (admin)
      const user = res.user;
      if (user.username?.toLowerCase() === 'cenadmin' || user.email === 'joelfrancisjoy@gmail.com') {
        navigate('/admin', { replace: true });
        return;
      }

      // Redirect based on user role
      const userRole = user.role;
      if (userRole === 'admin') {
        navigate('/admin', { replace: true });
      } else if (userRole === 'judge') {
        navigate('/judge', { replace: true });
      } else if (userRole === 'volunteer') {
        // Check if volunteer is approved
        if (user.approval_status === 'approved') {
          navigate('/volunteer', { replace: true });
        } else {
          setError('Your volunteer account is pending approval. Please contact the administrator.');
          return;
        }
      } else if (userRole === 'school') {
        navigate('/school', { replace: true });
      } else if (userRole === 'student') {
        // Check if student is blacklisted
        if (user.approval_status === 'rejected') {
          setError('Your account has been blacklisted. Please contact the administrator.');
          return;
        }
        navigate('/dashboard', { replace: true });
      } else {
        // Default to role selection dashboard for others
        navigate('/dashboard', { replace: true });
      }
    } catch (error) {
      console.error('Google login failed:', error?.response?.data || error.message);
      const errorMessage = error?.response?.data?.error || error?.response?.data?.detail || 'Google login failed. Please try again.';
      setError(errorMessage);
    }
  };

  const handleGoogleFailure = (error) => {
    console.error('Google login failed:', error);
    setError('Google login failed. Please try again or contact support if the issue persists.');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Traditional Art Pattern */}
        <div className="absolute top-0 left-0 w-64 h-64 opacity-10">
          <svg viewBox="0 0 200 200" className="w-full h-full text-amber-600">
            <defs>
              <pattern id="traditional-pattern" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                <circle cx="20" cy="20" r="3" fill="currentColor" />
                <path d="M10,10 Q20,5 30,10 Q25,20 30,30 Q20,35 10,30 Q15,20 10,10" fill="none" stroke="currentColor" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="200" height="200" fill="url(#traditional-pattern)" />
          </svg>
        </div>

        {/* Floating Art Elements */}
        <div className="absolute top-20 right-10 w-32 h-32 opacity-20 text-orange-600">
          <svg viewBox="0 0 100 100" className="w-full h-full">
            <path d="M50,10 Q70,30 50,50 Q30,30 50,10" fill="currentColor" />
            <circle cx="50" cy="70" r="8" fill="currentColor" />
          </svg>
        </div>

        <div className="absolute bottom-20 left-10 w-40 h-40 opacity-15 text-amber-700">
          <svg viewBox="0 0 100 100" className="w-full h-full">
            <path d="M20,20 Q50,10 80,20 Q70,50 80,80 Q50,70 20,80 Q30,50 20,20" fill="none" stroke="currentColor" strokeWidth="2" />
            <circle cx="50" cy="50" r="15" fill="currentColor" opacity="0.3" />
          </svg>
        </div>
      </div>

      {/* Header */}
      <header className="relative bg-white/90 backdrop-blur-sm border-b-2 border-amber-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-gradient-to-br from-amber-600 to-orange-600 rounded-full flex items-center justify-center shadow-lg">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2L13.09 8.26L22 9L13.09 9.74L12 16L10.91 9.74L2 9L10.91 8.26L12 2Z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <h1 className="text-3xl font-bold text-amber-800 tracking-wide">E-Kalolsavam</h1>
                <p className="text-orange-600 text-sm font-medium">Cultural Festival Portal</p>
              </div>
            </div>
            <div className="hidden md:flex items-center space-x-6">
              <div className="flex items-center space-x-2 text-amber-700">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 1H5C3.9 1 3 1.9 3 3V21C3 22.1 3.9 23 5 23H19C20.1 23 21 22.1 21 21V9Z" />
                </svg>
                <span className="text-sm font-medium">Celebrating Arts & Culture</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="relative flex items-center justify-center min-h-[calc(100vh-120px)] px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-lg w-full space-y-8">
          {/* Login Card */}
          <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl p-8 border-2 border-amber-200/50 relative overflow-hidden">
            {/* Decorative Corner Elements */}
            <div className="absolute top-0 right-0 w-20 h-20 opacity-10">
              <svg viewBox="0 0 100 100" className="w-full h-full text-amber-600">
                <path d="M0,0 Q50,25 100,0 L100,50 Q75,25 100,100 L50,100 Q25,75 0,100 Z" fill="currentColor" />
              </svg>
            </div>

            {/* Card Header */}
            <div className="text-center mb-8 relative">
              <div className="mx-auto w-20 h-20 bg-gradient-to-br from-amber-500 to-orange-500 rounded-full flex items-center justify-center mb-6 shadow-lg relative">
                <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12,2A3,3 0 0,1 15,5V11A3,3 0 0,1 12,14A3,3 0 0,1 9,11V5A3,3 0 0,1 12,2M19,11C19,14.53 16.39,17.44 13,17.93V21H11V17.93C7.61,17.44 5,14.53 5,11H7A5,5 0 0,0 12,16A5,5 0 0,0 17,11H19Z" />
                </svg>
                {/* Decorative Ring */}
                <div className="absolute inset-0 rounded-full border-4 border-amber-300/30 animate-pulse"></div>
              </div>
              <h2 className="text-4xl font-bold text-amber-800 mb-3 tracking-wide">
                {isLogin ? t('login') : t('signup')}
              </h2>
              <p className="text-orange-600 font-medium">
                {isLogin ? 'Welcome back to the cultural celebration!' : 'Join our vibrant cultural community'}
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-r-xl">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-700 font-medium">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {!isLogin && (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-semibold text-amber-800 mb-2">
                      First Name
                    </label>
                    <input
                      type="text"
                      name="first_name"
                      value={formData.first_name}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border-2 border-amber-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all duration-200 bg-amber-50/50 focus:bg-white text-amber-900 placeholder-amber-400"
                      required={!isLogin}
                      placeholder="Enter first name"
                    />
                    {fieldErrors?.first_name && (
                      <p className="mt-1 text-sm text-red-600">{String(fieldErrors.first_name)}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-amber-800 mb-2">
                      Last Name
                    </label>
                    <input
                      type="text"
                      name="last_name"
                      value={formData.last_name}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border-2 border-amber-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all duration-200 bg-amber-50/50 focus:bg-white text-amber-900 placeholder-amber-400"
                      required={!isLogin}
                      placeholder="Enter last name"
                    />
                    {fieldErrors?.last_name && (
                      <p className="mt-1 text-sm text-red-600">{String(fieldErrors.last_name)}</p>
                    )}
                  </div>
                </div>
              )}

              {!isLogin && (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-amber-800 mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={(e) => { handleInputChange(e); debouncedValidateEmail(e.target.value); }}
                      onBlur={() => validateEmailNow(formData.email)}
                      className="w-full px-4 py-3 border-2 border-amber-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all duration-200 bg-amber-50/50 focus:bg-white text-amber-900 placeholder-amber-400"
                      required={!isLogin}
                      placeholder="Enter your email"
                    />
                    {emailWarning && (
                      <div className="mt-2 inline-flex items-center px-3 py-2 text-sm bg-amber-50 text-amber-800 border border-amber-200 rounded-lg shadow-sm">
                        <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {emailWarning}
                      </div>
                    )}
                    {!emailWarning && (
                      <EmailValidationChecker
                        email={formData.email}
                        onValidationChange={setEmailValidForGoogle}
                      />
                    )}
                    {fieldErrors?.email && (
                      <p className="mt-1 text-sm text-red-600">{String(fieldErrors.email)}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-amber-800 mb-2">
                      Phone Number
                    </label>
                    <input
                      type="text"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      onBlur={() => validatePhoneNow(formData.phone)}
                      maxLength={10}
                      className="w-full px-4 py-3 border-2 border-amber-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all duration-200 bg-amber-50/50 focus:bg-white text-amber-900 placeholder-amber-400"
                      placeholder="Enter phone number"
                      required
                    />
                    {phoneWarning && (
                      <div className="mt-2 inline-flex items-center px-3 py-2 text-sm bg-amber-50 text-amber-800 border border-amber-200 rounded-lg shadow-sm">
                        <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {phoneWarning}
                      </div>
                    )}
                    {fieldErrors?.phone && (
                      <p className="mt-1 text-sm text-red-600">{String(fieldErrors.phone)}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-amber-800 mb-2">
                      Role
                    </label>
                    <select
                      name="role"
                      value={formData.role}
                      onChange={(e) => {
                        handleInputChange(e);
                        // Reset student-only fields when switching role
                        if (e.target.value !== 'student') {
                          setCollegeIdFile(null);
                          setSelectedSchoolId('');
                          setSchoolCategoryExtra('');
                        }
                        if (e.target.value !== 'volunteer') {
                          setStaffIdFile(null);
                        }
                        if (e.target.value !== 'judge') {
                          setJudgeIdFile(null);
                        }
                      }}
                      className="w-full px-4 py-3 border-2 border-amber-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all duration-200 bg-amber-50/50 focus:bg-white text-amber-900"
                    >
                      <option value="student">Student</option>
                      <option value="judge">Judge</option>
                      <option value="volunteer">Volunteer</option>
                    </select>
                    {fieldErrors?.role && (
                      <p className="mt-1 text-sm text-red-600">{String(fieldErrors.role)}</p>
                    )}
                  </div>

                  {formData.role === 'student' && (
                    <>
                      {/* School selection (required) */}
                      <div>
                        <label className="block text-sm font-semibold text-amber-800 mb-2">School</label>
                        <select
                          value={selectedSchoolId}
                          onChange={(e) => setSelectedSchoolId(e.target.value)}
                          className="w-full px-4 py-3 border-2 border-amber-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all duration-200 bg-amber-50/50 focus:bg-white text-amber-900"
                          required
                        >
                          <option value="">Select your school</option>
                          {/* Group by category */}
                          {['LP', 'UP', 'HS', 'HSS'].map((cat) => (
                            <optgroup key={cat} label={cat}>
                              {schools
                                .filter((s) => s.is_active && s.category === cat)
                                .map((s) => (
                                  <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </optgroup>
                          ))}
                        </select>
                      </div>

                      {/* Additional dropdown for non-LP */}
                      {schools.find((s) => String(s.id) === String(selectedSchoolId))?.category !== 'LP' && (
                        <div>
                          <label className="block text-sm font-semibold text-amber-800 mb-2">Category Details</label>
                          <select
                            value={schoolCategoryExtra}
                            onChange={(e) => setSchoolCategoryExtra(e.target.value)}
                            className="w-full px-4 py-3 border-2 border-amber-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all duration-200 bg-amber-50/50 focus:bg-white text-amber-900"
                            required
                          >
                            <option value="">Select category</option>
                            <option value="UP">UP</option>
                            <option value="HS">HS</option>
                            <option value="HSS">HSS</option>
                          </select>
                          {fieldErrors?.school_category_extra && (
                            <p className="mt-1 text-sm text-red-600">{String(fieldErrors.school_category_extra)}</p>
                          )}
                        </div>
                      )}

                      {/* College ID (JPEG only) */}
                      <div>
                        <label className="block text-sm font-semibold text-amber-800 mb-2">College ID (JPEG)</label>
                        <input
                          type="file"
                          accept=".jpg,.jpeg,image/jpeg"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            setCollegeIdFile(file || null);
                          }}
                          className="w-full"
                          required
                        />
                        <p className="text-xs text-amber-600 mt-1">Upload a clear photo of your college ID. Only .jpg or .jpeg allowed.</p>
                        {fieldErrors?.college_id_photo && (
                          <p className="mt-1 text-sm text-red-600">{String(fieldErrors.college_id_photo)}</p>
                        )}
                      </div>
                    </>
                  )}

                  {formData.role === 'volunteer' && (
                    <>
                      {/* Staff ID (JPEG only) */}
                      <div>
                        <label className="block text-sm font-semibold text-amber-800 mb-2">Staff ID (JPEG)</label>
                        <input
                          type="file"
                          accept=".jpg,.jpeg,image/jpeg"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            setStaffIdFile(file || null);
                          }}
                          className="w-full"
                          required
                        />
                        <p className="text-xs text-amber-600 mt-1">Upload a clear photo of your staff ID. Only .jpg or .jpeg allowed.</p>
                        {fieldErrors?.staff_id_photo && (
                          <p className="mt-1 text-sm text-red-600">{String(fieldErrors.staff_id_photo)}</p>
                        )}
                      </div>
                    </>
                  )}

                  {formData.role === 'judge' && (
                    <>
                      {/* Judge Photo ID (JPEG only) */}
                      <div>
                        <label className="block text-sm font-semibold text-amber-800 mb-2">Photo ID (JPEG)</label>
                        <input
                          type="file"
                          accept=".jpg,.jpeg,image/jpeg,image/png"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            setJudgeIdFile(file || null);
                          }}
                          className="w-full"
                          required
                        />
                        <p className="text-xs text-amber-600 mt-1">Upload a clear photo of your ID. Only .jpg or .jpeg allowed.</p>
                        {fieldErrors?.judge_id_photo && (
                          <p className="mt-1 text-sm text-red-600">{String(fieldErrors.judge_id_photo)}</p>
                        )}
                      </div>
                    </>
                  )}
                </>
              )}


              <div>
                <label className="block text-sm font-semibold text-amber-800 mb-2">
                  Username
                </label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border-2 border-amber-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all duration-200 bg-amber-50/50 focus:bg-white text-amber-900 placeholder-amber-400"
                  required={isLogin || formData.role !== 'judge'}
                  placeholder="Enter your username"
                />
                {isLogin && loginEmailWarning && (
                  <p className="mt-1 text-sm text-red-600">{loginEmailWarning}</p>
                )}
                {!isLogin && usernameCheckMsg && (
                  <p className="mt-1 text-sm text-red-600">{usernameCheckMsg}</p>
                )}
                {fieldErrors?.username && (
                  <p className="mt-1 text-sm text-red-600">{String(fieldErrors.username)}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-amber-800 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border-2 border-amber-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all duration-200 bg-amber-50/50 focus:bg-white text-amber-900 placeholder-amber-400"
                  required={isLogin || formData.role !== 'judge'}
                  placeholder="Enter your password"
                />
                {fieldErrors?.password && (
                  <p className="mt-1 text-sm text-red-600">{String(fieldErrors.password)}</p>
                )}
              </div>

              {!isLogin && (
                <div>
                  <label className="block text-sm font-semibold text-amber-800 mb-2">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    name="password_confirm"
                    value={formData.password_confirm}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border-2 border-amber-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all duration-200 bg-amber-50/50 focus:bg-white text-amber-900 placeholder-amber-400"
                    required={!isLogin}
                    placeholder="Confirm your password"
                  />
                  {fieldErrors?.password_confirm && (
                    <p className="mt-1 text-sm text-red-600">{String(fieldErrors.password_confirm)}</p>
                  )}
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-bold py-4 px-6 rounded-xl transition-all duration-200 transform hover:scale-[1.02] focus:outline-none focus:ring-4 focus:ring-amber-300 shadow-lg hover:shadow-xl"
              >
                {isLogin ? t('login') : t('signup')}
              </button>
            </form>

            {/* Google Login, only if provider is configured */}
            {process.env.REACT_APP_GOOGLE_CLIENT_ID ? (
              <div className="mt-8">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t-2 border-amber-200"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-white text-orange-600 font-semibold">
                      Or continue with
                    </span>
                  </div>
                </div>

                <div className="mt-6 flex justify-center">
                  <div className="w-full max-w-xs">
                    <GoogleLogin
                      onSuccess={handleGoogleSuccess}
                      onError={handleGoogleFailure}
                      useOneTap
                      theme="outline"
                      size="large"
                      width="100%"
                    />
                  </div>
                </div>

                {/* Google Login Info */}
                <div className="mt-4 text-center">
                  <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg border border-amber-200">
                    <svg className="w-4 h-4 inline mr-1 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    Sign in with your Google account to get started quickly.
                  </p>
                </div>
              </div>
            ) : null}

            {/* Registration Redirect - ID-Based Only */}
            <div className="mt-8 text-center space-y-3">
              {isLogin ? (
                <div>
                  <button
                    onClick={() => navigate('/register-with-id')}
                    className="text-amber-700 hover:text-orange-700 font-semibold transition-colors duration-200 underline decoration-2 underline-offset-4 decoration-amber-300 hover:decoration-orange-400"
                  >
                    Don't have an account? Register with ID
                  </button>
                  <p className="text-xs text-amber-600 mt-2 bg-amber-50 px-3 py-2 rounded-lg border border-amber-200 inline-block">
                    💡 New registrations require an admin-issued ID
                  </p>
                </div>
              ) : (
                <button
                  onClick={() => setIsLogin(!isLogin)}
                  className="text-amber-700 hover:text-orange-700 font-semibold transition-colors duration-200 underline decoration-2 underline-offset-4 decoration-amber-300 hover:decoration-orange-400"
                >
                  Already have an account? Login
                </button>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="text-center">
            <p className="text-amber-700 text-sm font-medium">
              © 2024 E-Kalolsavam Portal. Celebrating Arts & Culture.
            </p>
          </div>
        </div>
      </div>
    </div >
  );
};

export default Login;