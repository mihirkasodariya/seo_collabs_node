export const resMessage = {
  INTERNAL_SERVER_ERROR:
    "Oops! Something went wrong on our end. We're working on it—please refresh or try again later.!",
  SERVICE_ERROR: "Internal service failure. Operation could not be completed.",
  NO_TOKEN_PROVIDED: "Authentication token is missing. Please log in.!",
  UNAUTHORISED: "You are not authorized to perform this action.!",
  TOKEN_EXPIRED: "Your session has expired. Please log in again.!",
  TOKEN_INVALID: "Invalid authentication token. Please log in again.!",
  USER_FOUND: "An account with this email already exists!",
  USER_REGISTER: "Successfully signed up. Login to access your account!",
  USER_NOT_FOUND: "You don't have an account yet. Please sign up first!",
  GOOGLE_USER:
    "Your account was created using Google. Please continue by signing in with 'Sign in with Google'.",
  INCORRECT_PASSWORD:
    "Invalid current password. Please re-enter your password!",
  LOGIN_SUCCESS: "Hello You're logged in successfully!",
  ACCESS_DENIED: "Access Denied!",
  ACTION_COMPLETE: "Action completed successfully.",

  WEBSITE_EXISTS: "Website already exists",
  WEBSITE_ADD: "Website added successfully",
  WEBSITE_GET: "Website fetched successfully",
  WEBSITE_UPDATED: "Website updated successfully",
  WEBSITE_DELETED: "Website deleted successfully",

  LINK_EXCHANGE_GET: "Link Exchange fetched successfully",
  // WEBSITE_UPDATED: "Website updated successfully",
  // WEBSITE_DELETED: "Website deleted successfully",
};

export const resStatusCode = {
  ACTION_COMPLETE: 200, // OK
  CREATED: 201, // Resource created successfully
  ACCEPTED: 202, // Request accepted but processing not complete
  NO_CONTENT: 204, // No content to send back
  CLIENT_ERROR: 400, // Bad request
  UNAUTHORISED: 401, // Unauthorized
  FORBIDDEN: 403, // Forbidden
  NOT_FOUND: 404, // Resource not found
  CONFLICT: 409, // Conflict
  UNSUPPORTED_MEDIA_TYPE: 415, // Unsupported content type
  TOO_MANY_REQUESTS: 429, // Rate limit exceeded
  INTERNAL_SERVER_ERROR: 500, // Generic server error
  NOT_IMPLEMENTED: 501, // Not implemented on server
  SERVICE_UNAVAILABLE: 503, // Server temporarily unavailable
  GATEWAY_TIMEOUT: 504, // Gateway timeout (useful for proxy setups)
  INVALID_TOKEN: 505, // invalid or expric token
};

export const dbTableName = {
  AUTH: "users",
  WEBSITE: "websites",
  CHAT: "chats"
};
