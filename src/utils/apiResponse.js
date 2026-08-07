function successResponse(data, message = 'Success', meta = null) {
  return {
    success: true,
    message,
    data,
    ...(meta ? { meta } : {})
  };
}

function errorResponse(message, status = 500) {
  return {
    success: false,
    message,
    status
  };
}

module.exports = {
  successResponse,
  errorResponse
};
