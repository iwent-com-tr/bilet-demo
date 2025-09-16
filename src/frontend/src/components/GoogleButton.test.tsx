import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { GoogleButton } from './GoogleButton';

// Mock axios
jest.mock('../shared/apiClient', () => ({
  api: {
    post: jest.fn(),
  },
}));

// Import after mocking
import { api } from '../shared/apiClient';

// Mock window.location
const mockReplace = jest.fn();
Object.defineProperty(window, 'location', {
  value: { href: '', replace: mockReplace },
  writable: true,
});

// Mock sessionStorage
const mockSessionStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'sessionStorage', {
  value: mockSessionStorage,
});

describe('GoogleButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders Google login button', () => {
    render(<GoogleButton />);
    const button = screen.getByRole('button', { name: /google ile giriş/i });
    expect(button).toBeInTheDocument();
  });

  it('initiates Google login when clicked', async () => {
    // Mock api.post to simulate API call
    const mockApiPost = api.post as jest.Mock;
    mockApiPost.mockResolvedValue({
      data: {
        authUrl: 'https://accounts.google.com/oauth',
        state: 'test-state'
      }
    });

    render(<GoogleButton />);

    const button = screen.getByRole('button', { name: /google ile giriş/i });
    fireEvent.click(button);

    // Should show loading text
    expect(screen.getByText('Yönlendiriliyor...')).toBeInTheDocument();

    // Wait for the async operation to complete
    await new Promise(resolve => setTimeout(resolve, 10));

    // Should call api.post with correct parameters
    expect(mockApiPost).toHaveBeenCalledWith('/auth/google/start', {
      redirectUri: expect.stringContaining('/auth/callback')
    });

    // Should store state in sessionStorage
    expect(mockSessionStorage.setItem).toHaveBeenCalledWith('oauth_state', 'test-state');

    // Should redirect to Google
    expect(window.location.href).toBe('https://accounts.google.com/oauth');
  });

  it('handles API errors gracefully', async () => {
    const mockOnError = jest.fn();

    // Mock api.post to reject
    const mockApiPost = api.post as jest.Mock;
    mockApiPost.mockRejectedValue(new Error('API Error'));

    render(<GoogleButton onError={mockOnError} />);

    const button = screen.getByRole('button', { name: /google ile giriş/i });
    fireEvent.click(button);

    // Should call onError callback
    await screen.findByText('Google ile giriş');
    expect(mockOnError).toHaveBeenCalledWith(expect.any(Error));
  });

  it('applies custom className', () => {
    render(<GoogleButton className="custom-class" />);
    const button = screen.getByRole('button', { name: /google ile giriş/i });
    expect(button).toHaveClass('custom-class');
  });
});
