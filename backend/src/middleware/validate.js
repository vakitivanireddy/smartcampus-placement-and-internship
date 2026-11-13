const { badRequest } = require('../utils/httpError');

/**
 * Validates `req[source]` against a Zod schema and replaces it with the parsed
 * (and therefore sanitised) value.
 */
function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        field: issue.path.join('.') || source,
        message: issue.message,
      }));
      return next(badRequest('Please correct the highlighted fields.', details));
    }
    req[source] = result.data;
    return next();
  };
}

module.exports = validate;
