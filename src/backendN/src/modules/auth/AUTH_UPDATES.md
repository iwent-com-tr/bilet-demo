# Auth Module Updates

## Overview
Updated the authentication module to align with the new Prisma schema and implement city/county selection from cities.json.

## Key Changes

### 1. Updated User Model Structure
- Changed from `name` field to separate `firstName` and `lastName` fields
- Added `userType` enum (USER, ADMIN) instead of generic role
- Added fields: `birthYear`, `phone`, `phoneVerified`, `city`, `points`, `lastLogin`
- Removed legacy fields that don't match the Prisma schema

### 2. City and County Validation
- Integrated cities.json for city validation
- Added county validation based on selected city
- Created helper functions for city/county data retrieval
- Added API endpoints for frontend to get cities and counties lists

### 3. Enhanced DTOs (Data Transfer Objects)
- **RegisterUserDTO**: Updated to match User model with city validation
- **RegisterOrganizerDTO**: Kept separate for organizer registration
- **UpdateProfileDTO**: Updated with new User fields
- **UpdateUserDTO**: Updated for admin user management
- Added validation helpers for cities and counties

### 4. Service Layer Updates
- **register()**: Now accepts full RegisterInput object with all User fields
- **login()**: Updates lastLogin timestamp
- **refresh()**: Improved error handling and user type management
- Added **registerOrganizer()**: Separate method for organizer registration
- Added **loginOrganizer()**: Handles organizer-specific login logic
- Added **updateUser()** and **getUserById()**: User management methods

### 5. Controller Updates
- Updated sanitization functions to return new User model fields
- Added profile update endpoint
- Separated city/county endpoints into dedicated controller
- Added organizer registration endpoint
- Enhanced error handling

### 6. Route Structure
```
POST /auth/register - User registration
POST /auth/register-organizer - Organizer registration
POST /auth/login - User/Organizer login
POST /auth/refresh - Token refresh
POST /auth/logout - Logout
GET /auth/me - Get current user profile
PUT /auth/profile - Update user profile
GET /auth/cities - Get all cities
GET /auth/counties?city=cityName - Get counties for a city
```

## New Features

### City/County Selection
- Users must select from predefined cities in cities.json
- Counties are validated based on selected city
- Frontend can fetch available cities and counties via API

### User Types
- USER: Regular users (default)
- ADMIN: Admin users with elevated permissions
- ORGANIZER: Event organizers (separate model/table)

### Enhanced Validation
- Password complexity requirements
- Phone number format validation
- Birth year range validation
- City/county validation from JSON data

## Breaking Changes
- Registration now requires firstName/lastName instead of name
- User object structure has changed significantly
- City must be selected from predefined list
- UserType replaces generic role field

## Migration Notes
- Existing users will need data migration for the new schema
- Frontend forms need updates for new field structure
- City selection UI should use the new endpoints
- Authentication tokens now include userType instead of role
