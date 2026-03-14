const successResponse = (res, data = {}, meta = {}, message = 'OK') => {
  return res.status(200).json({
    success: true,
    data,
    meta,
    state: {
      is_loading: false,
      is_empty: false,
      error: null
    },
    message
  });
};

const emptyResponse = (
  res,
  data = {},
  meta = {},
  message = 'No data found'
) => {
  return res.status(200).json({
    success: true,
    data,
    meta,
    state: {
      is_loading: false,
      is_empty: true,
      error: null
    },
    message
  });
};

const errorResponse = (
  res,
  code = 'PUBLIC_DATA_ERROR',
  message = 'Failed to retrieve public data',
  status = 500,
  extra = {}
) => {
  return res.status(status).json({
    success: false,
    error: {
      code,
      message,
      ...extra
    }
  });
};

module.exports = {
  successResponse,
  emptyResponse,
  errorResponse
};
