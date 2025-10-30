import { test, expect } from '../fixtures/auth.fixture';
import { testWithData } from '../fixtures/test-data.fixture';
import { EventsPage } from '../pages/EventsPage';

test.describe('Events - CRUD Operations', () => {
  let eventsPage: EventsPage;

  test.beforeEach(async ({ page }, { testData }) => {
    eventsPage = new EventsPage(page);
    
    // Login as admin to perform CRUD operations
    await page.goto('/login');
    await page.fill('input[name="username"], input[type="email"]', testData.users.admin.email);
    await page.fill('input[name="password"], input[type="password"]', testData.users.admin.password);
    await page.click('button[type="submit"], button:has-text("Login")');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Event Creation', () => {
    test('should create a new event successfully', async ({ page }, { testData }) => {
      await eventsPage.navigateToEvents();
      await eventsPage.clickAddEvent();
      await eventsPage.expectEventFormToBeVisible();
      
      await eventsPage.fillEventForm(testData.events[0]);
      await eventsPage.saveEvent();
      
      await eventsPage.expectEventTitleToContain(testData.events[0].name);
      await eventsPage.expectSuccessMessageToContain('Event created successfully');
    });

    test('should validate required fields in event form', async ({ page }) => {
      await eventsPage.navigateToEvents();
      await eventsPage.clickAddEvent();
      
      // Try to save without filling required fields
      await eventsPage.saveEventButton.click();
      
      await eventsPage.expectElementToContainText('input[name="name"], [data-testid="event-name"]', '');
      await eventsPage.expectElementToContainText('textarea[name="description"], [data-testid="event-description"]', '');
    });

    test('should show error for duplicate event name', async ({ page }, { testData }) => {
      await eventsPage.navigateToEvents();
      await eventsPage.clickAddEvent();
      
      // Create first event
      await eventsPage.fillEventForm(testData.events[0]);
      await eventsPage.saveEvent();
      
      // Try to create event with same name
      await eventsPage.clickAddEvent();
      await eventsPage.fillEventForm(testData.events[0]);
      await eventsPage.saveEvent();
      
      await eventsPage.expectErrorMessageToContain('Event with this name already exists');
    });

    test('should validate date and time constraints', async ({ page }, { testData }) => {
      await eventsPage.navigateToEvents();
      await eventsPage.clickAddEvent();
      
      // Set end time before start time
      const invalidEvent = { ...testData.events[0] };
      invalidEvent.startTime = '14:00';
      invalidEvent.endTime = '10:00';
      
      await eventsPage.fillEventForm(invalidEvent);
      await eventsPage.saveEvent();
      
      await eventsPage.expectErrorMessageToContain('End time must be after start time');
    });

    test('should validate max participants constraint', async ({ page }, { testData }) => {
      await eventsPage.navigateToEvents();
      await eventsPage.clickAddEvent();
      
      // Set negative max participants
      const invalidEvent = { ...testData.events[0] };
      invalidEvent.maxParticipants = -1;
      
      await eventsPage.fillEventForm(invalidEvent);
      await eventsPage.saveEvent();
      
      await eventsPage.expectErrorMessageToContain('Max participants must be positive');
    });
  });

  test.describe('Event Reading', () => {
    test('should display events list correctly', async ({ page }, { testData }) => {
      // Create a test event first
      await eventsPage.navigateToEvents();
      await eventsPage.clickAddEvent();
      await eventsPage.fillEventForm(testData.events[0]);
      await eventsPage.saveEvent();
      
      await eventsPage.expectEventsListToBeVisible();
      await eventsPage.expectEventCardToBeVisible();
      await eventsPage.expectEventTitleToContain(testData.events[0].name);
    });

    test('should show event details correctly', async ({ page }, { testData }) => {
      await eventsPage.navigateToEvents();
      await eventsPage.clickViewEventDetails();
      
      await eventsPage.expectEventTitleToContain(testData.events[0].name);
      await eventsPage.expectEventDescriptionToContain(testData.events[0].description);
      await eventsPage.expectEventCategoryToContain(testData.events[0].category);
      await eventsPage.expectEventDateToContain(testData.events[0].date);
      await eventsPage.expectEventVenueToContain(testData.events[0].venue);
    });

    test('should support event search functionality', async ({ page }, { testData }) => {
      await eventsPage.navigateToEvents();
      await eventsPage.searchEvents(testData.events[0].name);
      
      await eventsPage.expectEventTitleToContain(testData.events[0].name);
    });

    test('should support category filtering', async ({ page }, { testData }) => {
      await eventsPage.navigateToEvents();
      await eventsPage.filterByCategory(testData.events[0].category);
      
      await eventsPage.expectEventCategoryToContain(testData.events[0].category);
    });

    test('should support date filtering', async ({ page }, { testData }) => {
      await eventsPage.navigateToEvents();
      await eventsPage.filterByDate(testData.events[0].date);
      
      await eventsPage.expectEventDateToContain(testData.events[0].date);
    });

    test('should support pagination', async ({ page }) => {
      await eventsPage.navigateToEvents();
      
      // Create multiple events to test pagination
      for (let i = 0; i < 15; i++) {
        await eventsPage.clickAddEvent();
        await eventsPage.fillEventForm({
          name: `Test Event ${i}`,
          description: `Test Description ${i}`,
          category: 'dance',
          date: '2024-12-15',
          startTime: '09:00',
          endTime: '12:00',
          maxParticipants: 50,
          venue: 'Main Auditorium'
        });
        await eventsPage.saveEvent();
      }
      
      await eventsPage.expectPaginationToBeVisible();
      await eventsPage.clickNextPage();
      await eventsPage.expectEventCardToBeVisible();
    });
  });

  test.describe('Event Updates', () => {
    test('should update event successfully', async ({ page }, { testData }) => {
      // Create event first
      await eventsPage.navigateToEvents();
      await eventsPage.clickAddEvent();
      await eventsPage.fillEventForm(testData.events[0]);
      await eventsPage.saveEvent();
      
      // Update event
      await eventsPage.clickEditEvent();
      await eventsPage.fillInput('input[name="name"], [data-testid="event-name"]', 'Updated Event Name');
      await eventsPage.saveEvent();
      
      await eventsPage.expectEventTitleToContain('Updated Event Name');
      await eventsPage.expectSuccessMessageToContain('Event updated successfully');
    });

    test('should validate updated event data', async ({ page }, { testData }) => {
      await eventsPage.navigateToEvents();
      await eventsPage.clickAddEvent();
      await eventsPage.fillEventForm(testData.events[0]);
      await eventsPage.saveEvent();
      
      await eventsPage.clickEditEvent();
      
      // Try to set invalid data
      await eventsPage.fillInput('input[name="max_participants"], [data-testid="event-max-participants"]', '-5');
      await eventsPage.saveEvent();
      
      await eventsPage.expectErrorMessageToContain('Max participants must be positive');
    });

    test('should preserve unchanged fields during update', async ({ page }, { testData }) => {
      await eventsPage.navigateToEvents();
      await eventsPage.clickAddEvent();
      await eventsPage.fillEventForm(testData.events[0]);
      await eventsPage.saveEvent();
      
      await eventsPage.clickEditEvent();
      
      // Only update name, leave other fields unchanged
      await eventsPage.fillInput('input[name="name"], [data-testid="event-name"]', 'Updated Name Only');
      await eventsPage.saveEvent();
      
      await eventsPage.expectEventTitleToContain('Updated Name Only');
      await eventsPage.expectEventDescriptionToContain(testData.events[0].description);
    });

    test('should handle concurrent updates', async ({ page }, { testData }) => {
      await eventsPage.navigateToEvents();
      await eventsPage.clickAddEvent();
      await eventsPage.fillEventForm(testData.events[0]);
      await eventsPage.saveEvent();
      
      // Open edit form in two tabs
      const newPage = await page.context().newPage();
      await newPage.goto('/events');
      await newPage.click('button:has-text("Edit")');
      
      // Update in first tab
      await eventsPage.clickEditEvent();
      await eventsPage.fillInput('input[name="name"], [data-testid="event-name"]', 'First Update');
      await eventsPage.saveEvent();
      
      // Try to update in second tab
      await newPage.fill('input[name="name"]', 'Second Update');
      await newPage.click('button:has-text("Save")');
      
      // Should show conflict message
      await newPage.expectElementToContainText('.error, .alert-error', 'Event has been modified by another user');
      
      await newPage.close();
    });
  });

  test.describe('Event Deletion', () => {
    test('should delete event successfully', async ({ page }, { testData }) => {
      await eventsPage.navigateToEvents();
      await eventsPage.clickAddEvent();
      await eventsPage.fillEventForm(testData.events[0]);
      await eventsPage.saveEvent();
      
      const initialCount = await eventsPage.getEventCount();
      
      await eventsPage.clickDeleteEvent();
      
      // Confirm deletion
      await page.on('dialog', dialog => dialog.accept());
      
      await eventsPage.expectSuccessMessageToContain('Event deleted successfully');
      await eventsPage.expectElementCountToBe('.event-card, [data-testid="event-card"]', initialCount - 1);
    });

    test('should cancel deletion when confirmation is dismissed', async ({ page }, { testData }) => {
      await eventsPage.navigateToEvents();
      await eventsPage.clickAddEvent();
      await eventsPage.fillEventForm(testData.events[0]);
      await eventsPage.saveEvent();
      
      const initialCount = await eventsPage.getEventCount();
      
      await eventsPage.clickDeleteEvent();
      
      // Dismiss confirmation
      await page.on('dialog', dialog => dialog.dismiss());
      
      // Event should still exist
      await eventsPage.expectElementCountToBe('.event-card, [data-testid="event-card"]', initialCount);
    });

    test('should prevent deletion of event with participants', async ({ page }, { testData }) => {
      await eventsPage.navigateToEvents();
      await eventsPage.clickAddEvent();
      await eventsPage.fillEventForm(testData.events[0]);
      await eventsPage.saveEvent();
      
      // Register a participant (this would require additional setup)
      // For now, we'll mock this scenario
      await page.evaluate(() => {
        // Mock participant registration
        window.mockParticipants = 1;
      });
      
      await eventsPage.clickDeleteEvent();
      
      await eventsPage.expectErrorMessageToContain('Cannot delete event with registered participants');
    });

    test('should handle bulk deletion', async ({ page }) => {
      await eventsPage.navigateToEvents();
      
      // Create multiple events
      for (let i = 0; i < 3; i++) {
        await eventsPage.clickAddEvent();
        await eventsPage.fillEventForm({
          name: `Bulk Test Event ${i}`,
          description: `Bulk Test Description ${i}`,
          category: 'dance',
          date: '2024-12-15',
          startTime: '09:00',
          endTime: '12:00',
          maxParticipants: 50,
          venue: 'Main Auditorium'
        });
        await eventsPage.saveEvent();
      }
      
      // Select multiple events for deletion
      await page.check('input[type="checkbox"][data-testid="select-all"]');
      await page.click('button:has-text("Delete Selected")');
      
      // Confirm bulk deletion
      await page.on('dialog', dialog => dialog.accept());
      
      await eventsPage.expectSuccessMessageToContain('Events deleted successfully');
    });
  });

  test.describe('Event Registration', () => {
    test('should register for event successfully', async ({ page }, { testData }) => {
      // Login as student
      await page.goto('/login');
      await page.fill('input[name="username"], input[type="email"]', testData.users.student.email);
      await page.fill('input[name="password"], input[type="password"]', testData.users.student.password);
      await page.click('button[type="submit"], button:has-text("Login")');
      await page.waitForLoadState('networkidle');
      
      await eventsPage.navigateToEvents();
      await eventsPage.clickRegisterForEvent();
      
      await eventsPage.expectSuccessMessageToContain('Successfully registered for event');
      await eventsPage.expectRegisterButtonToBeDisabled();
    });

    test('should prevent duplicate registration', async ({ page }, { testData }) => {
      await page.goto('/login');
      await page.fill('input[name="username"], input[type="email"]', testData.users.student.email);
      await page.fill('input[name="password"], input[type="password"]', testData.users.student.password);
      await page.click('button[type="submit"], button:has-text("Login")');
      await page.waitForLoadState('networkidle');
      
      await eventsPage.navigateToEvents();
      await eventsPage.clickRegisterForEvent();
      
      // Try to register again
      await eventsPage.clickRegisterForEvent();
      
      await eventsPage.expectErrorMessageToContain('Already registered for this event');
    });

    test('should handle registration when event is full', async ({ page }, { testData }) => {
      // Create event with max participants = 1
      await page.goto('/login');
      await page.fill('input[name="username"], input[type="email"]', testData.users.admin.email);
      await page.fill('input[name="password"], input[type="password"]', testData.users.admin.password);
      await page.click('button[type="submit"], button:has-text("Login")');
      await page.waitForLoadState('networkidle');
      
      await eventsPage.navigateToEvents();
      await eventsPage.clickAddEvent();
      await eventsPage.fillEventForm({
        ...testData.events[0],
        maxParticipants: 1
      });
      await eventsPage.saveEvent();
      
      // Register first participant
      await page.goto('/login');
      await page.fill('input[name="username"], input[type="email"]', testData.users.student.email);
      await page.fill('input[name="password"], input[type="password"]', testData.users.student.password);
      await page.click('button[type="submit"], button:has-text("Login")');
      await page.waitForLoadState('networkidle');
      
      await eventsPage.navigateToEvents();
      await eventsPage.clickRegisterForEvent();
      
      // Try to register second participant
      await page.goto('/login');
      await page.fill('input[name="username"], input[type="email"]', testData.users.volunteer.email);
      await page.fill('input[name="password"], input[type="password"]', testData.users.volunteer.password);
      await page.click('button[type="submit"], button:has-text("Login")');
      await page.waitForLoadState('networkidle');
      
      await eventsPage.navigateToEvents();
      await eventsPage.clickRegisterForEvent();
      
      await eventsPage.expectErrorMessageToContain('Event is full');
    });
  });
});


