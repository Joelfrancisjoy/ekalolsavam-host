import http from './http-common';

const catalogService = {
  listCategories: async () => {
    const res = await http.get('/api/catalog/categories/');
    return res.data;
  },
  listLevels: async () => {
    const res = await http.get('/api/catalog/levels/');
    return res.data;
  },
  listParticipationTypes: async () => {
    const res = await http.get('/api/catalog/participation-types/');
    return res.data;
  },
  listEventDefinitions: async () => {
    const res = await http.get('/api/catalog/events/');
    return res.data;
  },
  createEventDefinition: async (payload) => {
    const res = await http.post('/api/catalog/events/', payload);
    return res.data;
  },
  updateEventDefinition: async (id, payload) => {
    const res = await http.patch(`/api/catalog/events/${id}/`, payload);
    return res.data;
  },
  deleteEventDefinition: async (id) => {
    const res = await http.delete(`/api/catalog/events/${id}/`);
    return res.data;
  },
  listVariants: async (eventId) => {
    const res = await http.get(`/api/catalog/events/${eventId}/variants/`);
    return res.data;
  },
  createVariant: async (eventId, payload) => {
    const res = await http.post(`/api/catalog/events/${eventId}/variants/`, payload);
    return res.data;
  },
  listRules: async () => {
    const res = await http.get('/api/catalog/event-rules/');
    return res.data;
  },
  createRule: async (payload) => {
    const res = await http.post('/api/catalog/event-rules/', payload);
    return res.data;
  },
  updateRule: async (id, payload) => {
    const res = await http.patch(`/api/catalog/event-rules/${id}/`, payload);
    return res.data;
  },
  deleteRule: async (id) => {
    const res = await http.delete(`/api/catalog/event-rules/${id}/`);
    return res.data;
  },
};

export default catalogService;
