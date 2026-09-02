const AppError = require("../utils/AppError");

// Wraps a Zod schema: validates req.body and replaces it with the
// parsed/typed result so controllers never touch raw untrusted input.
function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const message = result.error.issues.map((i) => i.message).join(", ");
      return next(new AppError(message, 422));
    }
    req.body = result.data;
    next();
  };
}

module.exports = validate;
