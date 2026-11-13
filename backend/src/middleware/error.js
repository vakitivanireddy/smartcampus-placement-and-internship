const { AppError } = require('../utils/httpError');

function notFoundHandler(req, res, next) {
  next(new AppError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

// eslint-disable-next-line no-unused-vars
function errorHandler(error, req, res, next) {
  let status = error.status || 500;
  let message = error.message || 'Something went wrong';
  let details = error.details;

  if (error.code === 'ER_DUP_ENTRY') {
    status = 409;
    message = 'That record already exists.';
  } else if (error.code === 'ER_NO_REFERENCED_ROW_2' || error.code === 'ER_ROW_IS_REFERENCED_2') {
    status = 409;
    message = 'This record is still referenced by other data and cannot be changed.';
  } else if (error.code === 'LIMIT_FILE_SIZE') {
    status = 400;
    message = error.message;
  } else if (error.type === 'entity.parse.failed') {
    status = 400;
    message = 'Invalid JSON request body.';
  }

  if (status >= 500) {
    // Keep stack traces in server logs, never in API responses.
    console.error(error);
    if (process.env.NODE_ENV === 'production') {
      message = 'An unexpected server error occurred.';
      details = undefined;
    }
  }

  res.status(status).json({
    error: {
      message,
      ...(details ? { details } : {}),
    },
  });
}

module.exports = { notFoundHandler, errorHandler };
