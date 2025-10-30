import { mockResults, mockEvents, delay } from './mockData';

const mockResultService = {
  listResults: async (params = {}) => {
    await delay();
    let results = [...mockResults];
    
    if (params.event_id) {
      results = results.filter(r => r.event === parseInt(params.event_id));
    }
    
    return results;
  },

  getPublishedResults: async () => {
    await delay();
    return mockResults;
  },

  submitScore: async (eventId, participantId, score, criteria) => {
    await delay();
    const result = mockResults.find(r => 
      r.event === parseInt(eventId) && r.participant === parseInt(participantId)
    );
    
    if (result) {
      result.score = score;
      result.criteria = criteria;
      return result;
    }
    
    // Create new result
    const newResult = {
      id: mockResults.length + 1,
      event: parseInt(eventId),
      participant: parseInt(participantId),
      score: score,
      criteria: criteria,
      position: null,
      event_details: mockEvents.find(e => e.id === parseInt(eventId)),
      participant_details: { first_name: "Demo", last_name: "Participant" }
    };
    
    mockResults.push(newResult);
    return newResult;
  },

  publishResults: async (eventId) => {
    await delay();
    const eventResults = mockResults.filter(r => r.event === parseInt(eventId));
    
    // Sort by score and assign positions
    eventResults.sort((a, b) => b.score - a.score);
    eventResults.forEach((result, index) => {
      result.position = index + 1;
    });
    
    return { success: true, results: eventResults };
  }
};

export default mockResultService;
