class ApiResponse {
  static send(res, { statusCode = 200, data = null, meta = null }) {
    return res.status(statusCode).json({ success: true, data, meta, error: null });
  }

  static error(res, { statusCode = 500, code = 'INTERNAL_ERROR', message, details = [] }) {
    return res.status(statusCode).json({
      success: false,
      data: null,
      error: { code, message, details },
    });
  }
}

module.exports = ApiResponse;
