// Standard operational error. Controllers/services throw this;
// the central error middleware turns it into the consistent
// { success:false, message } response shape from spec section 57.
class AppError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
