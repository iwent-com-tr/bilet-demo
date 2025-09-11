
# Frontend Refactoring Plan: Reusable Components

This document outlines a plan to refactor the frontend codebase by creating reusable components. This will reduce code duplication, improve maintainability, and ensure a consistent UI across the application.

## 1. Analysis of Repeated Components

After analyzing the frontend code, the following components have been identified as having significant code duplication or repeated patterns:

### 1.1. Event Card

The "Event Card" is the most repeated component in the application. It's used in various forms in the following files:

-   `src/frontend/src/components/FavoriteEvents.tsx`
-   `src/frontend/src/components/FeaturedEvents.tsx`
-   `src/frontend/src/components/PopularArtistEvents.tsx`
-   `src/frontend/src/components/RecommendedEvents.tsx`
-   `src/frontend/src/components/WeekEvents.tsx`
-   `src/frontend/src/pages/events/EventList.tsx`
-   `src/frontend/src/components/EventListCalendar.tsx`

These components all display a variation of an event card, with an image, title, date, and venue. Some have additional elements like a "match score".

### 1.2. Entity Card (Artist/Organizer)

A card component for displaying an artist or organizer is used in:

-   `src/frontend/src/components/FeaturedArtists.tsx`
-   `src/frontend/src/components/PopularOrganizers.tsx`

These cards typically contain a circular or square image, a name, and a "Follow" button.

### 1.3. Section with Grid

A container component that includes a title and a grid of items is used in:

-   `src/frontend/src/components/FavoriteEvents.tsx`
-   `src/frontend/src/components/FeaturedEvents.tsx`
-   `src/frontend/src/components/PopularArtistEvents.tsx`
-   `src/frontend/src/components/PopularOrganizers.tsx`
-   `src/frontend/src/components/RecommendedEvents.tsx`
-   `src/frontend/src/components/WeekEvents.tsx`

This component is responsible for the section layout, including the title and the grid container.

### 1.4. Follow Button

The "Takip Et" (Follow) button is present in `FeaturedArtists.tsx` and `PopularOrganizers.tsx`. This can be extracted into a reusable component.

## 2. Proposed Reusable Components

To address the code duplication, the following reusable components should be created in a new `src/frontend/src/components/common` directory.

### 2.1. `EventCard` Component

-   **Purpose:** A versatile component to display event information.
-   **File:** `src/frontend/src/components/common/EventCard.tsx`
-   **Props:**
    -   `event: Event` (A comprehensive `Event` object with all necessary details)
    -   `variant: 'grid' | 'list'` (To handle different layouts, e.g., a grid for the home page and a list for the events page)
    -   `showMatchScore?: boolean` (Optional prop to display the match score)
    -   `onClick?: (event: Event) => void`

### 2.2. `EntityCard` Component

-   **Purpose:** A component for displaying artists or organizers.
-   **File:** `src/frontend/src/components/common/EntityCard.tsx`
-   **Props:**
    -   `entity: { id: string; name: string; image: string; type: 'artist' | 'organizer' }`
    -   `onFollow?: (id: string) => void`

### 2.3. `Section` Component

-   **Purpose:** A layout component for sections with a title and a grid.
-   **File:** `src/frontend/src/components/common/Section.tsx`
-   **Props:**
    -   `title: string`
    -   `children: React.ReactNode`
    -   `viewAllLink?: string` (Optional link to a "view all" page)

### 2.4. `FollowButton` Component

-   **Purpose:** A reusable button for following artists or organizers.
-   **File:** `src/frontend/src/components/common/FollowButton.tsx`
-   **Props:**
    -   `isFollowing: boolean`
    -   `onClick: () => void`
    -   `loading?: boolean`

## 3. Refactoring Plan

The refactoring process will involve the following steps:

1.  **Create the `common` directory:**
    -   Create a new directory: `src/frontend/src/components/common`

2.  **Implement `EventCard.tsx`:**
    -   Create the `EventCard` component with the props defined above.
    -   The component should be able to render both grid and list variants.

3.  **Refactor Event List Components:**
    -   Update `FavoriteEvents.tsx`, `FeaturedEvents.tsx`, `PopularArtistEvents.tsx`, `RecommendedEvents.tsx`, and `WeekEvents.tsx` to use the new `EventCard` component.
    -   Update `EventList.tsx` to use the `EventCard` component with the `list` variant.

4.  **Implement `EntityCard.tsx`:**
    -   Create the `EntityCard` component.

5.  **Refactor Artist/Organizer Components:**
    -   Update `FeaturedArtists.tsx` and `PopularOrganizers.tsx` to use the `EntityCard` component.

6.  **Implement `Section.tsx`:**
    -   Create the `Section` component.

7.  **Refactor Section Components:**
    -   Update all components that have a section with a title and a grid to use the `Section` component.

8.  **Implement `FollowButton.tsx`:**
    -   Create the `FollowButton` component.

9.  **Integrate `FollowButton`:**
    -   Update the `EntityCard` component to use the `FollowButton` component.

By following this plan, we can significantly reduce code duplication and improve the overall quality and maintainability of the frontend codebase.
