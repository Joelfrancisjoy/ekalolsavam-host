import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SchoolGroupParticipantsAdmin from './SchoolGroupParticipantsAdmin';
import http from '../services/http-common';
import { API_ROUTES } from '../services/apiRoutes';

jest.mock('../services/http-common', () => ({
  get: jest.fn(),
  patch: jest.fn(),
  post: jest.fn()
}));

const baseEntry = {
  id: 31,
  group_id: 'GRP-31',
  group_class: 'HS',
  gender_category: 'BOYS',
  participant_count: 2,
  leader_index: 1,
  leader_full_name: 'Alice Leader',
  participants: [
    { id: 901, first_name: 'ALICE', last_name: 'LEADER', gender: 'GIRLS', student_class: '8', phone: '9991112222' },
    { member_order: 2, first_name: 'BOB', last_name: 'MEMBER', gender: 'BOYS', student_class: '8', phone: '9991113333' }
  ],
  events_display: ['Group Song'],
  status: 'pending',
  review_notes: 'Initial admin note',
  submitted_at: '2025-01-01T10:00:00Z',
  school_name: 'ABC School'
};

const renderAdmin = () => render(
  <MemoryRouter>
    <SchoolGroupParticipantsAdmin />
  </MemoryRouter>
);

const setupListMock = (entry = baseEntry) => {
  http.get.mockImplementation((url) => {
    if (url === API_ROUTES.admin.schoolGroupParticipants) {
      return Promise.resolve({ data: { results: [entry], count: 1, next: null, previous: null } });
    }
    return Promise.resolve({ data: [] });
  });
};

const openDetailsModal = async () => {
  const viewButton = await screen.findByRole('button', { name: /^view$/i });
  await userEvent.click(viewButton);
  const heading = await screen.findByRole('heading', { name: /group entry details/i });
  const modalRoot = heading.closest('div.relative.w-full');
  return modalRoot ? within(modalRoot) : within(document.body);
};

describe('SchoolGroupParticipantsAdmin member edit integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupListMock();
    http.post.mockResolvedValue({ data: {} });
    http.patch.mockResolvedValue({ data: {} });
  });

  test('submits full member payload to PATCH /api/auth/admin/school-group-participants/:groupEntryId', async () => {
    renderAdmin();
    const modal = await openDetailsModal();

    await userEvent.selectOptions(modal.getByDisplayValue('BOYS'), 'MIXED');
    const firstNameInput = await modal.findByDisplayValue('ALICE');
    await userEvent.clear(firstNameInput);
    await userEvent.type(firstNameInput, 'Asha');

    const classInputs = await modal.findAllByDisplayValue('8');
    await userEvent.clear(classInputs[0]);
    await userEvent.type(classInputs[0], '9');

    const phoneInput = await modal.findByDisplayValue('9991112222');
    await userEvent.clear(phoneInput);
    await userEvent.type(phoneInput, '7776665555');

    const notesTextarea = modal.getByPlaceholderText('Optional notes to save with member updates');
    await userEvent.clear(notesTextarea);
    await userEvent.type(notesTextarea, 'Updated by admin');

    await userEvent.click(modal.getByRole('button', { name: /save member edits/i }));

    await waitFor(() => {
      expect(http.patch).toHaveBeenCalledWith(API_ROUTES.admin.schoolGroupParticipant(31), {
        gender_category: 'MIXED',
        notes: 'Updated by admin',
        participants: [
          { id: 901, first_name: 'Asha', last_name: 'LEADER', gender: 'GIRLS', student_class: '9', phone: '7776665555' },
          { member_order: 2, first_name: 'BOB', last_name: 'MEMBER', gender: 'BOYS', student_class: '8', phone: '9991113333' }
        ]
      });
    });
  });

  test('shows inline member and field errors for PATCH 400', async () => {
    http.patch.mockRejectedValue({
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
    });

    renderAdmin();
    const modal = await openDetailsModal();
    await userEvent.click(modal.getByRole('button', { name: /save member edits/i }));

    const globalErrors = await screen.findAllByText('Please correct the highlighted fields.');
    expect(globalErrors.length).toBeGreaterThan(0);
    expect((await screen.findAllByText('Invalid category.')).length).toBeGreaterThan(0);
    expect((await screen.findAllByText('Notes too long.')).length).toBeGreaterThan(0);
    expect(await screen.findAllByText('First name required.')).toHaveLength(1);
    expect(await screen.findAllByText('Invalid phone number.')).toHaveLength(1);
    expect(await screen.findAllByText('Participant row has errors.')).toHaveLength(1);
  });

  test('shows role restriction message for PATCH 403', async () => {
    http.patch.mockRejectedValue({
      response: {
        status: 403,
        data: { detail: 'Forbidden' }
      }
    });

    renderAdmin();
    const modal = await openDetailsModal();
    await userEvent.click(modal.getByRole('button', { name: /save member edits/i }));

    const roleErrors = await screen.findAllByText('Your role is not allowed to edit this group entry.');
    expect(roleErrors.length).toBeGreaterThan(0);
  });

  test('shows not found message for PATCH 404', async () => {
    http.patch.mockRejectedValue({
      response: {
        status: 404,
        data: { detail: 'Not found' }
      }
    });

    renderAdmin();
    const modal = await openDetailsModal();
    await userEvent.click(modal.getByRole('button', { name: /save member edits/i }));

    const notFoundErrors = await screen.findAllByText('This group entry was not found or is not accessible.');
    expect(notFoundErrors.length).toBeGreaterThan(0);
  });
});

