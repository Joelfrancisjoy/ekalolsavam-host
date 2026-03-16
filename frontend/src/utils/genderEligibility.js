const toMessageString = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value.trim();
  if (Array.isArray(value)) {
    return value.map((item) => toMessageString(item)).filter(Boolean).join(' ');
  }
  if (typeof value === 'object') {
    return (
      toMessageString(value.detail) ||
      toMessageString(value.error) ||
      toMessageString(value.non_field_errors) ||
      ''
    );
  }
  return '';
};

export const extractApiErrorMessage = (error) => {
  if (!error) return '';
  return (
    toMessageString(error?.response?.data) ||
    toMessageString(error?.data) ||
    toMessageString(error?.message) ||
    ''
  );
};

export const COORDINATOR_HELP_TEXT =
  'Please contact your school or event coordinator to confirm eligibility rules for this event.';

export const mapGenderRuleErrorToUi = (error) => {
  const backendMessage = extractApiErrorMessage(error);
  const normalized = backendMessage.toLowerCase();
  if (!backendMessage) return null;

  if (normalized.includes('your gender is not set')) {
    return {
      message: 'Your profile is missing gender. Update your profile and try again.',
      cta: { type: 'update_profile', label: 'Update profile' },
      helperText: '',
    };
  }

  if (normalized.includes('no eligibility rule is configured for your level')) {
    return {
      message: 'Eligibility rules are not configured for your level on this event yet.',
      cta: { type: 'contact_coordinator', label: 'Contact coordinator' },
      helperText: `This may be a legacy event setup. Some legacy events may still allow registration. ${COORDINATOR_HELP_TEXT}`,
    };
  }

  if (normalized.includes('not eligible') && normalized.includes('gender')) {
    return {
      message: 'You are not eligible for this event based on the configured gender rule.',
      cta: { type: 'contact_coordinator', label: 'Contact coordinator' },
      helperText: COORDINATOR_HELP_TEXT,
    };
  }

  return null;
};
