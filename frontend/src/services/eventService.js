import http from './http-common';

const PUBLISHED_STATUSES = [
    'published',
    'registration_closed',
    'in_progress',
    'scoring_closed',
    'results_published',
    'archived',
];

const normalizeEvent = (event) => {
    if (!event) return event;
    const status = event.status;
    return {
        ...event,
        is_published: PUBLISHED_STATUSES.includes(status),
    };
};

const eventService = {
    // Events (read-only for dashboard usage)
    listEvents: async (params = {}) => {
        const res = await http.get('/api/events/', { params });
        const data = res.data;
        return Array.isArray(data) ? data.map(normalizeEvent) : data;
    },
    getEvent: async (id) => {
        const res = await http.get(`/api/events/${id}/`);
        return normalizeEvent(res.data);
    },
    createEvent: async (payload) => {
        const res = await http.post('/api/events/', payload);
        return normalizeEvent(res.data);
    },
    updateEvent: async (id, payload) => {
        const res = await http.patch(`/api/events/${id}/`, payload);
        return normalizeEvent(res.data);
    },
    deleteEvent: async (id) => {
        const res = await http.delete(`/api/events/${id}/`);
        return res.data;
    },
    assignVolunteers: async (id, volunteerIds) => {
        const res = await http.post(`/api/events/${id}/assign-volunteers/`, { volunteer_ids: volunteerIds });
        return res.data;
    },
    recommendTimeslots: async (id, payload) => {
        const res = await http.post(`/api/events/${id}/recommend-timeslots/`, payload);
        return res.data;
    },
    publishEvent: async (id, isPublished) => {
        const current = await http.get(`/api/events/${id}/`);
        const status = current.data?.status;
        const alreadyPublished = PUBLISHED_STATUSES.includes(status);

        if (isPublished) {
            if (alreadyPublished) return normalizeEvent(current.data);
            await http.post(`/api/events/${id}/transition/`, { to: 'published' });
            const fresh = await http.get(`/api/events/${id}/`);
            return normalizeEvent(fresh.data);
        }

        if (!alreadyPublished && status === 'draft') return normalizeEvent(current.data);
        const res = await http.patch(`/api/events/${id}/`, { status: 'draft' });
        return normalizeEvent(res.data);
    },
    togglePublish: async (id) => {
        const current = await http.get(`/api/events/${id}/`);
        const status = current.data?.status;
        const isPublished = PUBLISHED_STATUSES.includes(status);
        if (isPublished) {
            const res = await http.patch(`/api/events/${id}/`, { status: 'draft' });
            return normalizeEvent(res.data);
        }
        await http.post(`/api/events/${id}/transition/`, { to: 'published' });
        const fresh = await http.get(`/api/events/${id}/`);
        return normalizeEvent(fresh.data);
    },

    // Student-specific: dedicated endpoint for published events
    listPublishedEvents: async (params = {}) => {
        const res = await http.get('/api/events/', { params: { ...params, published_only: true } });
        const data = res.data;
        return Array.isArray(data) ? data.map(normalizeEvent) : data;
    },
    // Judge-specific helpers
    listMyAssignedEvents: async () => {
        const res = await http.get('/api/events/my-assigned/');
        return res.data;
    },
    listParticipantsForEvent: async (eventId) => {
        const res = await http.get(`/api/events/${eventId}/participants/`);
        return res.data;
    },
    getParticipantByChessNumber: async (chessNumber, eventId) => {
        const res = await http.get(`/api/events/${eventId}/participants/`, {
            params: { chess_number: chessNumber },
        });
        const data = res.data;
        if (Array.isArray(data)) return data[0] || null;
        return data;
    },

    lookupParticipantByChessNumber: async (chessNumber) => {
        const res = await http.get('/api/events/participant-lookup/', {
            params: { chess_number: chessNumber },
        });
        return res.data;
    },

    listMyRegistrations: async () => {
        const res = await http.get('/api/events/my-registrations/');
        return res.data;
    },

    registerForEvent: async (eventId, firstName, lastName, groupId = '') => {
        const payload = {
            event: eventId,
            first_name: firstName,
            last_name: lastName
        };
        const normalizedGroupId = String(groupId || '').trim().toUpperCase();
        if (normalizedGroupId) {
            payload.group_id = normalizedGroupId;
        }
        const res = await http.post('/api/events/registrations/', payload);
        return res.data;
    },

    // Venues (read-only here)
    listVenues: async () => {
        const res = await http.get('/api/events/venues/');
        return res.data;
    },
};

export default eventService;
