import { z } from "zod";

/**
 * Type for a successful operation result
 */
export interface SuccessResultWithData<T> {
  success: true;
  data: T;
}

/**
 * Type for a successful operation result
 */
export interface SuccessResult {
  success: true;
}

/**
 * Type for a failed operation result
 */
export type FailResult<E> = {
  success: false;
  error: E;
  statusCode: 400 | 403 | 429 | 500;
};

/**
 * Creates a success result with the provided data
 */
export function success<T>(data: T): SuccessResultWithData<T> {
  return {
    success: true,
    data,
  };
}

export function successEmpty(): SuccessResult {
  return {
    success: true,
  };
}

/**
 * Creates a failure result with the provided error
 */
export function fail<E>(
  error: E,
  statusCode: 400 | 403 | 429 | 500
): FailResult<E> {
  return {
    success: false,
    error,
    statusCode,
  };
}

export function convertZodErrorsToFailResult(
  errors: z.ZodError
): FailResult<string> {
  return {
    success: false,
    error: errors.errors.map((error) => error.message).join(", "),
    statusCode: 400,
  };
}
