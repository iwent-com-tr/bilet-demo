# Users Module Updates

## Overview
Updated the users module to align with the new Prisma User schema and modern authentication structure.

## Key Changes

### 1. Updated User Service (`user.service.ts`)
- **Field Updates**: Changed from `name` to `firstName`/`lastName`, `role` to `userType`
- **New Fields**: Added support for `phone`, `phoneVerified`, `city`, `birthYear`, `points`, `lastLogin`
- **Soft Delete**: Added `deletedAt` filtering to exclude deleted users
- **Enhanced Search**: Updated search to work with `firstName`/`lastName` instead of `name`
- **New Methods**:
  - `getUserStats()`: Get user statistics with ticket and friend counts
  - `searchUsers()`: Advanced user search with city filtering and exclusions

### 2. Updated User Controller (`user.controller.ts`)
- **New DTOs**: Added `SearchUsersDTO` and `AdminUserUpdateDTO` for proper validation
- **Enhanced Sanitization**: Updated `sanitizeUser()` function to return new User fields
- **New Endpoints**:
  - `GET /users/search`: Search users with filters
  - `GET /users/:id/stats`: Get user statistics
- **Improved Error Handling**: Better error handling across all endpoints
- **Updated Profile Management**: Uses new field structure for profile updates

### 3. Updated User Routes (`user.routes.ts`)
- **Role Updates**: Changed from `ORGANIZER` to proper user roles (`USER`, `ADMIN`)
- **New Routes**: Added search and stats endpoints
- **Better Organization**: Grouped routes by access level (admin, user, public)
- **Self-Access Logic**: Improved self-access patterns for user data

## New API Endpoints

### User Management (Admin Only)
```
GET    /users              - List all users with pagination and search
PATCH  /users/:id          - Admin update user
DELETE /users/:id          - Soft delete user
```

### User Profile
```
GET    /users/me           - Get current user profile
PATCH  /users/me           - Update own profile
GET    /users/:id          - Get user by ID (self or admin)
GET    /users/:id/stats    - Get user statistics
```

### User Search
```
GET    /users/search?q=query&city=city&limit=10  - Search users
```

## Enhanced Features

### User Statistics
The `getUserStats` endpoint provides:
- Total tickets purchased
- Total friends (accepted friendships)
- Active tickets count
- Upcoming events count

### Advanced Search
The search functionality supports:
- Search by first name, last name, or email
- Filter by city
- Exclude specific users (useful for friend suggestions)
- Limit results
- Sort by points and creation date

### Proper Data Sanitization
All user data is properly sanitized before returning:
- Excludes sensitive fields like password
- Consistent field structure across all endpoints
- Proper typing and validation

## Field Mapping Changes

| Old Field    | New Field(s)        | Notes                          |
|-------------|--------------------|-----------------------------|
| `name`      | `firstName`, `lastName` | Split into separate fields     |
| `role`      | `userType`         | Now uses USER/ADMIN enum      |
| `avatarUrl` | `avatar`           | Simplified field name          |
| -           | `phone`            | New required field             |
| -           | `phoneVerified`    | Phone verification status      |
| -           | `city`             | Location from cities.json      |
| -           | `birthYear`        | User's birth year              |
| -           | `points`           | User reward points             |
| -           | `lastLogin`        | Last login timestamp           |
| -           | `deletedAt`        | Soft delete support            |

## Breaking Changes
- All endpoints now return `firstName`/`lastName` instead of `name`
- `role` field is now `userType` with different values
- Search now works with first/last name fields
- User list filtering updated for new schema
- Profile update requires new field structure

## Migration Notes
- Existing frontend code needs updates for new field names
- Search functionality should be updated to use new fields
- Role-based access control needs to use new `userType` values
- Any user display logic should concatenate `firstName` + `lastName` for full name
