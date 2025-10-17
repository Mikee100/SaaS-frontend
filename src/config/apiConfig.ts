const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === 'development' ? 'https://saas-business.duckdns.org' : 'http://localhost:9000' );

export default API_BASE_URL;
