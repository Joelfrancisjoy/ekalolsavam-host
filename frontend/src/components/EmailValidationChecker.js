import React, { useState, useEffect } from 'react';
import axios from 'axios';

const EmailValidationChecker = ({ email, onValidationChange }) => {
  const [isChecking, setIsChecking] = useState(false);
  const [isAllowed, setIsAllowed] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (email && email.includes('@')) {
      checkEmailAllowed(email);
    } else {
      setIsAllowed(null);
      setError('');
      if (onValidationChange) {
        onValidationChange(null);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email]);

  const checkEmailAllowed = async (emailToCheck) => {
    const value = (emailToCheck || '').trim().toLowerCase();

    const atIndex = value.indexOf('@');
    if (atIndex === -1 || !value.endsWith('@gmail.com')) {
      setIsAllowed(false);
      setError('Please provide a valid Gmail address with your real name (e.g., firstname.lastname@gmail.com).');
      if (onValidationChange) onValidationChange(false);
      return;
    }

    const local = value.split('@')[0];
    const hasLongRepeat = /(.)\1{2,}/.test(local);
    const uniqueChars = new Set(local.split('')).size;
    const lowVariety = uniqueChars <= 2 && local.length >= 6;
    const blockedLocals = ['gmail', 'email', 'user', 'admin', 'test', 'abcd', 'wxyz', 'qwerty'];
    const hasVowel = /[aeiou]/.test(local);
    const letters = (local.match(/[a-z]/g) || []).length;
    let looksRandomConsonants = false;
    if (letters >= 8) {
      const vowels = (local.match(/[aeiou]/g) || []).length;
      if (vowels / Math.max(1, letters) < 0.25 && local.indexOf('.') === -1 && local.indexOf('_') === -1 && local.indexOf('-') === -1) {
        looksRandomConsonants = true;
      }
    }

    if (!local || hasLongRepeat || lowVariety || blockedLocals.includes(local) || !hasVowel || looksRandomConsonants) {
      setIsAllowed(false);
      setError('Please provide a valid Gmail address with your real name (e.g., firstname.lastname@gmail.com).');
      if (onValidationChange) onValidationChange(false);
      return;
    }

    setIsChecking(true);
    setError('');
    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000';
      const res = await axios.get(`${apiUrl}/api/auth/emails/exists/`, { params: { email: value } });
      const exists = !!res.data?.exists;
      if (exists) {
        setIsAllowed(false);
        setError('Exsisting Email ID');
        if (onValidationChange) onValidationChange(false);
      } else {
        setIsAllowed(true);
        if (onValidationChange) onValidationChange(true);
      }
    } catch (e) {
      setIsAllowed(null);
      setError('');
      if (onValidationChange) onValidationChange(null);
    } finally {
      setIsChecking(false);
    }
  };

  if (!email || !email.includes('@')) {
    return null;
  }

  if (isChecking) {
    return (
      <div className="flex items-center mt-2 text-sm text-gray-600">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2"></div>
        Checking email...
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-2 text-sm text-red-600 flex items-center">
        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
        {error}
      </div>
    );
  }

  if (isAllowed === true) {
    return (
      <div className="mt-2 text-sm text-green-600 flex items-center">
        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
        Email is available
      </div>
    );
  }

  if (isAllowed === false) {
    return (
      <div className="mt-2 text-sm text-red-600 flex items-center">
        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
        </svg>
        Existing Email ID
      </div>
    );
  }

  return null;
};

export default EmailValidationChecker;