# Bilet Demo API - Postman Collections

This folder contains Postman collections for testing the Bilet Demo API endpoints. The collections are organized by functionality and include comprehensive examples for all available routes.

## Collections Overview

### 1. Auth Routes Collection (`Bilet_Demo_Auth_Routes.postman_collection.json`)
Contains authentication-related endpoints including:
- User registration and login
- Organizer registration  
- Token management (refresh/logout)
- Profile management
- City and county data endpoints

### 2. User Routes Collection (`Bilet_Demo_User_Routes.postman_collection.json`)
Contains user management endpoints including:
- User profile operations
- User search and discovery
- Admin user management
- User statistics

## Setup Instructions

### 1. Import Collections
1. Open Postman
2. Click "Import" button
3. Select both JSON files from this folder
4. Collections will be imported with pre-configured requests

### 2. Environment Variables
Both collections use the following variables:

| Variable | Description | Default Value |
|----------|-------------|---------------|
| `baseUrl` | API base URL | `http://localhost:3000/api` |
| `accessToken` | JWT access token | Auto-set on login |
| `refreshToken` | JWT refresh token | Auto-set on login |
| `userId` | User ID for testing | Manual set |
| `adminAccessToken` | Admin user token | Manual set |

### 3. Authentication Setup

#### For Regular User Testing:
1. Use "Register User" or "Login User" from Auth collection
2. `accessToken` and `refreshToken` will be automatically set
3. All authenticated requests will use the bearer token

#### For Admin Testing:
1. Login with an admin account
2. Manually set `adminAccessToken` variable with the admin's access token
3. Admin-only routes will use this token

## API Usage Examples

### User Registration
```json
POST /auth/register
{
  "firstName": "John",
  "lastName": "Doe", 
  "email": "john.doe@example.com",
  "password": "StrongPass123!",
  "birthYear": 1990,
  "phone": "+905551234567",
  "city": "istanbul",
  "userType": "USER"
}
```

### Organizer Registration
```json
POST /auth/register-organizer
{
  "firstName": "Jane",
  "lastName": "Events",
  "company": "Event Masters Ltd",
  "email": "jane@eventmasters.com",
  "password": "OrganizerPass123!",
  "phone": "+905551112233",
  "taxNumber": "1234567890"
}
```

### User Search
```
GET /users/search?q=john&city=istanbul&limit=10
```

### City Data
```
GET /auth/cities
GET /auth/counties?city=istanbul
```

## Request/Response Examples

### Successful Login Response
```json
{
  "user": {
    "id": "uuid",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com",
    "userType": "USER",
    "city": "istanbul",
    "points": 0
  },
  "tokens": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

### User Profile Response
```json
{
  "user": {
    "id": "uuid",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com",
    "userType": "USER",
    "avatar": "https://example.com/avatar.jpg",
    "city": "istanbul",
    "phone": "+905551234567",
    "phoneVerified": false,
    "birthYear": 1990,
    "points": 100,
    "lastLogin": "2024-01-15T10:30:00Z",
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

### User Statistics Response
```json
{
  "user": {
    "id": "uuid",
    "firstName": "John",
    "lastName": "Doe",
    "points": 150
  },
  "stats": {
    "totalTickets": 5,
    "totalFriends": 12,
    "activeTickets": 3,
    "upcomingEvents": 2
  }
}
```

## Error Handling

The API returns consistent error responses:

```json
{
  "error": {
    "message": "Error description",
    "code": "ERROR_CODE",
    "status": 400
  }
}
```

Common error codes:
- `EMAIL_TAKEN`: Email already exists
- `CREDENTIALS_INVALID`: Invalid login credentials
- `TOKEN_INVALID`: Invalid or expired token
- `USER_NOT_FOUND`: User doesn't exist
- `VALIDATION_ERROR`: Invalid input data

## Testing Workflow

### 1. Authentication Flow
1. Register a new user or login
2. Verify token is set automatically
3. Test protected endpoints

### 2. User Management Flow
1. Get current user profile
2. Update profile information
3. Search for other users
4. Get user statistics

### 3. Admin Operations Flow
1. Login as admin user
2. Set `adminAccessToken` manually
3. List all users
4. Update any user
5. Delete users

### 4. City Data Flow
1. Get all available cities
2. Select a city and get its counties
3. Use city name in user registration/updates

## Collection Features

### Auto-Token Management
- Login requests automatically store tokens
- Refresh requests update tokens
- All authenticated requests use stored tokens

### Pre-request Scripts
- Automatic variable management
- Request validation
- Environment setup

### Test Scripts
- Response validation
- Automatic token extraction
- Success/failure assertions

## Notes

- All collections include comprehensive examples with realistic data
- Request bodies include all required and optional fields
- Query parameters are documented with descriptions
- Authentication headers are automatically managed
- Collections support both local development and production environments

## Environment Configuration

For different environments, update the `baseUrl` variable:

- **Local Development**: `http://localhost:3000/api`
- **Staging**: `https://staging-api.biletdemo.com/api`
- **Production**: `https://api.biletdemo.com/api`

## Support

If you encounter issues with the collections:
1. Check environment variables are correctly set
2. Verify API server is running
3. Ensure authentication tokens are valid
4. Review request payloads match the expected schema
