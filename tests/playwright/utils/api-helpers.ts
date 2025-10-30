import { APIRequestContext, expect } from '@playwright/test';

export interface ApiResponse<T = any> {
  data: T;
  status: number;
  message?: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface UserData {
  username: string;
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  role: string;
  school?: string;
  specialization?: string;
}

export interface EventData {
  name: string;
  description: string;
  category: string;
  date: string;
  start_time: string;
  end_time: string;
  venue: number;
  max_participants: number;
}

export class ApiHelpers {
  private request: APIRequestContext;
  private baseUrl: string;
  private authToken: string | null = null;

  constructor(request: APIRequestContext, baseUrl: string = 'http://localhost:8000') {
    this.request = request;
    this.baseUrl = baseUrl;
  }

  // Authentication methods
  async login(credentials: LoginCredentials): Promise<ApiResponse<{ access: string; refresh: string }>> {
    const response = await this.request.post(`${this.baseUrl}/api/auth/login/`, {
      data: credentials,
    });

    const responseData = await response.json();
    this.authToken = responseData.access;
    
    expect(response.status()).toBe(200);
    return {
      data: responseData,
      status: response.status(),
    };
  }

  async logout(): Promise<ApiResponse> {
    const response = await this.request.post(`${this.baseUrl}/api/auth/logout/`, {
      headers: this.getAuthHeaders(),
    });

    this.authToken = null;
    
    expect(response.status()).toBe(200);
    return {
      data: await response.json(),
      status: response.status(),
    };
  }

  async refreshToken(): Promise<ApiResponse<{ access: string }>> {
    const response = await this.request.post(`${this.baseUrl}/api/auth/refresh/`, {
      data: { refresh: this.authToken },
    });

    const responseData = await response.json();
    this.authToken = responseData.access;
    
    expect(response.status()).toBe(200);
    return {
      data: responseData,
      status: response.status(),
    };
  }

  // User management methods
  async createUser(userData: UserData): Promise<ApiResponse<UserData>> {
    const response = await this.request.post(`${this.baseUrl}/api/users/`, {
      data: userData,
      headers: this.getAuthHeaders(),
    });

    expect(response.status()).toBe(201);
    return {
      data: await response.json(),
      status: response.status(),
    };
  }

  async getUsers(): Promise<ApiResponse<UserData[]>> {
    const response = await this.request.get(`${this.baseUrl}/api/users/`, {
      headers: this.getAuthHeaders(),
    });

    expect(response.status()).toBe(200);
    return {
      data: await response.json(),
      status: response.status(),
    };
  }

  async getUserById(userId: number): Promise<ApiResponse<UserData>> {
    const response = await this.request.get(`${this.baseUrl}/api/users/${userId}/`, {
      headers: this.getAuthHeaders(),
    });

    expect(response.status()).toBe(200);
    return {
      data: await response.json(),
      status: response.status(),
    };
  }

  async updateUser(userId: number, userData: Partial<UserData>): Promise<ApiResponse<UserData>> {
    const response = await this.request.patch(`${this.baseUrl}/api/users/${userId}/`, {
      data: userData,
      headers: this.getAuthHeaders(),
    });

    expect(response.status()).toBe(200);
    return {
      data: await response.json(),
      status: response.status(),
    };
  }

  async deleteUser(userId: number): Promise<ApiResponse> {
    const response = await this.request.delete(`${this.baseUrl}/api/users/${userId}/`, {
      headers: this.getAuthHeaders(),
    });

    expect(response.status()).toBe(204);
    return {
      data: null,
      status: response.status(),
    };
  }

  // Event management methods
  async createEvent(eventData: EventData): Promise<ApiResponse<EventData>> {
    const response = await this.request.post(`${this.baseUrl}/api/events/`, {
      data: eventData,
      headers: this.getAuthHeaders(),
    });

    expect(response.status()).toBe(201);
    return {
      data: await response.json(),
      status: response.status(),
    };
  }

  async getEvents(): Promise<ApiResponse<EventData[]>> {
    const response = await this.request.get(`${this.baseUrl}/api/events/`, {
      headers: this.getAuthHeaders(),
    });

    expect(response.status()).toBe(200);
    return {
      data: await response.json(),
      status: response.status(),
    };
  }

  async getEventById(eventId: number): Promise<ApiResponse<EventData>> {
    const response = await this.request.get(`${this.baseUrl}/api/events/${eventId}/`, {
      headers: this.getAuthHeaders(),
    });

    expect(response.status()).toBe(200);
    return {
      data: await response.json(),
      status: response.status(),
    };
  }

  async updateEvent(eventId: number, eventData: Partial<EventData>): Promise<ApiResponse<EventData>> {
    const response = await this.request.patch(`${this.baseUrl}/api/events/${eventId}/`, {
      data: eventData,
      headers: this.getAuthHeaders(),
    });

    expect(response.status()).toBe(200);
    return {
      data: await response.json(),
      status: response.status(),
    };
  }

  async deleteEvent(eventId: number): Promise<ApiResponse> {
    const response = await this.request.delete(`${this.baseUrl}/api/events/${eventId}/`, {
      headers: this.getAuthHeaders(),
    });

    expect(response.status()).toBe(204);
    return {
      data: null,
      status: response.status(),
    };
  }

  async registerForEvent(eventId: number): Promise<ApiResponse> {
    const response = await this.request.post(`${this.baseUrl}/api/events/${eventId}/register/`, {
      headers: this.getAuthHeaders(),
    });

    expect(response.status()).toBe(201);
    return {
      data: await response.json(),
      status: response.status(),
    };
  }

  async unregisterFromEvent(eventId: number): Promise<ApiResponse> {
    const response = await this.request.delete(`${this.baseUrl}/api/events/${eventId}/register/`, {
      headers: this.getAuthHeaders(),
    });

    expect(response.status()).toBe(204);
    return {
      data: null,
      status: response.status(),
    };
  }

  // Score management methods
  async submitScore(eventId: number, participantId: number, scoreData: {
    criterion1: number;
    criterion2: number;
    criterion3: number;
    criterion4: number;
    notes?: string;
  }): Promise<ApiResponse> {
    const response = await this.request.post(`${this.baseUrl}/api/scores/`, {
      data: {
        event: eventId,
        participant: participantId,
        ...scoreData,
      },
      headers: this.getAuthHeaders(),
    });

    expect(response.status()).toBe(201);
    return {
      data: await response.json(),
      status: response.status(),
    };
  }

  async getScores(eventId?: number): Promise<ApiResponse> {
    const url = eventId 
      ? `${this.baseUrl}/api/scores/?event=${eventId}`
      : `${this.baseUrl}/api/scores/`;
    
    const response = await this.request.get(url, {
      headers: this.getAuthHeaders(),
    });

    expect(response.status()).toBe(200);
    return {
      data: await response.json(),
      status: response.status(),
    };
  }

  // Utility methods
  private getAuthHeaders(): Record<string, string> {
    return this.authToken 
      ? { 'Authorization': `Bearer ${this.authToken}` }
      : {};
  }

  async isAuthenticated(): Promise<boolean> {
    try {
      const response = await this.request.get(`${this.baseUrl}/api/auth/me/`, {
        headers: this.getAuthHeaders(),
      });
      return response.status() === 200;
    } catch {
      return false;
    }
  }

  async getCurrentUser(): Promise<ApiResponse<UserData>> {
    const response = await this.request.get(`${this.baseUrl}/api/auth/me/`, {
      headers: this.getAuthHeaders(),
    });

    expect(response.status()).toBe(200);
    return {
      data: await response.json(),
      status: response.status(),
    };
  }

  // Health check
  async healthCheck(): Promise<ApiResponse> {
    const response = await this.request.get(`${this.baseUrl}/api/health/`);
    
    expect(response.status()).toBe(200);
    return {
      data: await response.json(),
      status: response.status(),
    };
  }

  // Error handling
  async expectApiError(response: any, expectedStatus: number, expectedMessage?: string): Promise<void> {
    expect(response.status).toBe(expectedStatus);
    if (expectedMessage) {
      expect(response.data.message || response.data.detail).toContain(expectedMessage);
    }
  }
}


