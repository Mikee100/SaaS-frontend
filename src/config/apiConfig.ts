const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:7050' : 'https://saas-business.duckdns.org');

export default API_BASE_URL;
