# Database Schema Documentation

This documentation describes the Prisma schema for the event management application database. The schema is designed using PostgreSQL as the backend database, with Prisma as the ORM for TypeScript integration. It follows a **supertype-subtype pattern** for events, where the `Event` model holds common attributes, and category-specific details are stored in separate subtype models (e.g., `ConcertDetails`, `ConferenceDetails`). The schema supports two user types (regular users and organizers), event creation with ticket sales, event-specific chat rooms, user friendships, private messaging, user blocking functionality, and a points system for users.

The application is in the demo phase, with the backend being restructured to support these features using Node.js and TypeScript.

## Table of Contents

- Enums
- Models
  - User
  - Organizer
  - Event
  - ConcertDetails
  - FestivalDetails
  - UniversityDetails
  - WorkshopDetails
  - ConferenceDetails
  - SportDetails
  - PerformanceDetails
  - EducationDetails
  - Ticket
  - ChatMessage
  - Friendship
  - PrivateMessage
  - Block
- Relationships Overview
- Indexes
- Additional Notes

## Enums

Enums define restricted values for fields to ensure data consistency and type safety in TypeScript.

- **EventCategory**: Defines the type of event.
  - Values: `CONCERT`, `FESTIVAL`, `UNIVERSITY`, `WORKSHOP`, `CONFERENCE`, `SPORT`, `PERFORMANCE`, `EDUCATION`
- **EventStatus**: Represents the lifecycle status of an event.
  - Values: `DRAFT`, `ACTIVE`, `CANCELLED`, `COMPLETED`
- **TicketStatus**: Status of a ticket.
  - Values: `ACTIVE`, `USED`, `CANCELLED`
- **SenderType**: Type of sender in chat messages.
  - Values: `USER`, `ORGANIZER`
- **ChatMessageStatus**: Status of chat messages.
  - Values: `ACTIVE`, `DELETED`
- **FriendshipStatus**: Status of friendship requests between users.
  - Values: `PENDING`, `ACCEPTED`, `REJECTED`
- **PrivateMessageStatus**: Status of private messages between users.
  - Values: `SENT`, `READ`, `DELETED`

## Models

Each model represents a database table. Fields include data types, default values, and constraints. All models include `createdAt` and `updatedAt` timestamps for auditing purposes (except for `Block` and `Friendship` models which only have `createdAt`). Variable names are in English and follow camelCase for TypeScript compatibility.

### User

Represents regular users (customers) who can purchase tickets, participate in event-specific chats, add friends, send private messages, block other users, and accumulate points.

- **id**: `String` (UUID, primary key, auto-generated)
- **firstName**: `String` (required)
- **lastName**: `String` (required)
- **email**: `String` (unique, required)
- **password**: `String` (required, hashed in application logic)
- **birthYear**: `Int` (required)
- **phone**: `String` (required)
- **phoneVerified**: `Boolean` (default: false) – Indicates if the phone number is verified
- **avatar**: `String` (optional) – URL for user avatar image
- **city**: `String` (required)
- **lastLogin**: `DateTime` (optional) – Tracks last login time
- **points**: `Int` (default: 0) – Tracks user points for rewards or ratings
- **createdAt**: `DateTime` (default: now())
- **updatedAt**: `DateTime` (auto-updated on changes)
- **deletedAt**: `DateTime` (optional) – Soft delete timestamp
- **Relationships**:
  - `tickets`: One-to-many with `Ticket` (users can have multiple tickets)
  - `friendshipsFrom`: One-to-many with `Friendship` (friendship requests sent by the user)
  - `friendshipsTo`: One-to-many with `Friendship` (friendship requests received by the user)
  - `sentMessages`: One-to-many with `PrivateMessage` (messages sent by the user)
  - `receivedMessages`: One-to-many with `PrivateMessage` (messages received by the user)
  - `blocksFrom`: One-to-many with `Block` (users blocked by this user)
  - `blocksTo`: One-to-many with `Block` (this user blocked by others)

### Organizer

Represents event organizers who create and manage events.

- **id**: `String` (UUID, primary key, auto-generated)
- **firstName**: `String` (required)
- **lastName**: `String` (required)
- **company**: `String` (required)
- **phone**: `String` (required)
- **email**: `String` (unique, required)
- **password**: `String` (required)
- **phoneVerified**: `Boolean` (default: false) – Indicates if the phone number is verified
- **avatar**: `String` (optional) – URL for user avatar image
- **taxNumber**: `String` (optional)
- **taxOffice**: `String` (optional)
- **address**: `String` (optional)
- **bankAccount**: `String` (optional)
- **lastLogin**: `DateTime` (optional)
- **approved**: `Boolean` (default: false) – Indicates if the organizer is approved by admins
- **devices**: `Json` (default: \[\]) – Array of device information for security
- **createdAt**: `DateTime` (default: now())
- **updatedAt**: `DateTime` (auto-updated)
- **deletedAt**: `DateTime` (optional) – Soft delete timestamp
- **Relationships**:
  - `events`: One-to-many with `Event` (organizers can create multiple events)

### Event

Supertype model for all events, containing common attributes for all event categories. Category-specific details are stored in subtype models.

- **id**: `String` (UUID, primary key, auto-generated)
- **name**: `String` (required)
- **slug**: `String` (unique, required, auto-generated from name)
- **category**: `EventCategory` (required)
- **startDate**: `DateTime` (required)
- **endDate**: `DateTime` (required)
- **venue**: `String` (required)
- **address**: `String` (required)
- **city**: `String` (required)
- **banner**: `String` (optional) – URL for event banner image
- **socialMedia**: `Json` (default: {}) – Object of social media links (e.g., {twitter: "url", instagram: "url"})
- **description**: `String` (optional)
- **capacity**: `Int` (optional) – Maximum number of attendees
- **ticketTypes**: `Json` (default: \[\]) – Array of ticket types (e.g., \[{type: "VIP", price: 100}\])
- **status**: `EventStatus` (default: DRAFT)
- **organizerId**: `String` (required, foreign key)
- **createdAt**: `DateTime` (default: now())
- **updatedAt**: `DateTime` (auto-updated)
- **deletedAt**: `DateTime` (optional) – Soft delete timestamp
- **Relationships**:
  - `organizer`: Many-to-one with `Organizer`
  - `tickets`: One-to-many with `Ticket`
  - `chatMessages`: One-to-many with `ChatMessage`
  - `concertDetails`: One-to-one with `ConcertDetails` (optional)
  - `festivalDetails`: One-to-one with `FestivalDetails` (optional)
  - `universityDetails`: One-to-one with `UniversityDetails` (optional)
  - `workshopDetails`: One-to-one with `WorkshopDetails` (optional)
  - `conferenceDetails`: One-to-one with `ConferenceDetails` (optional)
  - `sportDetails`: One-to-one with `SportDetails` (optional)
  - `performanceDetails`: One-to-one with `PerformanceDetails` (optional)
  - `educationDetails`: One-to-one with `EducationDetails` (optional)

### ConcertDetails

Subtype model for `CONCERT` category events.

- **id**: `String` (UUID, primary key, auto-generated)
- **eventId**: `String` (unique, foreign key to `Event`)
- **artistList**: `Json` (default: \[\]) – Array of artists (e.g., \[{name: "Artist1", role: "Lead"}\])
- **stageSetup**: `String` (optional) – Stage configuration details
- **duration**: `String` (optional, PostgreSQL Interval) – Event duration
- **createdAt**: `DateTime` (default: now())
- **updatedAt**: `DateTime` (auto-updated)
- **Relationships**:
  - `event`: One-to-one with `Event` (onDelete: Cascade)

### FestivalDetails

Subtype model for `FESTIVAL` category events.

- **id**: `String` (UUID, primary key, auto-generated)
- **eventId**: `String` (unique, foreign key to `Event`)
- **lineup**: `Json` (default: \[\]) – Array of performers and times (e.g., \[{artist: "Artist1", time: "18:00"}\])
- **sponsors**: `Json` (default: \[\]) – Array of sponsors (e.g., \[{name: "Sponsor1", logo: "url"}\])
- **activities**: `String[]` – Array of activity descriptions
- **createdAt**: `DateTime` (default: now())
- **updatedAt**: `DateTime` (auto-updated)
- **Relationships**:
  - `event`: One-to-one with `Event` (onDelete: Cascade)

### UniversityDetails

Subtype model for `UNIVERSITY` category events.

- **id**: `String` (UUID, primary key, auto-generated)
- **eventId**: `String` (unique, foreign key to `Event`)
- **campus**: `String` (optional) – Campus name
- **department**: `String` (optional) – Organizing department
- **studentDiscount**: `Boolean` (default: false) – Indicates if student discounts are available
- **facultyList**: `Json` (default: \[\]) – Array of faculty or speakers (e.g., \[{name: "Prof. X", role: "Speaker"}\])
- **createdAt**: `DateTime` (default: now())
- **updatedAt**: `DateTime` (auto-updated)
- **Relationships**:
  - `event`: One-to-one with `Event` (onDelete: Cascade)

### WorkshopDetails

Subtype model for `WORKSHOP` category events.

- **id**: `String` (UUID, primary key, auto-generated)
- **eventId**: `String` (unique, foreign key to `Event`)
- **instructorList**: `Json` (default: \[\]) – Array of instructors (e.g., \[{name: "Instructor1", bio: "..."}\])
- **materials**: `Json` (default: \[\]) – Array of required materials (e.g., \[{item: "Laptop", required: true}\])
- **skillLevel**: `String` (optional) – e.g., "Beginner", "Intermediate"
- **createdAt**: `DateTime` (default: now())
- **updatedAt**: `DateTime` (auto-updated)
- **Relationships**:
  - `event`: One-to-one with `Event` (onDelete: Cascade)

### ConferenceDetails

Subtype model for `CONFERENCE` category events.

- **id**: `String` (UUID, primary key, auto-generated)
- **eventId**: `String` (unique, foreign key to `Event`)
- **speakerList**: `Json` (default: \[\]) – Array of speakers (e.g., \[{name: "Speaker1", topic: "AI"}\])
- **agenda**: `Json` (default: \[\]) – Array of agenda items (e.g., \[{time: "09:00", title: "Keynote"}\])
- **topics**: `String[]` – Array of conference topics
- **hasCertificate**: `Boolean` (default: false) – Indicates if certificates are provided
- **createdAt**: `DateTime` (default: now())
- **updatedAt**: `DateTime` (auto-updated)
- **Relationships**:
  - `event`: One-to-one with `Event` (onDelete: Cascade)

### SportDetails

Subtype model for `SPORT` category events.

- **id**: `String` (UUID, primary key, auto-generated)
- **eventId**: `String` (unique, foreign key to `Event`)
- **teams**: `Json` (default: \[\]) – Array of teams (e.g., \[{name: "Team A", players: \[...\]}\])
- **league**: `String` (optional) – League or competition name
- **scoreTracking**: `Boolean` (default: false) – Indicates if scores are tracked
- **rules**: `String` (optional) – Event rules
- **createdAt**: `DateTime` (default: now())
- **updatedAt**: `DateTime` (auto-updated)
- **Relationships**:
  - `event`: One-to-one with `Event` (onDelete: Cascade)

### PerformanceDetails

Subtype model for `PERFORMANCE` category events.

- **id**: `String` (UUID, primary key, auto-generated)
- **eventId**: `String` (unique, foreign key to `Event`)
- **performers**: `Json` (default: \[\]) – Array of performers (e.g., \[{name: "Performer1", role: "Actor"}\])
- **scriptSummary**: `String` (optional) – Summary of the performance script
- **duration**: `String` (optional, PostgreSQL Interval) – Event duration
- **genre**: `String` (optional) – e.g., "Theater", "Dance"
- **createdAt**: `DateTime` (default: now())
- **updatedAt**: `DateTime` (auto-updated)
- **Relationships**:
  - `event`: One-to-one with `Event` (onDelete: Cascade)

### EducationDetails

Subtype model for `EDUCATION` category events.

- **id**: `String` (UUID, primary key, auto-generated)
- **eventId**: `String` (unique, foreign key to `Event`)
- **curriculum**: `Json` (default: \[\]) – Array of curriculum modules (e.g., \[{module: "Intro", duration: "1h"}\])
- **instructors**: `Json` (default: \[\]) – Array of instructors (e.g., \[{name: "Instructor1", bio: "..."}\])
- **prerequisites**: `String[]` – Array of prerequisites
- **certification**: `Boolean` (default: false) – Indicates if certification is provided
- **createdAt**: `DateTime` (default: now())
- **updatedAt**: `DateTime` (auto-updated)
- **Relationships**:
  - `event`: One-to-one with `Event` (onDelete: Cascade)

### Ticket

Represents tickets purchased for events.

- **id**: `String` (UUID, primary key, auto-generated)
- **eventId**: `String` (required, foreign key)
- **userId**: `String` (required, foreign key)
- **ticketType**: `String` (required) – e.g., "VIP", "General"
- **price**: `Decimal` (10,2, required) – Ticket price
- **qrCode**: `String` (optional, unique) – QR code for entry
- **status**: `TicketStatus` (default: ACTIVE)
- **entryTime**: `DateTime` (optional) – Time of entry
- **gate**: `String` (optional) – Entry gate
- **deviceId**: `String` (optional) – Device used for ticket
- **referenceCode**: `String` (optional) – Unique reference code
- **createdAt**: `DateTime` (default: now())
- **updatedAt**: `DateTime` (auto-updated)
- **Relationships**:
  - `event`: Many-to-one with `Event`
  - `user`: Many-to-one with `User`

### ChatMessage

Represents messages in event-specific chat rooms.

- **id**: `String` (UUID, primary key, auto-generated)
- **eventId**: `String` (required, foreign key)
- **senderId**: `String` (required) – ID of the sender (User or Organizer)
- **senderType**: `SenderType` (required) – Indicates if sender is USER or ORGANIZER
- **message**: `String` (required) – Message content
- **status**: `ChatMessageStatus` (default: ACTIVE)
- **createdAt**: `DateTime` (default: now())
- **updatedAt**: `DateTime` (auto-updated)
- **Relationships**:
  - `event`: Many-to-one with `Event`

### Friendship

Represents friendships or friend requests between users.

- **id**: `String` (UUID, primary key, auto-generated)
- **fromUserId**: `String` (required, foreign key) – Sender of the friend request
- **toUserId**: `String` (required, foreign key) – Receiver of the friend request
- **status**: `FriendshipStatus` (default: PENDING)
- **createdAt**: `DateTime` (default: now())
- **Relationships**:
  - `fromUser`: Many-to-one with `User` (sender)
  - `toUser`: Many-to-one with `User` (receiver)

### PrivateMessage

Represents private messages between users.

- **id**: `String` (UUID, primary key, auto-generated)
- **senderId**: `String` (required, foreign key) – Sender of the message
- **receiverId**: `String` (required, foreign key) – Receiver of the message
- **message**: `String` (required) – Message content
- **status**: `PrivateMessageStatus` (default: SENT)
- **createdAt**: `DateTime` (default: now())
- **updatedAt**: `DateTime` (auto-updated)
- **Relationships**:
  - `sender`: Many-to-one with `User`
  - `receiver`: Many-to-one with `User`

### Block

Represents user blocking functionality, allowing users to block other users.

- **id**: `String` (UUID, primary key, auto-generated)
- **blockerId**: `String` (required, foreign key) – ID of the user who is blocking
- **blockedId**: `String` (required, foreign key) – ID of the user being blocked
- **createdAt**: `DateTime` (default: now())
- **Relationships**:
  - `blocker`: Many-to-one with `User` (user who blocks)
  - `blocked`: Many-to-one with `User` (user being blocked)

## Relationships Overview

- **User**:
  - Has many `Ticket` records.
  - Can send/receive many `Friendship` requests.
  - Can send/receive many `PrivateMessage` records.
  - Can block/be blocked by other users through `Block` records.
- **Organizer**:
  - Can create many `Event` records.
- **Event**:
  - Belongs to one `Organizer`.
  - Has many `Ticket` and `ChatMessage` records.
  - Has one optional subtype record (`ConcertDetails`, `FestivalDetails`, etc.).
- **Ticket**:
  - Belongs to one `Event` and one `User`.
- **ChatMessage**:
  - Belongs to one `Event`.
- **Friendship**:
  - Links two `User` records (fromUser and toUser).
- **PrivateMessage**:
  - Links two `User` records (sender and receiver).
- **Block**:
  - Links two `User` records (blocker and blocked).

## Indexes

Indexes are defined to optimize query performance:

- **User**: `email` (unique)
- **Organizer**: `email` (unique)
- **Event**: `organizerId`, `status`
- **Ticket**: `eventId`, `userId`, `qrCode` (unique)
- **ChatMessage**: `eventId`
- **Friendship**: `fromUserId`, `toUserId`, unique constraint on `[fromUserId, toUserId]`
- **PrivateMessage**: `senderId`, `receiverId`
- **Block**: `blockerId`, `blockedId`, unique constraint on `[blockerId, blockedId]`
- **All Subtype Models** (`ConcertDetails`, etc.): `eventId` (unique)

## Additional Notes

- **Supertype-Subtype Pattern**: The `Event` model serves as the supertype, with common fields for all events. Each event category (e.g., CONCERT, CONFERENCE) has a dedicated subtype model with category-specific fields, linked via `eventId` (one-to-one). This ensures clean data modeling and avoids null values for irrelevant fields.
- **TypeScript Integration**: Prisma generates TypeScript types automatically, ensuring type safety for queries and mutations. Use libraries like Zod for runtime validation of JSON fields (e.g., `ticketTypes`, `artistList`).
- **Data Integrity**: `ON DELETE CASCADE` is used for relationships (e.g., subtype models, tickets) to ensure orphaned records are not left behind.
- **Soft Delete Support**: Both `User`, `Organizer`, and `Event` models include `deletedAt` field for soft delete functionality, allowing data preservation while marking records as deleted.
- **User Blocking System**: The `Block` model enables users to block other users, preventing unwanted interactions. The unique constraint on `[blockerId, blockedId]` ensures a user cannot block the same person multiple times.
- **Scalability**: For high-volume chat interactions, consider integrating a real-time messaging solution (e.g., Socket.io) alongside `ChatMessage` storage. Materialized views can be used for complex queries involving multiple subtype tables.
- **Security**: Passwords should be hashed (e.g., using bcrypt) in the application layer. The `approved` field in `Organizer` supports admin verification workflows.
- **Extensibility**: New event categories can be added by creating new subtype models without altering existing ones.

This schema is optimized for the demo phase, with flexibility for future growth. For further details or example queries, refer to the Prisma Client documentation or contact the development team.