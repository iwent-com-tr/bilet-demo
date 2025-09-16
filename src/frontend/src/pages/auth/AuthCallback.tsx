import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../../shared/apiClient';
import axios from 'axios';

const AuthCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Google girişi doğrulanıyor...');

  // Helper function to decode base64 (browser compatible)
  const base64Decode = (str: string): string => {
    try {
      return decodeURIComponent(atob(str).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
    } catch (e) {
      console.error('Base64 decode error:', e);
      return '';
    }
  };

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Check if we have auth data in the URL hash (new flow)
        const hash = window.location.hash;
        if (hash.startsWith('#auth=')) {
          // Handle new flow - auth data in URL hash
          const authDataEncoded = decodeURIComponent(hash.substring(6)); // Remove '#auth=' prefix
          const authDataJson = base64Decode(authDataEncoded);
          const authData = JSON.parse(authDataJson);

          if (authData && authData.user) {
            setStatus('success');
            setMessage('Giriş başarılı! Yönlendiriliyorsunuz...');

            // Store tokens if provided
            if (authData.tokens) {
              localStorage.setItem('token', authData.tokens.accessToken);
              if (authData.tokens.refreshToken) {
                localStorage.setItem('refreshToken', authData.tokens.refreshToken);
              }
            }

            // Set axios default authorization header
            if (authData.tokens?.accessToken) {
              axios.defaults.headers.common['Authorization'] = `Bearer ${authData.tokens.accessToken}`;
            }

            // Redirect to home or intended page
            setTimeout(() => {
              navigate('/');
            }, 1000);
            return;
          }
        }

        // Handle old flow - query parameters
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');

        // Check for OAuth errors
        if (error) {
          console.error('OAuth error:', error);
          setStatus('error');
          setMessage('Google girişi başarısız oldu. Lütfen tekrar deneyin.');
          setTimeout(() => navigate('/login'), 3000);
          return;
        }

        // Validate required parameters
        if (!code || !state) {
          console.error('Missing OAuth parameters');
          setStatus('error');
          setMessage('Geçersiz giriş bağlantısı. Lütfen tekrar giriş yapın.');
          setTimeout(() => navigate('/login'), 3000);
          return;
        }

        // Validate state parameter for CSRF protection
        const storedState = sessionStorage.getItem('oauth_state');
        if (!storedState || storedState !== state) {
          console.error('CSRF validation failed');
          setStatus('error');
          setMessage('Güvenlik doğrulaması başarısız. Lütfen tekrar giriş yapın.');
          setTimeout(() => navigate('/login'), 3000);
          return;
        }

        // Clean up stored state
        sessionStorage.removeItem('oauth_state');

        setMessage('Google hesabınız doğrulanıyor...');

        // Call backend to complete authentication
        const response = await api.get('/auth/google/callback', {
          params: { code, state }
        });

        if (response.data && response.data.user) {
          setStatus('success');
          setMessage('Giriş başarılı! Yönlendiriliyorsunuz...');

          // Store tokens if provided
          if (response.data.tokens) {
            localStorage.setItem('token', response.data.tokens.accessToken);
            if (response.data.tokens.refreshToken) {
              localStorage.setItem('refreshToken', response.data.tokens.refreshToken);
            }
          }

          // Set axios default authorization header
          if (response.data.tokens?.accessToken) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.tokens.accessToken}`;
          }

          // Redirect to home or intended page
          setTimeout(() => {
            navigate('/');
          }, 1000);
        } else {
          throw new Error('Authentication failed');
        }

      } catch (error: any) {
        console.error('Authentication callback failed:', error);
        setStatus('error');
        setMessage(error?.response?.data?.message || 'Giriş başarısız oldu. Lütfen tekrar deneyin.');
        setTimeout(() => navigate('/login'), 3000);
      }
    };

    handleCallback();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="bg-gray-800 p-8 rounded-lg shadow-lg max-w-md w-full mx-4">
        <div className="text-center">
          {status === 'loading' && (
            <div className="mb-4">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <div className="text-blue-400 text-lg font-medium">Google ile giriş</div>
            </div>
          )}

          {status === 'success' && (
            <div className="mb-4">
              <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="text-green-400 text-lg font-medium">Giriş başarılı!</div>
            </div>
          )}

          {status === 'error' && (
            <div className="mb-4">
              <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <div className="text-red-400 text-lg font-medium">Giriş başarısız</div>
            </div>
          )}

          <p className="text-gray-300 text-center">{message}</p>

          {status === 'error' && (
            <button
              onClick={() => navigate('/login')}
              className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Tekrar dene
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthCallback;
