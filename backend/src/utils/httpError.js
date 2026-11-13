class AppError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
    this.isOperational = true;
  }
}

function badRequest(message, details) {
  return new AppError(400, message, details);
}

function notFound(message = 'Resource not found') {
  return new AppError(404, message);
}

function forbidden(message = 'You do not have permission to perform this action') {
  return new AppError(403, message);
}

function conflict(message) {
  return new AppError(409, message);
}

module.exports = { AppError, badRequest, notFound, forbidden, conflict };
