import http from './http-common';
import authManager from '../utils/authManager';

const eventService = {
    // Events (read-only for dashboard usage)
    listEvents: async (params = {}) => {
        const res = await http.get('/api/events/', { params });
        return res.data;
    },
    getEvent: async (id) => {
        const res = await http.get(`/api/events/${id}/`);
        return res.data;
    },
    createEvent: async (payload) => {
        const res = await http.post('/api/events/', payload);
        return res.data;
    },
    updateEvent: async (id, payload) => {
        const res = await http.patch(`/api/events/${id}/`, payload);
        return res.data;
    },
    deleteEvent: async (id) => {
        const res = await http.delete(`/api/events/${id}/`);
        return res.data;
    },
    assignVolunteers: async (id, volunteerIds) => {
        const res = await http.post(`/api/events/${id}/assign-volunteers/`, { volunteer_ids: volunteerIds });
        return res.data;
    },
    publishEvent: async (id, isPublished) => {
        const res = await http.patch(`/api/events/${id}/`, { is_published: isPublished });
        return res.data;
    },
    togglePublish: async (id) => {
        const res = await http.patch(`/api/events/${id}/toggle-publish/`);
        return res.data;
    },

    // Student-specific: dedicated endpoint for published events
    listPublishedEvents: async (params = {}) => {
        const res = await http.get('/api/events/published/', { params });
        return res.data;
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
        const res = await http.get(`/api/events/${eventId}/participants/?chess_number=${chessNumber}`);
        return res.data;
    },
    
    listMyRegistrations: async () => {
        const res = await http.get('/api/events/my-registrations/');
        return res.data;
    },

    registerForEvent: async (eventId, firstName, lastName) => {
        const res = await http.post('/api/events/registrations/', {
            event: eventId,
            first_name: firstName,
            last_name: lastName
        });
        return res.data;
    },

    // Venues (read-only here)
    listVenues: async () => {
        const res = await http.get('/api/events/venues/');
        return res.data;
    },
};

export default eventService;