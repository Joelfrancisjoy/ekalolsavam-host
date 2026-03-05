# Google Signup Email Restriction

This system restricts Google OAuth signup to only selected email addresses. Only emails that are pre-approved by administrators can create accounts through Google signup.

## Features

- ✅ Restrict Google signup to specific email addresses
- ✅ Admin interface for managing allowed emails
- ✅ Bulk email import functionality
- ✅ Real-time email validation during signup
- ✅ API endpoints for programmatic management
- ✅ Command-line tools for batch operations

## How It Works

1. **Email Whitelist**: Only emails in the `AllowedEmail` model can sign up via Google OAuth
2. **Pipeline Check**: Custom social auth pipeline validates emails during Google signup
3. **Admin Management**: Admins can add/remove/toggle email addresses
4. **Real-time Validation**: Frontend shows users if their email is authorized

## Setup Instructions

### 1. Run Database Migrations

```bash
cd backend
python manage.py makemigrations users
python manage.py migrate
```

### 2. Create Admin User (if not exists)

```bash
python manage.py createsuperuser
```

### 3. Add Initial Allowed Emails

#### Option A: Using Django Admin
1. Go to `http://localhost:8000/admin/`
2. Login with admin credentials
3. Navigate to "Users" → "Allowed Emails"
4. Add email addresses manually

#### Option B: Using Management Command

**Add single email:**
```bash
python manage.py add_allowed_emails --email admin@example.com --admin-user your_admin_username
```

**Add multiple emails:**
```bash
python manage.py add_allowed_emails --emails user1@example.com user2@example.com user3@example.com
```

**Add from CSV file:**
```bash
python manage.py add_allowed_emails --file emails.csv --admin-user your_admin_username
```

CSV format:
```csv
email
user1@example.com
user2@example.com
user3@example.com
```

#### Option C: Using API Endpoints

**Add single email:**
```bash
curl -X POST http://localhost:8000/api/auth/allowed-emails/ \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com"}'
```

**Bulk add emails:**
```bash
curl -X POST http://localhost:8000/api/auth/allowed-emails/bulk-add/ \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"emails": ["user1@example.com", "user2@example.com"]}'
```

## Frontend Usage

### Admin Interface

1. Login as admin user
2. Go to Admin Panel
3. Click on "Google Signup Emails" card
4. Use the interface to:
   - View all allowed emails
   - Add single emails
   - Bulk add multiple emails
   - Toggle email status (active/inactive)
   - Delete emails

### Email Validation Component

The `EmailValidationChecker` component can be used in forms to show users if their email is authorized:

```jsx
import EmailValidationChecker from '../components/EmailValidationChecker';

function SignupForm() {
  const [email, setEmail] = useState('');
  const [isEmailValid, setIsEmailValid] = useState(null);

  return (
    <div>
      <input 
        type="email" 
        value={email} 
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Enter your email"
      />
      <EmailValidationChecker 
        email={email} 
        onValidationChange={setIsEmailValid}
      />
    </div>
  );
}
```

## API Endpoints

### Public Endpoints

- `GET /api/auth/allowed-emails/check/?email=user@example.com` - Check if email is allowed

### Admin-Only Endpoints

- `GET /api/auth/allowed-emails/` - List all allowed emails
- `POST /api/auth/allowed-emails/` - Add single email
- `POST /api/auth/allowed-emails/bulk-add/` - Bulk add emails
- `PATCH /api/auth/allowed-emails/{id}/` - Update email
- `DELETE /api/auth/allowed-emails/{id}/` - Delete email
- `POST /api/auth/allowed-emails/{id}/toggle/` - Toggle email status

## Error Handling

When a user tries to sign up with an unauthorized email, they will see:
- **Frontend**: Clear error message indicating their email is not authorized
- **Backend**: `AuthForbidden` exception with descriptive message

## Security Considerations

1. **Admin-Only Management**: Only users with `role='admin'` can manage allowed emails
2. **Case-Insensitive**: Email matching is case-insensitive
3. **Active Status**: Emails can be temporarily disabled without deletion
4. **Audit Trail**: Track who added each email and when

## Troubleshooting

### Common Issues

1. **Migration Errors**: Make sure to run migrations after adding the new model
2. **Permission Denied**: Ensure the user has admin role to manage emails
3. **Google OAuth Not Working**: Check that the social auth pipeline is properly configured
4. **Frontend API Errors**: Verify the API base URL in the service file

### Checking Configuration

Verify the social auth pipeline in `settings.py`:
```python
SOCIAL_AUTH_PIPELINE = (
    'social_core.pipeline.social_auth.social_details',
    'social_core.pipeline.social_auth.social_uid',
    'social_core.pipeline.social_auth.auth_allowed',
    'users.pipeline.check_email_allowed',  # This should be present
    'social_core.pipeline.social_auth.social_user',
    'social_core.pipeline.user.get_username',
    'social_core.pipeline.user.create_user',
    'users.pipeline.assign_default_role',
    'social_core.pipeline.social_auth.associate_user',
    'social_core.pipeline.social_auth.load_extra_data',
    'social_core.pipeline.user.user_details',
)
```

## Testing

To test the restriction:

1. Add a test email to allowed list
2. Try Google signup with that email (should work)
3. Try Google signup with a different email (should be blocked)
4. Check the error message is user-friendly

## Support

If you encounter issues:
1. Check the Django logs for detailed error messages
2. Verify database migrations are applied
3. Ensure admin user has proper permissions
4. Test API endpoints with proper authentication