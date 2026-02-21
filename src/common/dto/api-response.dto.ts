/**
 * Standard API Response Format
 * All API endpoints should return responses in this format
 */

export class ApiResponseDto<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata?: {
    timestamp: string;
    path?: string;
    version?: string;
  };

  constructor(
    success: boolean,
    data?: T,
    message?: string,
    error?: { code: string; message: string; details?: any },
  ) {
    this.success = success;
    this.data = data;
    this.message = message;
    this.error = error;
    this.metadata = {
      timestamp: new Date().toISOString(),
    };
  }

  static success<T>(data?: T, message?: string): ApiResponseDto<T> {
    return new ApiResponseDto(true, data, message);
  }

  static error(
    code: string,
    message: string,
    details?: any,
  ): ApiResponseDto<null> {
    return new ApiResponseDto(false, null, undefined, {
      code,
      message,
      details,
    });
  }
}
