import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SchoolDashboard from './SchoolDashboard';
import http from '../services/http-common';

jest.mock('../services/http-common', () => ({
  get: jest.fn(),
  post: jest.fn(),
}));

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

jest.mock('../components/UserInfoHeader', () => () => <div data-testid="user-info-header" />);
jest.mock('../components/Toast', () => () => null);
jest.mock('../components/SchoolGroupParticipantsSection', () => () => <div data-testid="group-participants-section" />);

const setupDashboardGetMock = (eligibleByKey = {}) => {
  http.get.mockImplementation((url, config = {}) => {
    if (url === '/api/auth/current/') {
      return Promise.resolve({ data: { id: 7, username: 'school-user' } });
    }
    if (url === '/api/auth/schools/participants/') {
      return Promise.resolve({ data: [] });
    }
    if (url === '/api/auth/schools/individual-events/') {
      const studentClass = Number(config?.params?.student_class);
      const gender = String(config?.params?.gender_category || '');
      const key = `${studentClass}|${gender}`;
      return Promise.resolve({ data: eligibleByKey[key] || [] });
    }
    return Promise.resolve({ data: [] });
  });
};

describe('SchoolDashboard participant eligibility filtering', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('keeps event list empty until class and gender are chosen', async () => {
    setupDashboardGetMock({
      '5|BOYS': [{ id: 1, name: 'Essay' }],
    });

    render(<SchoolDashboard />);
    await screen.findByTestId('user-info-header');

    await waitFor(() => {
      expect(http.get).toHaveBeenCalledWith('/api/auth/current/');
      expect(http.get).toHaveBeenCalledWith('/api/auth/schools/participants/');
    });

    expect(screen.getByText('Select class and gender to load eligible events.')).toBeInTheDocument();
    const eventCalls = http.get.mock.calls.filter(([url]) => url === '/api/auth/schools/individual-events/');
    expect(eventCalls).toHaveLength(0);
  });

  test('loads only compatible events after class and gender are selected', async () => {
    setupDashboardGetMock({
      '5|BOYS': [{ id: 1, name: 'Essay' }],
    });

    render(<SchoolDashboard />);
    await screen.findByTestId('user-info-header');
    const classInput = screen.getByPlaceholderText('Enter Class');
    await userEvent.type(classInput, '5');
    await userEvent.selectOptions(screen.getByDisplayValue('Select Gender'), 'BOYS');

    expect(await screen.findByLabelText('Essay')).toBeInTheDocument();

    const matchingCall = http.get.mock.calls.find(([url, config]) => (
      url === '/api/auth/schools/individual-events/'
      && config?.params?.student_class === 5
      && config?.params?.gender_category === 'BOYS'
    ));
    expect(matchingCall).toBeTruthy();
  });

  test('clears stale selected events when eligibility changes', async () => {
    setupDashboardGetMock({
      '5|BOYS': [
        { id: 1, name: 'Essay' },
        { id: 2, name: 'Poem' },
      ],
      '6|BOYS': [
        { id: 2, name: 'Poem' },
      ],
    });

    render(<SchoolDashboard />);
    await screen.findByTestId('user-info-header');
    const classInput = screen.getByPlaceholderText('Enter Class');
    await userEvent.type(classInput, '5');
    await userEvent.selectOptions(screen.getByDisplayValue('Select Gender'), 'BOYS');

    const essayCheckbox = await screen.findByLabelText('Essay');
    await userEvent.click(essayCheckbox);
    expect(essayCheckbox).toBeChecked();

    await userEvent.clear(classInput);
    await userEvent.type(classInput, '6');
    await waitFor(() => expect(screen.queryByLabelText('Essay')).not.toBeInTheDocument());

    await userEvent.clear(classInput);
    await userEvent.type(classInput, '5');
    const essayAfterReset = await screen.findByLabelText('Essay');
    expect(essayAfterReset).not.toBeChecked();
  });

  test('bulk preview reports incompatible event_ids before submit', async () => {
    setupDashboardGetMock({
      '5|BOYS': [{ id: 1, name: 'Essay' }],
    });

    render(<SchoolDashboard />);
    await screen.findByTestId('user-info-header');
    await userEvent.click(screen.getByRole('button', { name: /bulk import/i }));

    const csv = [
      'participant_id,first_name,last_name,student_class,gender,event_ids',
      'P001,John,Doe,5,BOYS,999',
    ].join('\n');

    await userEvent.type(
      screen.getByPlaceholderText('participant_id,first_name,last_name,student_class,gender,event_ids'),
      csv
    );
    await userEvent.click(screen.getByRole('button', { name: /preview import/i }));

    expect(await screen.findByText(/Row 2: event_ids contain ineligible event\(s\)/i)).toBeInTheDocument();

    const importButton = await screen.findByRole('button', { name: /Import 1 Participant\(s\)/i });
    expect(importButton).toBeDisabled();
  });
});
