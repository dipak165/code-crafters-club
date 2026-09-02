const AppError = require("../utils/AppError");
const { roleHasPermission } = require("../config/permissions");

// Usage: router.post("/events", protect, requirePermission("CREATE_EVENT"), handler)
//
// Authorization ALWAYS happens here, on the backend, based on
// req.user.role which came from a verified JWT -- never from a
// role field in the request body.
function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError("Authentication required.", 401));
    }
    if (!roleHasPermission(req.user.role, permission)) {
      return next(new AppError("You do not have permission to perform this action.", 403));
    }
    next();
  };
}

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError("Authentication required.", 401));
    }
    if (!allowedRoles.includes(req.user.role)) {
      return next(new AppError("You do not have permission to perform this action.", 403));
    }
    next();
  };
}

module.exports = { requirePermission, requireRole };
