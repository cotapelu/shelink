/**
 * Maps HTTP status codes to error categories
 * Single responsibility: error code mapping
 */

export enum ApiErrorCode {
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  CONFLICT = 'CONFLICT',
  SERVER_ERROR = 'SERVER_ERROR',
  RATE_LIMITED = 'RATE_LIMITED',
  UNKNOWN = 'UNKNOWN',
}

export function mapStatusCodeToErrorCode(status: number): ApiErrorCode {
  switch (status) {
    case 401:
      return ApiErrorCode.UNAUTHORIZED;
    case 403:
      return ApiErrorCode.FORBIDDEN;
    case 404:
      return ApiErrorCode.NOT_FOUND;
    case 409:
      return ApiErrorCode.CONFLICT;
    case 429:
      return ApiErrorCode.RATE_LIMITED;
    case 422:
      return ApiErrorCode.VALIDATION_ERROR;
    case 500:
    case 502:
    case 503:
      return ApiErrorCode.SERVER_ERROR;
    default:
      return ApiErrorCode.UNKNOWN;
  }
}

export function getUserFacingMessage(errorCode: ApiErrorCode, context?: string): string {
  const messages: Record<ApiErrorCode, string> = {
    [ApiErrorCode.NETWORK_ERROR]: 'Không thể kết nối đến máy chủ. Kiểm tra kết nối mạng.',
    [ApiErrorCode.TIMEOUT]: 'Yêu cầu quá thời gian. Vui lòng thử lại.',
    [ApiErrorCode.UNAUTHORIZED]: 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.',
    [ApiErrorCode.FORBIDDEN]: 'Bạn không có quyền thực hiện hành động này.',
    [ApiErrorCode.NOT_FOUND]: 'Không tìm thấy tài nguyên.',
    [ApiErrorCode.VALIDATION_ERROR]: 'Dữ liệu gửi lên không hợp lệ.',
    [ApiErrorCode.CONFLICT]: 'Xung đột dữ liệu. Vui lòng thử lại.',
    [ApiErrorCode.SERVER_ERROR]: 'Máy chủ gặp lỗi. Đội ngũ kỹ thuật đã được thông báo.',
    [ApiErrorCode.RATE_LIMITED]: 'Quá nhiều yêu cầu. Vui lòng chờ và thử lại.',
    [ApiErrorCode.UNKNOWN]: 'Đã xảy ra lỗi không mong muốn. Vui lòng thử lại sau.',
  };

  return messages[errorCode] || messages[ApiErrorCode.UNKNOWN];
}
