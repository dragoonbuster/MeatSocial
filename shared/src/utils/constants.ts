export const APP_CONFIG = {
  // Post limits
  MAX_POST_LENGTH: 280,
  MAX_MESSAGE_LENGTH: 1000,
  MAX_USERNAME_LENGTH: 30,
  MIN_USERNAME_LENGTH: 3,
  
  // Pagination
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  
  // Rate limits (per minute)
  RATE_LIMIT: {
    AUTH: 10,
    POSTS: 20,
    MESSAGES: 60,
    FOLLOWS: 30,
    GENERAL: 100
  },
  
  // Verification
  VERIFICATION_VALIDITY_DAYS: 90,
  NODE_VERIFICATION_TIMEOUT_MINUTES: 15,
  
  // Trust levels
  TRUST_REQUIREMENTS: {
    RESIDENT_DAYS: 30,
    CITIZEN_DAYS: 180,
    ELDER_DAYS: 365 * 2
  },
  
  // Security
  JWT_EXPIRY_HOURS: 24,
  REFRESH_TOKEN_EXPIRY_DAYS: 30,
  SESSION_TIMEOUT_HOURS: 2,
  
  // Content
  CONTENT_MODERATION: {
    AUTO_FLAG_THRESHOLD: 3,
    MANUAL_REVIEW_THRESHOLD: 5
  }
} as const;

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/api/v1/auth/login',
    LOGOUT: '/api/v1/auth/logout',
    REGISTER: '/api/v1/auth/register',
    REFRESH: '/api/v1/auth/refresh',
    VERIFY: '/api/v1/auth/verify'
  },
  USERS: {
    PROFILE: '/api/v1/users/profile',
    SEARCH: '/api/v1/users/search',
    FOLLOW: '/api/v1/users/follow',
    UNFOLLOW: '/api/v1/users/unfollow',
    FOLLOWERS: '/api/v1/users/followers',
    FOLLOWING: '/api/v1/users/following'
  },
  POSTS: {
    CREATE: '/api/v1/posts',
    FEED: '/api/v1/posts/feed',
    USER_POSTS: '/api/v1/posts/user',
    UPDATE: '/api/v1/posts',
    DELETE: '/api/v1/posts'
  },
  MESSAGES: {
    SEND: '/api/v1/messages/send',
    CONVERSATIONS: '/api/v1/messages/conversations',
    HISTORY: '/api/v1/messages/history',
    MARK_READ: '/api/v1/messages/read'
  },
  VERIFICATION: {
    NODES: '/api/v1/verify/nodes',
    STATUS: '/api/v1/verify/status',
    RENEW: '/api/v1/verify/renew'
  }
} as const;

export const ERROR_MESSAGES = {
  UNAUTHORIZED: 'Authentication required',
  FORBIDDEN: 'Access denied',
  NOT_FOUND: 'Resource not found',
  VALIDATION_ERROR: 'Invalid input data',
  RATE_LIMITED: 'Too many requests, please try again later',
  VERIFICATION_REQUIRED: 'Account verification required',
  VERIFICATION_EXPIRED: 'Verification has expired, please renew',
  INTERNAL_ERROR: 'Internal server error',
  SERVICE_UNAVAILABLE: 'Service temporarily unavailable'
} as const;

export const REGEX_PATTERNS = {
  USERNAME: /^[a-zA-Z0-9_]+$/,
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PASSWORD: {
    MIN_LENGTH: 8,
    LOWERCASE: /(?=.*[a-z])/,
    UPPERCASE: /(?=.*[A-Z])/,
    DIGIT: /(?=.*\d)/,
    SPECIAL: /(?=.*[!@#$%^&*])/
  }
} as const;