import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';
import { TestEvent } from '../fixtures/test-data.fixture';

export class EventsPage extends BasePage {
  // Event listing locators
  get eventsList(): Locator {
    return this.page.locator('.events-list, [data-testid="events-list"]');
  }

  get eventCards(): Locator {
    return this.page.locator('.event-card, [data-testid="event-card"]');
  }

  get eventCard(): Locator {
    return this.page.locator('.event-card, [data-testid="event-card"]').first();
  }

  get eventTitle(): Locator {
    return this.page.locator('.event-title, [data-testid="event-title"]');
  }

  get eventDescription(): Locator {
    return this.page.locator('.event-description, [data-testid="event-description"]');
  }

  get eventDate(): Locator {
    return this.page.locator('.event-date, [data-testid="event-date"]');
  }

  get eventTime(): Locator {
    return this.page.locator('.event-time, [data-testid="event-time"]');
  }

  get eventVenue(): Locator {
    return this.page.locator('.event-venue, [data-testid="event-venue"]');
  }

  get eventCategory(): Locator {
    return this.page.locator('.event-category, [data-testid="event-category"]');
  }

  get eventParticipants(): Locator {
    return this.page.locator('.event-participants, [data-testid="event-participants"]');
  }

  // Action buttons
  get registerButton(): Locator {
    return this.page.locator('button:has-text("Register"), a:has-text("Register")');
  }

  get viewDetailsButton(): Locator {
    return this.page.locator('button:has-text("View Details"), a:has-text("View Details")');
  }

  get editEventButton(): Locator {
    return this.page.locator('button:has-text("Edit"), a:has-text("Edit Event")');
  }

  get deleteEventButton(): Locator {
    return this.page.locator('button:has-text("Delete"), a:has-text("Delete Event")');
  }

  // Search and filter locators
  get searchInput(): Locator {
    return this.page.locator('input[placeholder*="Search"], input[name="search"], [data-testid="search-input"]');
  }

  get categoryFilter(): Locator {
    return this.page.locator('select[name="category"], [data-testid="category-filter"]');
  }

  get dateFilter(): Locator {
    return this.page.locator('input[type="date"], [data-testid="date-filter"]');
  }

  get filterButton(): Locator {
    return this.page.locator('button:has-text("Filter"), button:has-text("Apply")');
  }

  get clearFiltersButton(): Locator {
    return this.page.locator('button:has-text("Clear"), button:has-text("Reset")');
  }

  // Pagination
  get pagination(): Locator {
    return this.page.locator('.pagination, [data-testid="pagination"]');
  }

  get nextPageButton(): Locator {
    return this.page.locator('button:has-text("Next"), a:has-text("Next")');
  }

  get previousPageButton(): Locator {
    return this.page.locator('button:has-text("Previous"), a:has-text("Previous")');
  }

  get pageNumbers(): Locator {
    return this.page.locator('.page-number, [data-testid="page-number"]');
  }

  // Add/Edit event form locators
  get addEventButton(): Locator {
    return this.page.locator('button:has-text("Add Event"), a:has-text("Add Event")');
  }

  get eventForm(): Locator {
    return this.page.locator('form, [data-testid="event-form"]');
  }

  get eventNameInput(): Locator {
    return this.page.locator('input[name="name"], input[name="title"], [data-testid="event-name"]');
  }

  get eventDescriptionInput(): Locator {
    return this.page.locator('textarea[name="description"], [data-testid="event-description"]');
  }

  get eventCategorySelect(): Locator {
    return this.page.locator('select[name="category"], [data-testid="event-category"]');
  }

  get eventDateInput(): Locator {
    return this.page.locator('input[name="date"], input[type="date"], [data-testid="event-date"]');
  }

  get eventStartTimeInput(): Locator {
    return this.page.locator('input[name="start_time"], input[type="time"], [data-testid="event-start-time"]');
  }

  get eventEndTimeInput(): Locator {
    return this.page.locator('input[name="end_time"], [data-testid="event-end-time"]');
  }

  get eventVenueSelect(): Locator {
    return this.page.locator('select[name="venue"], [data-testid="event-venue"]');
  }

  get eventMaxParticipantsInput(): Locator {
    return this.page.locator('input[name="max_participants"], [data-testid="event-max-participants"]');
  }

  get saveEventButton(): Locator {
    return this.page.locator('button[type="submit"], button:has-text("Save"), button:has-text("Create")');
  }

  get cancelEventButton(): Locator {
    return this.page.locator('button:has-text("Cancel"), a:has-text("Cancel")');
  }

  // Modal/overlay locators
  get eventModal(): Locator {
    return this.page.locator('.modal, .overlay, [data-testid="event-modal"]');
  }

  get closeModalButton(): Locator {
    return this.page.locator('button:has-text("Close"), .close-button, [data-testid="close-modal"]');
  }

  constructor(page: Page) {
    super(page);
  }

  // Navigation
  async navigateToEvents(): Promise<void> {
    await this.navigateTo('/events');
    await this.waitForPageLoad();
  }

  // Event listing actions
  async searchEvents(searchTerm: string): Promise<void> {
    await this.fillInput('input[placeholder*="Search"], input[name="search"], [data-testid="search-input"]', searchTerm);
    await this.page.keyboard.press('Enter');
    await this.waitForPageLoad();
  }

  async filterByCategory(category: string): Promise<void> {
    await this.selectOption('select[name="category"], [data-testid="category-filter"]', category);
    await this.filterButton.click();
    await this.waitForPageLoad();
  }

  async filterByDate(date: string): Promise<void> {
    await this.fillInput('input[type="date"], [data-testid="date-filter"]', date);
    await this.filterButton.click();
    await this.waitForPageLoad();
  }

  async clearFilters(): Promise<void> {
    await this.clearFiltersButton.click();
    await this.waitForPageLoad();
  }

  async clickNextPage(): Promise<void> {
    await this.nextPageButton.click();
    await this.waitForPageLoad();
  }

  async clickPreviousPage(): Promise<void> {
    await this.previousPageButton.click();
    await this.waitForPageLoad();
  }

  async clickPageNumber(pageNumber: number): Promise<void> {
    await this.page.locator(`button:has-text("${pageNumber}"), a:has-text("${pageNumber}")`).click();
    await this.waitForPageLoad();
  }

  // Event actions
  async clickRegisterForEvent(): Promise<void> {
    await this.registerButton.first().click();
    await this.waitForPageLoad();
  }

  async clickViewEventDetails(): Promise<void> {
    await this.viewDetailsButton.first().click();
    await this.waitForPageLoad();
  }

  async clickEditEvent(): Promise<void> {
    await this.editEventButton.first().click();
    await this.waitForPageLoad();
  }

  async clickDeleteEvent(): Promise<void> {
    await this.deleteEventButton.first().click();
    await this.waitForPageLoad();
  }

  async clickAddEvent(): Promise<void> {
    await this.addEventButton.click();
    await this.waitForPageLoad();
  }

  // Event form actions
  async fillEventForm(event: TestEvent): Promise<void> {
    await this.fillInput('input[name="name"], input[name="title"], [data-testid="event-name"]', event.name);
    await this.fillInput('textarea[name="description"], [data-testid="event-description"]', event.description);
    await this.selectOption('select[name="category"], [data-testid="event-category"]', event.category);
    await this.fillInput('input[name="date"], input[type="date"], [data-testid="event-date"]', event.date);
    await this.fillInput('input[name="start_time"], input[type="time"], [data-testid="event-start-time"]', event.startTime);
    await this.fillInput('input[name="end_time"], [data-testid="event-end-time"]', event.endTime);
    await this.selectOption('select[name="venue"], [data-testid="event-venue"]', event.venue);
    await this.fillInput('input[name="max_participants"], [data-testid="event-max-participants"]', event.maxParticipants.toString());
  }

  async saveEvent(): Promise<void> {
    await this.saveEventButton.click();
    await this.waitForPageLoad();
  }

  async cancelEventForm(): Promise<void> {
    await this.cancelEventButton.click();
    await this.waitForPageLoad();
  }

  async closeModal(): Promise<void> {
    await this.closeModalButton.click();
    await this.waitForPageLoad();
  }

  // Validations
  async expectEventsListToBeVisible(): Promise<void> {
    await this.expectElementToBeVisible('.events-list, [data-testid="events-list"]');
  }

  async expectEventCardToBeVisible(): Promise<void> {
    await this.expectElementToBeVisible('.event-card, [data-testid="event-card"]');
  }

  async expectEventTitleToContain(title: string): Promise<void> {
    await this.expectElementToContainText('.event-title, [data-testid="event-title"]', title);
  }

  async expectEventDescriptionToContain(description: string): Promise<void> {
    await this.expectElementToContainText('.event-description, [data-testid="event-description"]', description);
  }

  async expectEventCategoryToContain(category: string): Promise<void> {
    await this.expectElementToContainText('.event-category, [data-testid="event-category"]', category);
  }

  async expectEventDateToContain(date: string): Promise<void> {
    await this.expectElementToContainText('.event-date, [data-testid="event-date"]', date);
  }

  async expectEventVenueToContain(venue: string): Promise<void> {
    await this.expectElementToContainText('.event-venue, [data-testid="event-venue"]', venue);
  }

  async expectRegisterButtonToBeVisible(): Promise<void> {
    await this.expectElementToBeVisible('button:has-text("Register"), a:has-text("Register")');
  }

  async expectRegisterButtonToBeDisabled(): Promise<void> {
    await expect(this.registerButton.first()).toBeDisabled();
  }

  async expectRegisterButtonToBeEnabled(): Promise<void> {
    await expect(this.registerButton.first()).toBeEnabled();
  }

  async expectSearchInputToBeVisible(): Promise<void> {
    await this.expectElementToBeVisible('input[placeholder*="Search"], input[name="search"], [data-testid="search-input"]');
  }

  async expectCategoryFilterToBeVisible(): Promise<void> {
    await this.expectElementToBeVisible('select[name="category"], [data-testid="category-filter"]');
  }

  async expectPaginationToBeVisible(): Promise<void> {
    await this.expectElementToBeVisible('.pagination, [data-testid="pagination"]');
  }

  async expectEventFormToBeVisible(): Promise<void> {
    await this.expectElementToBeVisible('form, [data-testid="event-form"]');
  }

  async expectEventModalToBeVisible(): Promise<void> {
    await this.expectElementToBeVisible('.modal, .overlay, [data-testid="event-modal"]');
  }

  // Helper methods
  async getEventCount(): Promise<number> {
    const eventCards = this.page.locator('.event-card, [data-testid="event-card"]');
    return await eventCards.count();
  }

  async getEventTitles(): Promise<string[]> {
    const titles = this.page.locator('.event-title, [data-testid="event-title"]');
    const count = await titles.count();
    const titleTexts: string[] = [];
    
    for (let i = 0; i < count; i++) {
      const text = await titles.nth(i).textContent();
      if (text) titleTexts.push(text);
    }
    
    return titleTexts;
  }

  async waitForEventsToLoad(): Promise<void> {
    await this.waitForPageLoad();
    await this.expectEventsListToBeVisible();
  }
}


