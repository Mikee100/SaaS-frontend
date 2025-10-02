// Script to create a user on the hosted backend via frontend API
// This can be run in the browser console after logging in to the frontend

const API_BASE_URL = 'https://saas-business.duckdns.org';

function getAuthHeaders() {
  const headers = {
    'Content-Type': 'application/json',
  };
  const token = localStorage.getItem('token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  } else {
    console.warn('No token found in localStorage. Please log in first.');
  }
  return headers;
}

async function makeAPIRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = {
    ...getAuthHeaders(),
    ...options.headers,
  };

  console.log(`Making ${options.method || 'GET'} request to ${url}`);

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include',
    });

    const responseText = await response.text();
    let responseData;

    try {
      responseData = responseText ? JSON.parse(responseText) : null;
    } catch (e) {
      console.error('Failed to parse JSON response:', e, 'Response text:', responseText);
      throw new Error('Invalid JSON response from server');
    }

    if (!response.ok) {
      console.error(`Request failed with status ${response.status}:`, responseData);
      throw new Error(responseData?.message || `HTTP error! status: ${response.status}`);
    }

    return responseData;
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
}

async function createUser(userData) {
  try {
    console.log('Creating user:', userData);
    const result = await makeAPIRequest('/user', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    console.log('User created successfully:', result);
    return result;
  } catch (error) {
    console.error('Failed to create user:', error);
    throw error;
  }
}

// Function to create the test user
async function createTestUser() {
  try {
    const userData = {
      email: 'test@example.com',
      password: 'test123',
      name: 'Test User',
      role: 'owner',
    };

    const result = await createUser(userData);
    console.log('Test user created successfully!');
    console.log('Email: test@example.com');
    console.log('Password: test123');
    return result;
  } catch (error) {
    console.error('Failed to create test user:', error);
  }
}

// Expose functions to global scope for browser console usage
if (typeof window !== 'undefined') {
  window.createUser = createUser;
  window.createTestUser = createTestUser;
  console.log('User creation functions loaded. Use createTestUser() to create the test user.');
}

export { createUser, createTestUser };
