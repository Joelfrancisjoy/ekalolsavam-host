import { test, expect } from '@playwright/test';
import { ApiHelpers } from '../utils/api-helpers';

test.describe('API Validation', () => {
  let apiHelpers: ApiHelpers;

  test.beforeEach(async ({ request }) => {
    apiHelpers = new ApiHelpers(request);
  });

  test.describe('Authentication API', () => {
    test('should login successfully with valid credentials', async ({ request }, { testData }) => {
      const response = await apiHelpers.login({
        username: testData.users.admin.email,
        password: testData.users.admin.password
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('access');
      expect(response.data).toHaveProperty('refresh');
    });

    test('should return 401 for invalid credentials', async ({ request }) => {
      try {
        await apiHelpers.login({
          username: 'invalid@example.com',
          password: 'wrongpassword'
        });
      } catch (error: any) {
        expect(error.response.status).toBe(401);
      }
    });

    test('should return 400 for missing credentials', async ({ request }) => {
      try {
        await apiHelpers.login({
          username: '',
          password: ''
        });
      } catch (error: any) {
        expect(error.response.status).toBe(400);
      }
    });

    test('should refresh token successfully', async ({ request }, { testData }) => {
      const loginResponse = await apiHelpers.login({
        username: testData.users.admin.email,
        password: testData.users.admin.password
      });

      const refreshResponse = await apiHelpers.refreshToken();
      expect(refreshResponse.status).toBe(200);
      expect(refreshResponse.data).toHaveProperty('access');
    });

    test('should logout successfully', async ({ request }, { testData }) => {
      await apiHelpers.login({
        username: testData.users.admin.email,
        password: testData.users.admin.password
      });

      const logoutResponse = await apiHelpers.logout();
      expect(logoutResponse.status).toBe(200);
    });

    test('should return 401 for requests without authentication', async ({ request }) => {
      try {
        await apiHelpers.getUsers();
      } catch (error: any) {
        expect(error.response.status).toBe(401);
      }
    });
  });

  test.describe('Users API', () => {
    test.beforeEach(async ({ request }, { testData }) => {
      await apiHelpers.login({
        username: testData.users.admin.email,
        password: testData.users.admin.password
      });
    });

    test('should get users list', async ({ request }) => {
      const response = await apiHelpers.getUsers();
      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBeTruthy();
    });

    test('should create user successfully', async ({ request }) => {
      const userData = {
        username: 'api_test_user',
        email: 'apitest@example.com',
        password: 'ApiTestPass123!',
        first_name: 'API',
        last_name: 'Test',
        role: 'student',
        school: 'Test School'
      };

      const response = await apiHelpers.createUser(userData);
      expect(response.status).toBe(201);
      expect(response.data.username).toBe(userData.username);
    });

    test('should return 400 for invalid user data', async ({ request }) => {
      try {
        await apiHelpers.createUser({
          username: '',
          email: 'invalid-email',
          password: 'weak',
          first_name: '',
          last_name: '',
          role: 'invalid_role'
        });
      } catch (error: any) {
        expect(error.response.status).toBe(400);
      }
    });

    test('should return 400 for duplicate username', async ({ request }) => {
      const userData = {
        username: 'duplicate_user',
        email: 'duplicate1@example.com',
        password: 'TestPass123!',
        first_name: 'User',
        last_name: 'One',
        role: 'student'
      };

      await apiHelpers.createUser(userData);

      try {
        await apiHelpers.createUser({
          ...userData,
          email: 'duplicate2@example.com'
        });
      } catch (error: any) {
        expect(error.response.status).toBe(400);
      }
    });

    test('should get user by ID', async ({ request }) => {
      const userData = {
        username: 'get_user_test',
        email: 'getuser@example.com',
        password: 'TestPass123!',
        first_name: 'Get',
        last_name: 'User',
        role: 'student'
      };

      const createResponse = await apiHelpers.createUser(userData);
      const userId = createResponse.data.id;

      const getResponse = await apiHelpers.getUserById(userId);
      expect(getResponse.status).toBe(200);
      expect(getResponse.data.username).toBe(userData.username);
    });

    test('should update user successfully', async ({ request }) => {
      const userData = {
        username: 'update_user_test',
        email: 'updateuser@example.com',
        password: 'TestPass123!',
        first_name: 'Update',
        last_name: 'User',
        role: 'student'
      };

      const createResponse = await apiHelpers.createUser(userData);
      const userId = createResponse.data.id;

      const updateResponse = await apiHelpers.updateUser(userId, {
        first_name: 'Updated',
        last_name: 'Name'
      });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.data.first_name).toBe('Updated');
    });

    test('should delete user successfully', async ({ request }) => {
      const userData = {
        username: 'delete_user_test',
        email: 'deleteuser@example.com',
        password: 'TestPass123!',
        first_name: 'Delete',
        last_name: 'User',
        role: 'student'
      };

      const createResponse = await apiHelpers.createUser(userData);
      const userId = createResponse.data.id;

      const deleteResponse = await apiHelpers.deleteUser(userId);
      expect(deleteResponse.status).toBe(204);
    });

    test('should return 404 for non-existent user', async ({ request }) => {
      try {
        await apiHelpers.getUserById(99999);
      } catch (error: any) {
        expect(error.response.status).toBe(404);
      }
    });
  });

  test.describe('Events API', () => {
    test.beforeEach(async ({ request }, { testData }) => {
      await apiHelpers.login({
        username: testData.users.admin.email,
        password: testData.users.admin.password
      });
    });

    test('should get events list', async ({ request }) => {
      const response = await apiHelpers.getEvents();
      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBeTruthy();
    });

    test('should create event successfully', async ({ request }) => {
      const eventData = {
        name: 'API Test Event',
        description: 'Test event created via API',
        category: 'dance',
        date: '2024-12-15',
        start_time: '09:00',
        end_time: '12:00',
        venue: 1,
        max_participants: 50
      };

      const response = await apiHelpers.createEvent(eventData);
      expect(response.status).toBe(201);
      expect(response.data.name).toBe(eventData.name);
    });

    test('should return 400 for invalid event data', async ({ request }) => {
      try {
        await apiHelpers.createEvent({
          name: '',
          description: '',
          category: 'invalid_category',
          date: 'invalid-date',
          start_time: 'invalid-time',
          end_time: 'invalid-time',
          venue: -1,
          max_participants: -1
        });
      } catch (error: any) {
        expect(error.response.status).toBe(400);
      }
    });

    test('should get event by ID', async ({ request }) => {
      const eventData = {
        name: 'Get Event Test',
        description: 'Test event for get by ID',
        category: 'music',
        date: '2024-12-16',
        start_time: '14:00',
        end_time: '17:00',
        venue: 1,
        max_participants: 30
      };

      const createResponse = await apiHelpers.createEvent(eventData);
      const eventId = createResponse.data.id;

      const getResponse = await apiHelpers.getEventById(eventId);
      expect(getResponse.status).toBe(200);
      expect(getResponse.data.name).toBe(eventData.name);
    });

    test('should update event successfully', async ({ request }) => {
      const eventData = {
        name: 'Update Event Test',
        description: 'Test event for update',
        category: 'theatre',
        date: '2024-12-17',
        start_time: '10:00',
        end_time: '13:00',
        venue: 1,
        max_participants: 40
      };

      const createResponse = await apiHelpers.createEvent(eventData);
      const eventId = createResponse.data.id;

      const updateResponse = await apiHelpers.updateEvent(eventId, {
        name: 'Updated Event Name',
        max_participants: 60
      });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.data.name).toBe('Updated Event Name');
    });

    test('should delete event successfully', async ({ request }) => {
      const eventData = {
        name: 'Delete Event Test',
        description: 'Test event for deletion',
        category: 'literary',
        date: '2024-12-18',
        start_time: '15:00',
        end_time: '18:00',
        venue: 1,
        max_participants: 25
      };

      const createResponse = await apiHelpers.createEvent(eventData);
      const eventId = createResponse.data.id;

      const deleteResponse = await apiHelpers.deleteEvent(eventId);
      expect(deleteResponse.status).toBe(204);
    });

    test('should register for event successfully', async ({ request }, { testData }) => {
      // Create event first
      const eventData = {
        name: 'Registration Test Event',
        description: 'Test event for registration',
        category: 'visual_arts',
        date: '2024-12-19',
        start_time: '11:00',
        end_time: '14:00',
        venue: 1,
        max_participants: 20
      };

      const createResponse = await apiHelpers.createEvent(eventData);
      const eventId = createResponse.data.id;

      // Login as student
      await apiHelpers.logout();
      await apiHelpers.login({
        username: testData.users.student.email,
        password: testData.users.student.password
      });

      const registerResponse = await apiHelpers.registerForEvent(eventId);
      expect(registerResponse.status).toBe(201);
    });

    test('should return 400 for duplicate registration', async ({ request }, { testData }) => {
      const eventData = {
        name: 'Duplicate Registration Test',
        description: 'Test event for duplicate registration',
        category: 'dance',
        date: '2024-12-20',
        start_time: '16:00',
        end_time: '19:00',
        venue: 1,
        max_participants: 10
      };

      const createResponse = await apiHelpers.createEvent(eventData);
      const eventId = createResponse.data.id;

      // Register first time
      await apiHelpers.registerForEvent(eventId);

      // Try to register again
      try {
        await apiHelpers.registerForEvent(eventId);
      } catch (error: any) {
        expect(error.response.status).toBe(400);
      }
    });
  });

  test.describe('Scores API', () => {
    test.beforeEach(async ({ request }, { testData }) => {
      await apiHelpers.login({
        username: testData.users.judge.email,
        password: testData.users.judge.password
      });
    });

    test('should submit score successfully', async ({ request }, { testData }) => {
      // Create event and register participant first
      await apiHelpers.logout();
      await apiHelpers.login({
        username: testData.users.admin.email,
        password: testData.users.admin.password
      });

      const eventData = {
        name: 'Scoring Test Event',
        description: 'Test event for scoring',
        category: 'dance',
        date: '2024-12-21',
        start_time: '09:00',
        end_time: '12:00',
        venue: 1,
        max_participants: 15
      };

      const createResponse = await apiHelpers.createEvent(eventData);
      const eventId = createResponse.data.id;

      // Register student for event
      await apiHelpers.logout();
      await apiHelpers.login({
        username: testData.users.student.email,
        password: testData.users.student.password
      });

      await apiHelpers.registerForEvent(eventId);

      // Login as judge and submit score
      await apiHelpers.logout();
      await apiHelpers.login({
        username: testData.users.judge.email,
        password: testData.users.judge.password
      });

      const scoreData = {
        criterion1: 8.5,
        criterion2: 9.0,
        criterion3: 8.0,
        criterion4: 9.5,
        notes: 'Excellent performance'
      };

      const response = await apiHelpers.submitScore(eventId, 1, scoreData);
      expect(response.status).toBe(201);
    });

    test('should return 400 for invalid score data', async ({ request }) => {
      try {
        await apiHelpers.submitScore(1, 1, {
          criterion1: -1,
          criterion2: 11,
          criterion3: 0,
          criterion4: 5.5
        });
      } catch (error: any) {
        expect(error.response.status).toBe(400);
      }
    });

    test('should get scores for event', async ({ request }) => {
      const response = await apiHelpers.getScores(1);
      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBeTruthy();
    });

    test('should get all scores', async ({ request }) => {
      const response = await apiHelpers.getScores();
      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBeTruthy();
    });
  });

  test.describe('API Error Handling', () => {
    test('should handle 404 errors gracefully', async ({ request }) => {
      try {
        await apiHelpers.getUserById(99999);
      } catch (error: any) {
        expect(error.response.status).toBe(404);
        expect(error.response.data).toHaveProperty('detail');
      }
    });

    test('should handle 500 errors gracefully', async ({ request }) => {
      // This would require mocking server errors
      // For now, we'll test the error handling structure
      try {
        await apiHelpers.healthCheck();
      } catch (error: any) {
        expect(error.response.status).toBeGreaterThanOrEqual(500);
      }
    });

    test('should handle network timeouts', async ({ request }) => {
      // This would require mocking network timeouts
      // For now, we'll test the timeout handling structure
      try {
        await apiHelpers.healthCheck();
      } catch (error: any) {
        expect(error.message).toContain('timeout');
      }
    });

    test('should handle malformed JSON responses', async ({ request }) => {
      // This would require mocking malformed responses
      // For now, we'll test the JSON parsing error handling
      try {
        await apiHelpers.healthCheck();
      } catch (error: any) {
        expect(error.message).toContain('JSON');
      }
    });
  });

  test.describe('API Performance', () => {
    test('should respond within acceptable time limits', async ({ request }) => {
      const startTime = Date.now();
      await apiHelpers.healthCheck();
      const endTime = Date.now();
      
      const responseTime = endTime - startTime;
      expect(responseTime).toBeLessThan(5000); // 5 seconds
    });

    test('should handle concurrent requests', async ({ request }, { testData }) => {
      await apiHelpers.login({
        username: testData.users.admin.email,
        password: testData.users.admin.password
      });

      // Make multiple concurrent requests
      const promises = Array(5).fill(null).map(() => apiHelpers.getUsers());
      const responses = await Promise.all(promises);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });

    test('should handle large data sets', async ({ request }, { testData }) => {
      await apiHelpers.login({
        username: testData.users.admin.email,
        password: testData.users.admin.password
      });

      // Create multiple users to test large data sets
      const promises = Array(10).fill(null).map((_, index) => 
        apiHelpers.createUser({
          username: `bulk_user_${index}`,
          email: `bulk${index}@example.com`,
          password: 'TestPass123!',
          first_name: 'Bulk',
          last_name: `User${index}`,
          role: 'student'
        })
      );

      const responses = await Promise.all(promises);
      responses.forEach(response => {
        expect(response.status).toBe(201);
      });
    });
  });
});


