// api-gateway/src/errors/templates.js
const errorTemplates = {
  SERVICE_UNAVAILABLE: {
    title: 'Service Temporarily Unavailable',
    message: 'The service is temporarily unavailable. Please try again later.',
    action: 'Please wait a few minutes before retrying your request.',
    code: 503
  },
  
  SERVICE_TIMEOUT: {
    title: 'Service Timeout',
    message: 'The service took too long to respond.',
    action: 'Please try your request again.',
    code: 504
  },
  
  RATE_LIMIT: {
    title: 'Too Many Requests',
    message: 'You have exceeded the allowed number of requests.',
    action: 'Please wait before making more requests.',
    code: 429
  },
  
  AUTHENTICATION_FAILED: {
    title: 'Authentication Failed',
    message: 'Unable to authenticate your request.',
    action: 'Please check your credentials and try again.',
    code: 401
  },
  
  VALIDATION_ERROR: {
    title: 'Invalid Request',
    message: 'The request contains invalid data.',
    action: 'Please check your request data and try again.',
    code: 400
  },
  
  NOT_FOUND: {
    title: 'Resource Not Found',
    message: 'The requested resource could not be found.',
    action: 'Please check the URL and try again.',
    code: 404
  },
  
  INTERNAL_ERROR: {
    title: 'Internal Server Error',
    message: 'An unexpected error occurred.',
    action: 'Please try again later.',
    code: 500
  }
};

function createErrorResponse(type, details = null) {
  const template = errorTemplates[type];
  
  if (!template) {
    return {
      status: 'error',
      title: 'Unknown Error',
      message: 'An unexpected error occurred',
      code: 500
    };
  }

  return {
    status: 'error',
    title: template.title,
    message: template.message,
    action: template.action,
    code: template.code,
    ...(details && { details })
  };
}

module.exports = {
  errorTemplates,
  createErrorResponse
};