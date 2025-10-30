import { mockEvents, mockVenues, mockRegistrations, delay } from './mockData';

const mockEventService = {
  // Events
  listEvents: async (params = {}) => {
    await delay();
    let events = [...mockEvents];
    
    if (params.category) {
      events = events.filter(e => e.category === params.category);
    }
    if (params.date) {
      events = events.filter(e => e.date === params.date);
    }
    
    return events;
  },

  getEvent: async (id) => {
    await delay();
    return mockEvents.find(e => e.id === parseInt(id)) || null;
  },

  createEvent: async (payload) => {
    await delay();
    const newEvent = {
      id: mockEvents.length + 1,
      ...payload,
      created_at: new Date().toISOString()
    };
    mockEvents.push(newEvent);
    return newEvent;
  },

  updateEvent: async (id, payload) => {
    await delay();
    const index = mockEvents.findIndex(e => e.id === parseInt(id));
    if (index !== -1) {
      mockEvents[index] = { ...mockEvents[index], ...payload };
      return mockEvents[index];
    }
    throw new Error('Event not found');
  },

  deleteEvent: async (id) => {
    await delay();
    const index = mockEvents.findIndex(e => e.id === parseInt(id));
    if (index !== -1) {
      mockEvents.splice(index, 1);
      return { success: true };
    }
    throw new Error('Event not found');
  },

  assignVolunteers: async (id, volunteerIds) => {
    await delay();
    const event = mockEvents.find(e => e.id === parseInt(id));
    if (event) {
      event.volunteers = volunteerIds;
      return event;
    }
    throw new Error('Event not found');
  },

  publishEvent: async (id, isPublished) => {
    await delay();
    const event = mockEvents.find(e => e.id === parseInt(id));
    if (event) {
      event.is_published = isPublished;
      return event;
    }
    throw new Error('Event not found');
  },

  togglePublish: async (id) => {
    await delay();
    const event = mockEvents.find(e => e.id === parseInt(id));
    if (event) {
      event.is_published = !event.is_published;
      return event;
    }
    throw new Error('Event not found');
  },

  listPublishedEvents: async (params = {}) => {
    await delay();
    return mockEvents.filter(e => e.is_published);
  },

  listMyAssignedEvents: async () => {
    await delay();
    // Return events where current user is assigned as judge
    return mockEvents.filter(e => e.judges && e.judges.length > 0);
  },

  listParticipantsForEvent: async (eventId) => {
    await delay();
    return mockRegistrations.filter(r => r.event === parseInt(eventId));
  },

  getParticipantByChessNumber: async (chessNumber, eventId) => {
    await delay();
    const registration = mockRegistrations.find(r => 
      r.chess_number === chessNumber && r.event === parseInt(eventId)
    );
    return registration ? registration.participant_details : null;
  },

  listMyRegistrations: async () => {
    await delay();
    return mockRegistrations;
  },

  registerForEvent: async (eventId, firstName, lastName) => {
    await delay();
    const event = mockEvents.find(e => e.id === parseInt(eventId));
    if (!event) {
      throw new Error('Event not found');
    }
    
    const newRegistration = {
      id: mockRegistrations.length + 1,
      event: parseInt(eventId),
      participant: mockRegistrations.length + 1,
      first_name: firstName,
      last_name: lastName,
      chess_number: `CH${String(mockRegistrations.length + 1).padStart(3, '0')}`,
      registration_date: new Date().toISOString(),
      participant_details: {
        first_name: firstName,
        last_name: lastName,
        school: { name: "Demo School" },
        section: "Class 10A"
      },
      event_details: event
    };
    
    mockRegistrations.push(newRegistration);
    return newRegistration;
  },

  listVenues: async () => {
    await delay();
    return mockVenues;
  }
};

export default mockEventService;
