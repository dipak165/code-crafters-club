const env = require("../config/env");

// Centralized error handler -- consistent response shape
// (spec section 57), no stack traces leaked in production.
// eslint-disable-next-line no-unused-vars
module.exports = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const isOperational = err.isOperational || false;

  if (!isOperational) {
    // eslint-disable-next-line no-console
    console.error("UNEXPECTED ERROR:", err);
  }

  res.status(statusCode).json({
    success: false,
    message: isOperational ? err.message : "Something went wrong. Please try again later.",
    ...(env.nodeEnv === "development" && !isOperational ? { stack: err.stack } : {}),
  });
};
