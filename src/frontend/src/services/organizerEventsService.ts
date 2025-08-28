import axios from 'axios';

export interface EventFilters {
  q?: string;
  category?: string;
  city?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface Event {
  id: string;
  name: string;
  slug: string;
  category: string;
  startDate: string;
  endDate: string;
  venue: string;
  address: string;
  city: string;
  banner: string | null;
  description: string | null;
  status: string;
  organizerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface EventsListResponse {
  page: number;
  limit: number;
  total: number;
  data: Event[];
}

export class OrganizerEventsService {
  private static getAuthHeaders() {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No authentication token found');
    }
    return {
      'Authorization': `Bearer ${token}`
    };
  }

  /**
   * Get all events for an organizer with optional filters
   * This method gets ALL events (DRAFT, ACTIVE, CANCELLED, COMPLETED) for the organizer
   */
  static async getOrganizerEvents(
    organizerId: string,
    options: {
      page?: number;
      limit?: number;
      filters?: EventFilters;
    } = {}
  ): Promise<EventsListResponse> {
    const { page = 1, limit = 20, filters = {} } = options;

    try {
      // Build query parameters
      const queryParams = new URLSearchParams();
      queryParams.append('page', page.toString());
      queryParams.append('limit', limit.toString());
      
      // Apply filters
      if (filters.q?.trim()) queryParams.append('q', filters.q.trim());
      if (filters.category) queryParams.append('category', filters.category);
      if (filters.city?.trim()) queryParams.append('city', filters.city.trim());
      if (filters.status) queryParams.append('status', filters.status);
      if (filters.dateFrom) queryParams.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) queryParams.append('dateTo', filters.dateTo);
      
      console.log('Fetching organizer events with params:', queryParams.toString());
      
      // Use the new organizer events endpoint
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/organizers/${organizerId}/events?${queryParams.toString()}`,
        {
          headers: this.getAuthHeaders()
        }
      );
      
      console.log('API Response:', response.data);
      
      if (response.data) {
        const { data: eventsData, total, page: responsePage, limit: responseLimit } = response.data;
        
        // Filter out any null or undefined events
        const validEvents = (eventsData || []).filter((event: any) => {
          if (!event || !event.id) {
            console.warn('Invalid event found:', event);
            return false;
          }
          return true;
        });
        
        console.log('Valid events:', validEvents);
        
        return {
          page: responsePage || page,
          limit: responseLimit || limit,
          total: total || 0,
          data: validEvents
        };
      } else {
        console.log('No events data found in response');
        return {
          page,
          limit,
          total: 0,
          data: []
        };
      }
    } catch (error: any) {
      console.error('Event fetching error:', error);
      console.error('Error details:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
      
      // Re-throw the error so components can handle it appropriately
      throw error;
    }
  }

  /**
   * Get events for dashboard - simplified version without filters, gets all events
   * This is a convenience method for the dashboard that doesn't need complex filtering
   */
  static async getDashboardEvents(organizerId: string): Promise<Event[]> {
    try {
      const response = await this.getOrganizerEvents(organizerId, {
        page: 1,
        limit: 100, // Get more events for dashboard
      });
      
      return response.data;
    } catch (error) {
      console.error('Dashboard events fetching error:', error);
      throw error;
    }
  }

  /**
   * Get events for events page with full filtering support
   */
  static async getFilteredEvents(
    organizerId: string,
    page: number,
    filters: EventFilters
  ): Promise<EventsListResponse> {
    return this.getOrganizerEvents(organizerId, {
      page,
      limit: 20,
      filters
    });
  }
}