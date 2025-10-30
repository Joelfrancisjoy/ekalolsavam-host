import { test, expect } from '../fixtures/auth.fixture';
import { testWithData } from '../fixtures/test-data.fixture';
import { AdminPage } from '../pages/AdminPage';

test.describe('Admin - User Management CRUD', () => {
  let adminPage: AdminPage;

  test.beforeEach(async ({ page }, { testData }) => {
    adminPage = new AdminPage(page);
    
    // Login as admin
    await page.goto('/login');
    await page.fill('input[name="username"], input[type="email"]', testData.users.admin.email);
    await page.fill('input[name="password"], input[type="password"]', testData.users.admin.password);
    await page.click('button[type="submit"], button:has-text("Login")');
    await page.waitForLoadState('networkidle');
    
    await adminPage.navigateToAdmin();
    await adminPage.clickUsersTab();
  });

  test.describe('User Creation', () => {
    test('should create a new user successfully', async ({ page }, { testData }) => {
      await adminPage.clickAddUser();
      await adminPage.expectUserFormToBeVisible();
      
      const newUser = {
        username: 'new_user',
        email: 'newuser@example.com',
        password: 'NewUserPass123!',
        firstName: 'New',
        lastName: 'User',
        role: 'student',
        school: 'Test School'
      };
      
      await adminPage.fillUserForm(newUser);
      await adminPage.saveUser();
      
      await adminPage.expectUserToBeVisible(newUser.username);
      await adminPage.expectSuccessMessageToContain('User created successfully');
    });

    test('should create user with different roles', async ({ page }, { testData }) => {
      const roles = ['student', 'judge', 'volunteer', 'admin'];
      
      for (const role of roles) {
        await adminPage.clickAddUser();
        
        const userData = {
          username: `test_${role}`,
          email: `test${role}@example.com`,
          password: 'TestPass123!',
          firstName: 'Test',
          lastName: 'User',
          role: role
        };
        
        await adminPage.fillUserForm(userData);
        await adminPage.saveUser();
        
        await adminPage.expectUserToBeVisible(userData.username);
      }
    });

    test('should validate required fields in user form', async ({ page }) => {
      await adminPage.clickAddUser();
      
      // Try to save without filling required fields
      await adminPage.saveUserButton.click();
      
      await adminPage.expectElementToContainText('input[name="username"], [data-testid="username"]', '');
      await adminPage.expectElementToContainText('input[name="email"], [data-testid="email"]', '');
    });

    test('should show error for duplicate username', async ({ page }, { testData }) => {
      await adminPage.clickAddUser();
      
      // Create first user
      await adminPage.fillUserForm({
        username: 'duplicate_user',
        email: 'user1@example.com',
        password: 'TestPass123!',
        firstName: 'User',
        lastName: 'One',
        role: 'student'
      });
      await adminPage.saveUser();
      
      // Try to create user with same username
      await adminPage.clickAddUser();
      await adminPage.fillUserForm({
        username: 'duplicate_user',
        email: 'user2@example.com',
        password: 'TestPass123!',
        firstName: 'User',
        lastName: 'Two',
        role: 'student'
      });
      await adminPage.saveUser();
      
      await adminPage.expectErrorMessageToContain('Username already exists');
    });

    test('should show error for duplicate email', async ({ page }, { testData }) => {
      await adminPage.clickAddUser();
      
      // Create first user
      await adminPage.fillUserForm({
        username: 'user1',
        email: 'duplicate@example.com',
        password: 'TestPass123!',
        firstName: 'User',
        lastName: 'One',
        role: 'student'
      });
      await adminPage.saveUser();
      
      // Try to create user with same email
      await adminPage.clickAddUser();
      await adminPage.fillUserForm({
        username: 'user2',
        email: 'duplicate@example.com',
        password: 'TestPass123!',
        firstName: 'User',
        lastName: 'Two',
        role: 'student'
      });
      await adminPage.saveUser();
      
      await adminPage.expectErrorMessageToContain('Email already exists');
    });

    test('should validate email format', async ({ page }) => {
      await adminPage.clickAddUser();
      
      await adminPage.fillUserForm({
        username: 'test_user',
        email: 'invalid-email',
        password: 'TestPass123!',
        firstName: 'Test',
        lastName: 'User',
        role: 'student'
      });
      await adminPage.saveUser();
      
      await adminPage.expectErrorMessageToContain('Enter a valid email address');
    });

    test('should validate password strength', async ({ page }) => {
      await adminPage.clickAddUser();
      
      await adminPage.fillUserForm({
        username: 'test_user',
        email: 'test@example.com',
        password: 'weak',
        firstName: 'Test',
        lastName: 'User',
        role: 'student'
      });
      await adminPage.saveUser();
      
      await adminPage.expectErrorMessageToContain('Password is too weak');
    });
  });

  test.describe('User Reading', () => {
    test('should display users list correctly', async ({ page }) => {
      await adminPage.expectUsersTabToBeActive();
      await adminPage.expectElementToBeVisible('.users-list, [data-testid="users-list"]');
    });

    test('should show user details correctly', async ({ page }, { testData }) => {
      await adminPage.expectUserToBeVisible(testData.users.admin.username);
      await adminPage.expectUserToBeVisible(testData.users.student.username);
    });

    test('should support user search functionality', async ({ page }, { testData }) => {
      await adminPage.searchUsers(testData.users.student.username);
      await adminPage.expectUserToBeVisible(testData.users.student.username);
    });

    test('should support role filtering', async ({ page }) => {
      await adminPage.filterUsersByRole('student');
      await adminPage.expectElementToContainText('.user-row, [data-testid="user-row"]', 'student');
    });

    test('should show user statistics', async ({ page }) => {
      await adminPage.expectStatisticsCardsToBeVisible();
      await adminPage.expectTotalUsersToBe(4); // admin, judge, student, volunteer
    });
  });

  test.describe('User Updates', () => {
    test('should update user successfully', async ({ page }, { testData }) => {
      await adminPage.clickEditUser();
      await adminPage.fillInput('input[name="first_name"], [data-testid="first-name"]', 'Updated First Name');
      await adminPage.saveUser();
      
      await adminPage.expectUserToBeVisible('Updated First Name');
      await adminPage.expectSuccessMessageToContain('User updated successfully');
    });

    test('should update user role', async ({ page }, { testData }) => {
      await adminPage.clickEditUser();
      await adminPage.selectOption('select[name="role"], [data-testid="role-select"]', 'judge');
      await adminPage.saveUser();
      
      await adminPage.expectSuccessMessageToContain('User updated successfully');
    });

    test('should update user permissions', async ({ page }, { testData }) => {
      await adminPage.clickEditUser();
      await adminPage.checkCheckbox('input[name="is_staff"], [data-testid="is-staff"]');
      await adminPage.saveUser();
      
      await adminPage.expectSuccessMessageToContain('User updated successfully');
    });

    test('should validate updated user data', async ({ page }) => {
      await adminPage.clickEditUser();
      
      // Try to set invalid email
      await adminPage.fillInput('input[name="email"], [data-testid="email"]', 'invalid-email');
      await adminPage.saveUser();
      
      await adminPage.expectErrorMessageToContain('Enter a valid email address');
    });

    test('should handle concurrent updates', async ({ page }, { testData }) => {
      // Open edit form in two tabs
      const newPage = await page.context().newPage();
      await newPage.goto('/admin');
      await newPage.click('button:has-text("Edit")');
      
      // Update in first tab
      await adminPage.clickEditUser();
      await adminPage.fillInput('input[name="first_name"], [data-testid="first-name"]', 'First Update');
      await adminPage.saveUser();
      
      // Try to update in second tab
      await newPage.fill('input[name="first_name"]', 'Second Update');
      await newPage.click('button:has-text("Save")');
      
      // Should show conflict message
      await newPage.expectElementToContainText('.error, .alert-error', 'User has been modified by another user');
      
      await newPage.close();
    });
  });

  test.describe('User Deletion', () => {
    test('should delete user successfully', async ({ page }) => {
      // Create a test user first
      await adminPage.clickAddUser();
      await adminPage.fillUserForm({
        username: 'delete_test_user',
        email: 'deletetest@example.com',
        password: 'TestPass123!',
        firstName: 'Delete',
        lastName: 'Test',
        role: 'student'
      });
      await adminPage.saveUser();
      
      const initialCount = await adminPage.getUserCount();
      
      await adminPage.clickDeleteUser();
      
      // Confirm deletion
      await page.on('dialog', dialog => dialog.accept());
      
      await adminPage.expectSuccessMessageToContain('User deleted successfully');
      await adminPage.expectElementCountToBe('.user-row, [data-testid="user-row"]', initialCount - 1);
    });

    test('should cancel deletion when confirmation is dismissed', async ({ page }) => {
      const initialCount = await adminPage.getUserCount();
      
      await adminPage.clickDeleteUser();
      
      // Dismiss confirmation
      await page.on('dialog', dialog => dialog.dismiss());
      
      // User should still exist
      await adminPage.expectElementCountToBe('.user-row, [data-testid="user-row"]', initialCount);
    });

    test('should prevent deletion of admin users', async ({ page }, { testData }) => {
      await adminPage.clickDeleteUser();
      
      await adminPage.expectErrorMessageToContain('Cannot delete admin users');
    });

    test('should handle bulk user operations', async ({ page }) => {
      // Select multiple users
      await adminPage.selectAllUsers();
      await adminPage.selectBulkAction('activate');
      await adminPage.applyBulkAction();
      
      await adminPage.expectSuccessMessageToContain('Bulk operation completed successfully');
    });
  });

  test.describe('Google Emails Management', () => {
    test('should add Google email successfully', async ({ page }) => {
      await adminPage.clickGoogleEmailsTab();
      await adminPage.clickAddEmail();
      
      const testEmail = 'test@example.com';
      await adminPage.addGoogleEmail(testEmail);
      
      await adminPage.expectEmailToBeVisible(testEmail);
      await adminPage.expectSuccessMessageToContain('Email added successfully');
    });

    test('should validate email format for Google emails', async ({ page }) => {
      await adminPage.clickGoogleEmailsTab();
      await adminPage.clickAddEmail();
      
      await adminPage.addGoogleEmail('invalid-email');
      
      await adminPage.expectErrorMessageToContain('Enter a valid email address');
    });

    test('should prevent duplicate Google emails', async ({ page }) => {
      await adminPage.clickGoogleEmailsTab();
      await adminPage.clickAddEmail();
      
      const testEmail = 'duplicate@example.com';
      await adminPage.addGoogleEmail(testEmail);
      
      // Try to add same email again
      await adminPage.clickAddEmail();
      await adminPage.addGoogleEmail(testEmail);
      
      await adminPage.expectErrorMessageToContain('Email already exists');
    });

    test('should delete Google email successfully', async ({ page }) => {
      await adminPage.clickGoogleEmailsTab();
      await adminPage.clickAddEmail();
      
      const testEmail = 'delete_test@example.com';
      await adminPage.addGoogleEmail(testEmail);
      
      const initialCount = await adminPage.getEmailCount();
      
      await adminPage.clickDeleteEmail();
      
      // Confirm deletion
      await page.on('dialog', dialog => dialog.accept());
      
      await adminPage.expectSuccessMessageToContain('Email deleted successfully');
      await adminPage.expectElementCountToBe('.email-row, [data-testid="email-row"]', initialCount - 1);
    });
  });

  test.describe('Admin Dashboard', () => {
    test('should display admin dashboard correctly', async ({ page }) => {
      await adminPage.expectToBeOnAdminPage();
      await adminPage.expectStatisticsCardsToBeVisible();
      await adminPage.expectTotalUsersToBe(4);
      await adminPage.expectTotalEventsToBe(0);
    });

    test('should navigate between admin tabs', async ({ page }) => {
      await adminPage.clickUsersTab();
      await adminPage.expectUsersTabToBeActive();
      
      await adminPage.clickEventsTab();
      await adminPage.expectEventsTabToBeActive();
      
      await adminPage.clickGoogleEmailsTab();
      await adminPage.expectGoogleEmailsTabToBeActive();
    });

    test('should show real-time statistics updates', async ({ page }) => {
      const initialUserCount = await adminPage.getUserCount();
      
      // Add a new user
      await adminPage.clickAddUser();
      await adminPage.fillUserForm({
        username: 'stats_test_user',
        email: 'statstest@example.com',
        password: 'TestPass123!',
        firstName: 'Stats',
        lastName: 'Test',
        role: 'student'
      });
      await adminPage.saveUser();
      
      // Statistics should update
      await adminPage.expectTotalUsersToBe(initialUserCount + 1);
    });
  });
});


