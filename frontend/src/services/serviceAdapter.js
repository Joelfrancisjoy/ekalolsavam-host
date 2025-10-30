import { isBackendAvailable } from './mockData';
import eventService from './eventService';
import userService from './userService';
import resultService from './resultService';
import mockEventService from './mockEventService';
import mockUserService from './mockUserService';
import mockResultService from './mockResultService';

// Service adapter that automatically switches between real and mock services
export const getEventService = () => {
  return isBackendAvailable() ? eventService : mockEventService;
};

export const getUserService = () => {
  return isBackendAvailable() ? userService : mockUserService;
};

export const getResultService = () => {
  return isBackendAvailable() ? resultService : mockResultService;
};

// Export the current services (will be mock if no backend)
export const eventServiceAdapter = getEventService();
export const userServiceAdapter = getUserService();
export const resultServiceAdapter = getResultService();

const serviceAdapter = {
  eventService: eventServiceAdapter,
  userService: userServiceAdapter,
  resultService: resultServiceAdapter
};

export default serviceAdapter;
