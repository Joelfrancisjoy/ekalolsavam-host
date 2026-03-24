import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StudentDashboard from './StudentDashboard';
import http from '../services/http-common';
import { API_ROUTES } from '../services/apiRoutes';
import {
  eventServiceAdapter as eventService,
  resultServiceAdapter as resultService
} from '../services/serviceAdapter';

jest.mock('../services/http-common', () => ({
  get: jest.fn(),
  patch: jest.fn(),
  post: jest.fn(),
}));

jest.mock('../services/serviceAdapter', () => ({
  eventServiceAdapter: {
    listMyRegistrations: jest.fn(),
    listPublishedEvents: jest.fn(),
    registerForEvent: jest.fn(),
  },
  resultServiceAdapter: {
    list: jest.fn(),
  },
}));

jest.mock('../components/UserInfoHeader', () => () => <div data-testid="user-info-header" />);
jest.mock('../components/StudentFeedbackDisplay', () => () => <div data-testid="student-feedback-display" />);
jest.mock('../services/feedbackService', () => ({ submitFeedback: jest.fn() }));
jest.mock('../utils/authManager', () => ({ setTokens: jest.fn() }));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key) => key }),
}));

const defaultCurrentUser = {
  id: 7,
  role: 'student',
  first_name: 'John',
  last_name: 'Doe',
  phone: '9876543210',
  gender: 'BOYS',
  must_reset_password: false
};

const defaultAllowedPayload = {
  event_ids: [11],
  group_entries: [
    {
      id: 99,
      group_id: 'GRP-101',
      group_class: 'HS',
      gender_category: 'BOYS',
      participant_count: 2,
      leader_index: 1,
      leader_full_name: 'Alice Leader',
      participants: [
        { first_name: 'ALICE', last_name: 'LEADER' },
        { first_name: 'BOB', last_name: 'MEMBER' }
      ],
      event_ids: [11],
      events_display: ['Group Song']
    }
  ]
};

const defaultGroupProfile = {
  group_id: 'GRP-101',
  group_class: 'HS',
  gender_category: 'BOYS',
  notes: 'Existing note',
  participants: [
    { id: 401, first_name: 'ALICE', last_name: 'LEADER', gender: 'GIRLS', student_class: '8', phone: '9876500001' },
    { member_order: 2, first_name: 'BOB', last_name: 'MEMBER', gender: 'BOYS', student_class: '8', phone: '9876500002' }
  ]
};

const configureDashboardMocks = ({
  currentUser = defaultCurrentUser,
  allowedPayload = defaultAllowedPayload,
  groupProfileHandler = null,
  patchHandler = null
} = {}) => {
  eventService.listMyRegistrations.mockResolvedValue([]);
  eventService.listPublishedEvents.mockResolvedValue([]);
  eventService.registerForEvent.mockResolvedValue({});
  resultService.list.mockResolvedValue([]);

  http.get.mockImplementation((url) => {
    if (url === '/api/auth/current/') {
      return Promise.resolve({ data: currentUser });
    }
    if (url === '/api/auth/students/allowed-events/') {
      return Promise.resolve({ data: allowedPayload });
    }
    if (String(url).startsWith('/api/auth/students/group-profiles/')) {
      if (typeof groupProfileHandler === 'function') {
        return groupProfileHandler(url);
      }
      return Promise.resolve({ data: defaultGroupProfile });
    }
    return Promise.resolve({ data: [] });
  });

  if (typeof patchHandler === 'function') {
    http.patch.mockImplementation(patchHandler);
  } else {
    http.patch.mockResolvedValue({ data: {} });
  }
};

const openRegisterModal = async () => {
  await userEvent.click(screen.getByRole('button', { name: /event registration/i }));
  await screen.findByText(/student identity verification/i);
};

const getModalScopeByTitle = async (titleMatcher) => {
  const heading = await screen.findByRole('heading', { name: titleMatcher });
  const modalRoot = heading.closest('div.bg-white.rounded-2xl');
  return modalRoot ? within(modalRoot) : within(document.body);
};

const verifyIdentityForRegistration = async () => {
  const firstNameInput = await screen.findByPlaceholderText('Enter your first name');
  const lastNameInput = await screen.findByPlaceholderText('Enter your last name');
  await userEvent.clear(firstNameInput);
  await userEvent.type(firstNameInput, 'JOHN');
  await userEvent.clear(lastNameInput);
  await userEvent.type(lastNameInput, 'DOE');
  await userEvent.click(screen.getByRole('button', { name: /verify identity/i }));
  await screen.findByText(/identity verified/i);
};

describe('StudentDashboard profile endpoint integrations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('saves student profile via PATCH /api/auth/profile/', async () => {
    configureDashboardMocks({
      patchHandler: (url) => {
        if (url === '/api/auth/profile/') {
          return Promise.resolve({ data: {} });
        }
        return Promise.resolve({ data: {} });
      }
    });

    render(<StudentDashboard />);
    await screen.findByTestId('user-info-header');

    await userEvent.click(screen.getByRole('button', { name: /^edit profile$/i }));
    const modalScope = await getModalScopeByTitle(/edit profile/i);

    const phoneInput = await modalScope.findByDisplayValue('9876543210');
    await userEvent.clear(phoneInput);
    await userEvent.type(phoneInput, '9998887777');
    await userEvent.selectOptions(modalScope.getByRole('combobox'), 'BOYS');

    await userEvent.click(modalScope.getByRole('button', { name: /save profile/i }));

    await waitFor(() => {
      expect(http.patch).toHaveBeenCalledWith('/api/auth/profile/', {
        first_name: 'John',
        last_name: 'Doe',
        phone: '9998887777',
        gender: 'BOYS'
      });
    });
  });

  test('shows inline field errors for student profile 400 responses', async () => {
    configureDashboardMocks({
      patchHandler: () => Promise.reject({
        response: {
          status: 400,
          data: {
            phone: ['Invalid phone number.'],
            gender: ['Invalid gender value.']
          }
        }
      })
    });

    render(<StudentDashboard />);
    await screen.findByTestId('user-info-header');

    await userEvent.click(screen.getByRole('button', { name: /^edit profile$/i }));
    const modalScope = await getModalScopeByTitle(/edit profile/i);
    await modalScope.findByDisplayValue('John');
    await modalScope.findByDisplayValue('Doe');

    const genderSelect = await modalScope.findByRole('combobox');
    await userEvent.selectOptions(genderSelect, 'BOYS');
    await userEvent.click(modalScope.getByRole('button', { name: /save profile/i }));
    await waitFor(() => expect(http.patch).toHaveBeenCalledWith('/api/auth/profile/', expect.any(Object)));

    expect(await screen.findByText('Invalid phone number.')).toBeInTheDocument();
    expect(screen.getByText('Invalid gender value.')).toBeInTheDocument();
  });

  test('loads and updates group leader profile via group-profiles endpoints', async () => {
    configureDashboardMocks({
      groupProfileHandler: () => Promise.resolve({
        data: {
          group_id: 'GRP-101',
          group_class: 'HS',
          gender_category: 'BOYS',
          notes: 'Existing note',
          participants: [
            { id: 401, first_name: 'ALICE', last_name: 'LEADER', gender: 'GIRLS', student_class: '8', phone: '9876500001' },
            { member_order: 2, first_name: 'BOB', last_name: 'MEMBER', gender: 'BOYS', student_class: '8', phone: '9876500002' }
          ]
        }
      }),
      patchHandler: () => Promise.resolve({ data: {} })
    });

    render(<StudentDashboard />);
    await screen.findByTestId('user-info-header');
    await openRegisterModal();
    await verifyIdentityForRegistration();

    const [editGroupButton] = await screen.findAllByRole('button', { name: /edit group profile/i });
    await userEvent.click(editGroupButton);

    await waitFor(() => {
      expect(http.get).toHaveBeenCalledWith(API_ROUTES.students.groupProfile(99));
    });

    const groupScope = await getModalScopeByTitle(/edit group profile/i);

    await groupScope.findByText(/Group ID:\s*GRP-101/i);
    await userEvent.selectOptions(await groupScope.findByDisplayValue('BOYS'), 'MIXED');
    const firstNameInput = await groupScope.findByDisplayValue('ALICE');
    await userEvent.clear(firstNameInput);
    await userEvent.type(firstNameInput, 'Asha');
    const classInputs = await groupScope.findAllByDisplayValue('8');
    await userEvent.clear(classInputs[0]);
    await userEvent.type(classInputs[0], '9');
    const phoneInputs = await groupScope.findAllByDisplayValue(/987650000/);
    await userEvent.clear(phoneInputs[0]);
    await userEvent.type(phoneInputs[0], '9998887777');
    const noteInput = await groupScope.findByDisplayValue('Existing note');
    await userEvent.clear(noteInput);
    await userEvent.type(noteInput, 'Updated by student');
    await userEvent.click(groupScope.getByRole('button', { name: /save group profile/i }));

    await waitFor(() => {
      expect(http.patch).toHaveBeenCalledWith(API_ROUTES.students.groupProfile(99), {
        gender_category: 'MIXED',
        notes: 'Updated by student',
        participants: [
          { id: 401, first_name: 'Asha', last_name: 'LEADER', gender: 'GIRLS', student_class: '9', phone: '9998887777' },
          { member_order: 2, first_name: 'BOB', last_name: 'MEMBER', gender: 'BOYS', student_class: '8', phone: '9876500002' }
        ]
      });
    });
  });

  test('shows role error on group profile GET 403', async () => {
    configureDashboardMocks({
      groupProfileHandler: () => Promise.reject({
        response: {
          status: 403,
          data: { detail: 'Forbidden' }
        }
      })
    });

    render(<StudentDashboard />);
    await screen.findByTestId('user-info-header');
    await openRegisterModal();
    await verifyIdentityForRegistration();
    const [editGroupButton] = await screen.findAllByRole('button', { name: /edit group profile/i });
    await userEvent.click(editGroupButton);

    expect(await screen.findByText('Your role is not allowed to edit this group profile.')).toBeInTheDocument();
  });

  test('shows ownership error on group profile PATCH 404', async () => {
    configureDashboardMocks({
      groupProfileHandler: () => Promise.resolve({ data: defaultGroupProfile }),
      patchHandler: () => Promise.reject({
        response: {
          status: 404,
          data: { detail: 'Not found' }
        }
      })
    });

    render(<StudentDashboard />);
    await screen.findByTestId('user-info-header');
    await openRegisterModal();
    await verifyIdentityForRegistration();
    const [editGroupButton] = await screen.findAllByRole('button', { name: /edit group profile/i });
    await userEvent.click(editGroupButton);

    const groupScope = await getModalScopeByTitle(/edit group profile/i);
    await userEvent.click(await groupScope.findByRole('button', { name: /save group profile/i }));

    expect(await screen.findByText('This group profile was not found or is not owned by your account.')).toBeInTheDocument();
  });

  test('shows inline validation errors on group profile PATCH 400', async () => {
    configureDashboardMocks({
      groupProfileHandler: () => Promise.resolve({ data: defaultGroupProfile }),
      patchHandler: () => Promise.reject({
        response: {
          status: 400,
          data: {
            gender_category: ['Invalid category.'],
            notes: ['Notes too long.'],
            participants: [
              { first_name: ['First name required.'], phone: ['Invalid phone number.'] },
              'Participant row has errors.'
            ]
          }
        }
      })
    });

    render(<StudentDashboard />);
    await screen.findByTestId('user-info-header');
    await openRegisterModal();
    await verifyIdentityForRegistration();
    const [editGroupButton] = await screen.findAllByRole('button', { name: /edit group profile/i });
    await userEvent.click(editGroupButton);

    const groupScope = await getModalScopeByTitle(/edit group profile/i);
    await userEvent.click(await groupScope.findByRole('button', { name: /save group profile/i }));

    expect(await screen.findByText('Invalid category.')).toBeInTheDocument();
    expect(screen.getByText('Notes too long.')).toBeInTheDocument();
    expect(screen.getByText('First name required.')).toBeInTheDocument();
    expect(screen.getByText('Invalid phone number.')).toBeInTheDocument();
    expect(screen.getByText('Participant row has errors.')).toBeInTheDocument();
  });
});
