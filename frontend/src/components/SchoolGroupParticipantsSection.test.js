import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SchoolGroupParticipantsSection from './SchoolGroupParticipantsSection';
import http from '../services/http-common';

jest.mock('../services/http-common', () => ({
  get: jest.fn(),
  post: jest.fn()
}));

describe('SchoolGroupParticipantsSection submitted credentials', () => {
  const showToast = jest.fn();
  let consoleErrorSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    Object.defineProperty(window.navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: jest.fn().mockResolvedValue(undefined)
      }
    });
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  test('renders approved leader credentials and supports copy actions', async () => {
    http.get.mockImplementation((url) => {
      if (url === '/api/auth/schools/group-events/') {
        return Promise.resolve({ data: [] });
      }
      if (url === '/api/auth/schools/group-participants/') {
        return Promise.resolve({
          data: [
            {
              id: 1,
              group_id: 'GRP-101',
              group_class: 'HS',
              gender_category: 'MIXED',
              participant_count: 3,
              status: 'approved',
              leader_full_name: 'Leader One',
              leader_user_details: {
                username: 'grp_leader_101',
                temporary_password: 'tmp-pass-1'
              },
              events_display: ['Group Song']
            },
            {
              id: 2,
              group_id: 'GRP-102',
              group_class: 'UP',
              gender_category: 'GIRLS',
              participant_count: 4,
              status: 'approved',
              leader_full_name: 'Leader Two',
              leader_user_details: {
                username: 'grp_leader_102',
                temporary_password: null
              },
              events_display: ['Folk Dance']
            }
          ]
        });
      }
      return Promise.resolve({ data: [] });
    });

    render(<SchoolGroupParticipantsSection showToast={showToast} />);

    const submittedTab = await screen.findByRole('button', { name: /submitted groups/i });
    await userEvent.click(submittedTab);

    await waitFor(() => {
      expect(screen.getAllByText(/leader credentials/i).length).toBeGreaterThan(0);
    });

    expect(screen.getByText('grp_leader_101')).toBeInTheDocument();
    expect(screen.getByText('tmp-pass-1')).toBeInTheDocument();
    expect(screen.getByText('grp_leader_102')).toBeInTheDocument();
    expect(screen.getByText(/Temporary password is no longer available after reset/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Share credentials only with approved group leader/i).length).toBeGreaterThan(0);

    await userEvent.click(screen.getByRole('button', { name: /Copy leader username for GRP-101/i }));
    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith('grp_leader_101'));
    expect(showToast).toHaveBeenCalledWith('Username copied to clipboard.', 'success');

    await userEvent.click(screen.getByRole('button', { name: /Copy temporary password for GRP-101/i }));
    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith('tmp-pass-1'));
    expect(showToast).toHaveBeenCalledWith('Password copied to clipboard.', 'success');

    expect(screen.queryByRole('button', { name: /Copy temporary password for GRP-102/i })).not.toBeInTheDocument();
  });
});

describe('SchoolGroupParticipantsSection event eligibility filtering', () => {
  const showToast = jest.fn();
  let consoleErrorSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  test('keeps group events gated until class and gender are selected', async () => {
    http.get.mockImplementation((url) => {
      if (url === '/api/auth/schools/group-participants/') {
        return Promise.resolve({ data: [] });
      }
      if (url === '/api/auth/schools/group-events/') {
        return Promise.resolve({ data: [{ id: 11, name: 'Group Song' }] });
      }
      return Promise.resolve({ data: [] });
    });

    render(<SchoolGroupParticipantsSection showToast={showToast} />);

    expect(await screen.findByText(/Select group class and gender category to view eligible events/i)).toBeInTheDocument();
    const eventCalls = http.get.mock.calls.filter(([url]) => url === '/api/auth/schools/group-events/');
    expect(eventCalls).toHaveLength(0);
  });

  test('loads compatible group events and prunes stale selected events on class/gender change', async () => {
    http.get.mockImplementation((url, config = {}) => {
      if (url === '/api/auth/schools/group-participants/') {
        return Promise.resolve({ data: [] });
      }
      if (url === '/api/auth/schools/group-events/') {
        const groupClass = String(config?.params?.group_class || '');
        const gender = String(config?.params?.gender_category || '');
        if (groupClass === 'HS' && gender === 'BOYS') {
          return Promise.resolve({ data: [{ id: 11, name: 'Group Song' }] });
        }
        if (groupClass === 'UP' && gender === 'GIRLS') {
          return Promise.resolve({ data: [{ id: 22, name: 'Folk Dance' }] });
        }
        return Promise.resolve({ data: [] });
      }
      return Promise.resolve({ data: [] });
    });

    render(<SchoolGroupParticipantsSection showToast={showToast} />);
    const classSelect = screen.getByDisplayValue('Select class');
    const genderSelect = screen.getByDisplayValue('Select gender category');

    await userEvent.selectOptions(classSelect, 'HS');
    await userEvent.selectOptions(genderSelect, 'BOYS');

    const groupSongCheckbox = await screen.findByLabelText('Group Song');
    await userEvent.click(groupSongCheckbox);
    expect(groupSongCheckbox).toBeChecked();

    const firstCall = http.get.mock.calls.find(([url, requestConfig]) => (
      url === '/api/auth/schools/group-events/'
      && requestConfig?.params?.group_class === 'HS'
      && requestConfig?.params?.gender_category === 'BOYS'
    ));
    expect(firstCall).toBeTruthy();

    await userEvent.selectOptions(classSelect, 'UP');
    await userEvent.selectOptions(genderSelect, 'GIRLS');
    await waitFor(() => expect(screen.queryByLabelText('Group Song')).not.toBeInTheDocument());

    await userEvent.selectOptions(classSelect, 'HS');
    await userEvent.selectOptions(genderSelect, 'BOYS');
    const groupSongAfterReset = await screen.findByLabelText('Group Song');
    expect(groupSongAfterReset).not.toBeChecked();
  });
});
