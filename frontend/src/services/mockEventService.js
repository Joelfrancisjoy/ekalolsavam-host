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

  recommendTimeslots: async (id, payload = {}) => {
    await delay();
    const event = mockEvents.find(e => e.id === parseInt(id));
    if (!event) {
      throw new Error('Event not found');
    }

    const fromDate = payload.from_date || event.date;
    const toDate = payload.to_date || event.date;
    const topK = Number(payload.top_k || 5);
    const venueId = payload.venue_id || event.venue || mockVenues[0]?.id;
    const venue = mockVenues.find((v) => v.id === Number(venueId)) || mockVenues[0];

    const recommendations = Array.from({ length: Math.max(1, topK) }).map((_, idx) => ({
      date: fromDate,
      start_time: `0${9 + idx}:00:00`.slice(-8),
      end_time: `0${10 + idx}:00:00`.slice(-8),
      venue_id: venue?.id || null,
      venue_name: venue?.name || 'Venue',
      predicted_conflict_penalty: Number((idx * 0.2).toFixed(2)),
      conflict_breakdown: {
        venue_overlap: idx === 0 ? 0 : 1,
        judge_overlap: 0,
        volunteer_overlap: 0,
        total_overlap: idx === 0 ? 0 : 1,
      },
      method: 'rule_based_fallback',
    }));

    return {
      event: {
        id: event.id,
        name: event.name,
        category: event.category,
      },
      recommendation_goal: 'conflict_avoidance',
      window: {
        from_date: fromDate,
        to_date: toDate,
      },
      count: recommendations.length,
      recommendations,
    };
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
    return registration || null;
  },

  lookupParticipantByChessNumber: async (chessNumber) => {
    await delay();

    const registration = mockRegistrations.find(r => r.chess_number === chessNumber);
    if (!registration) return null;

    const participant = registration.participant_details || {};

    const participations = mockRegistrations
      .filter(r => (r.participant === registration.participant) || (
        r.participant_details?.first_name === participant.first_name &&
        r.participant_details?.last_name === participant.last_name
      ))
      .map(r => {
        const ev = mockEvents.find(e => e.id === r.event);
        return {
          registration_id: r.id,
          event: ev ? {
            id: ev.id,
            name: ev.name,
            category: ev.category,
            date: ev.date,
            start_time: ev.start_time,
            end_time: ev.end_time,
            venue: ev.venue,
          } : { id: r.event },
          chess_number: r.chess_number,
          status: r.status,
          registration_date: r.registration_date,
        };
      });

    return {
      chess_number: chessNumber,
      participant: {
        first_name: participant.first_name,
        last_name: participant.last_name,
        section: participant.section,
        student_class: participant.student_class,
        school: participant.school,
        gender: participant.gender || '',
      },
      participations,
    };
  },

  listMyRegistrations: async () => {
    await delay();
    return mockRegistrations;
  },

  registerForEvent: async (eventId, firstName, lastName, groupId = '', gender = 'BOYS') => {
    await delay();
    const event = mockEvents.find(e => e.id === parseInt(eventId));
    if (!event) {
      throw new Error('Event not found');
    }

    const normalizedGender = String(gender || '').toUpperCase() === 'GIRLS' ? 'GIRLS' : 'BOYS';

    const newRegistration = {
      id: mockRegistrations.length + 1,
      event: parseInt(eventId),
      participant: mockRegistrations.length + 1,
      first_name: firstName,
      last_name: lastName,
      group_id: String(groupId || '').trim().toUpperCase() || undefined,
       gender: normalizedGender,
      chess_number: `CH${String(mockRegistrations.length + 1).padStart(3, '0')}`,
      registration_date: new Date().toISOString(),
      participant_details: {
        first_name: firstName,
        last_name: lastName,
        school: { name: "Demo School" },
        section: "Class 10A",
        gender: normalizedGender
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
