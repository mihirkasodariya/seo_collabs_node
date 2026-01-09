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
  OTP_VERIFICATION_NOT_COMPLETED: "Please re-verify your details on the registration page. Check your email for the OTP, enter it to complete verification, and then log in.",
  GOOGLE_USER:
    "Your account was created using Google. Please continue by signing in with 'Sign in with Google'.",
  INCORRECT_PASSWORD:
    "Invalid current password. Please re-enter your password!",
  LOGIN_SUCCESS: "Hello You're logged in successfully!",
  ACCESS_DENIED: "Access Denied!",
  ACTION_COMPLETE: "Action completed successfully.",
  EMAIL_VERIFIED_SUCCESSFULLY: "email verified successfully.",
  WEBSITE_EXISTS: "Website already exists",
  WEBSITE_ADD: "Website added successfully",
  WEBSITE_GET: "Website fetched successfully",
  WEBSITE_UPDATED: "Website updated successfully",
  WEBSITE_DELETED: "Website deleted successfully",
  LINK_EXCHANGE_GET: "Link Exchange fetched successfully",
  RETRY_OTP: "Oops! Something went wrong. Please try again in a few seconds.",
  INVALID_OTP: "Invalid OTP",
  EXPIRED_OTP: "OTP has expired",
  OTP_ALREDY_USE: "User already verified",
  OTP_SEND: "New OTP sent successfully",
  WEB_OTP_SEND: "OTP sent successfully",
  ADMIN_NOT_FOUND: "This admin account does not exist.",

  PLAN_ADD: "Plan added successfully",
  PLAN_GET: "Plan fetched successfully",
  PLAN_UPDATED: "Plan updated successfully",

  REQUEST_EXCHANGE: "Exchange request sent successfully.",
  URL_NOT_MATCH: "URL does not match. Please check the URL.",
  GET_EXCHANGE_LIST: "Exchange list fetched successfully.",
  STATUS_UPDATE_EXCHANGE: "Exchange status updated successfully.",

  WEBSITE_VERIFY: "Website ownership verified",
  WEBSITE_FAILED: "Verification failed. Meta tag not found",
  ADD_REPORT_USER: "User reported successfully",
  MSG_LIMIT: "Your message limit has been reached. You can send an exchange request again after 24 hours."
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
  INVALID_TOKEN: 401, // invalid or expric token
};

export const dbTableName = {
  AUTH: "users",
  WEBSITE: "websites",
  CHAT: "chats",
  TEMP_OTP: "temp_otps",
  PLANS: "plans",
  USER_EXCHANGE: "user_exchanges",
  REPORT_USER: "reported_user",
  ACTIVITY: "activity",
  FAQ: "faq",
  PAYMENT_HISTORY: "payment_historys",
  SUBSCRIPTION:"subscriptions"
};
