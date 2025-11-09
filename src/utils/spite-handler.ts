/**
 * Spite Handler - TypeScript implementation of Go's spite.go
 * Handles TaskContext and Spite response parsing
 */

import type { TaskContext } from '../generated/web/client/clientpb/client_pb';
import type { Spite, Status } from '../generated/web/implant/implantpb/implant_pb';
import type { Response } from '../generated/web/implant/implantpb/module_pb';

// Error codes from malice-network/helper/errs
export enum MaleficError {
  None = 0,
  Panic = 1,
  UnpackError = 2,
  Missbody = 3,
  ModuleError = 4,
  ModuleNotFound = 5,
  TaskError = 6,
  TaskNotFound = 7,
  TaskOperatorNotFound = 8,
  ExtensionNotFound = 9,
  UnexceptBody = 10,
}

export enum TaskError {
  None = 0,
  OperatorError = 1,
  NotExpectBody = 2,
  FieldRequired = 3,
  FieldLengthMismatch = 4,
  FieldInvalid = 5,
  TaskError = 6,
}

export class SpiteError extends Error {
  constructor(message: string, public code?: number) {
    super(message);
    this.name = 'SpiteError';
  }
}

/**
 * Handle Malefic error from Spite
 */
export function handleMaleficError(spite: Spite | null | undefined): Error | null {
  if (!spite) {
    return new SpiteError('nil spite');
  }

  const errorCode = spite.error || 0;

  switch (errorCode) {
    case MaleficError.None:
      return null;
    case MaleficError.Panic:
      return new SpiteError('module Panic', errorCode);
    case MaleficError.UnpackError:
      return new SpiteError('module unpack error', errorCode);
    case MaleficError.Missbody:
      return new SpiteError('module miss body', errorCode);
    case MaleficError.ModuleError:
      return new SpiteError('module error', errorCode);
    case MaleficError.ModuleNotFound:
      return new SpiteError('module not found', errorCode);
    case MaleficError.TaskError:
      return handleTaskError(spite.status);
    case MaleficError.TaskNotFound:
      return new SpiteError('task not found', errorCode);
    case MaleficError.TaskOperatorNotFound:
      return new SpiteError('task operator not found', errorCode);
    case MaleficError.ExtensionNotFound:
      return new SpiteError('extension not found', errorCode);
    case MaleficError.UnexceptBody:
      return new SpiteError('unexcept body', errorCode);
    default:
      return new SpiteError(`unknown Malefic error: ${errorCode}`, errorCode);
  }
}

/**
 * Handle Task error from Status
 */
export function handleTaskError(status: Status | null | undefined): Error | null {
  if (!status) {
    return new SpiteError('nil status or unknown error');
  }

  const statusCode = status.status || 0;
  const errorMsg = status.error || 'unknown error';

  switch (statusCode) {
    case TaskError.None:
      return null;
    case TaskError.OperatorError:
      return new SpiteError(`task error: ${errorMsg}`, statusCode);
    case TaskError.NotExpectBody:
      return new SpiteError(`task error: ${errorMsg}`, statusCode);
    case TaskError.FieldRequired:
      return new SpiteError(`task error: ${errorMsg}`, statusCode);
    case TaskError.FieldLengthMismatch:
      return new SpiteError(`task error: ${errorMsg}`, statusCode);
    case TaskError.FieldInvalid:
      return new SpiteError(`task error: ${errorMsg}`, statusCode);
    case TaskError.TaskError:
      return new SpiteError(`task error: ${errorMsg}`, statusCode);
    default:
      return new SpiteError(`unknown error: ${JSON.stringify(status)}`, statusCode);
  }
}

/**
 * Extract Response from Spite body
 */
export function extractResponse(spite: Spite | null | undefined): Response | null {
  if (!spite) {
    return null;
  }

  const body = spite.body;
  if (!body) {
    return null;
  }

  // Check if body.case is "response"
  if (body.case === 'response' && body.value) {
    return body.value as Response;
  }

  return null;
}

/**
 * Extract Response from TaskContext
 * This is the main function to use for sync_* methods
 */
export function extractResponseFromTaskContext(taskContext: TaskContext | null | undefined): Response | null {
  if (!taskContext) {
    return null;
  }

  const spite = taskContext.spite;
  if (!spite) {
    return null;
  }

  // Check for errors first
  const error = handleMaleficError(spite);
  if (error) {
    throw error;
  }

  // Extract response
  return extractResponse(spite);
}

/**
 * Extract output string from Response
 */
export function extractOutput(response: Response | null | undefined): string {
  if (!response) {
    return '';
  }

  return response.output || '';
}

/**
 * Extract error string from Response
 */
export function extractError(response: Response | null | undefined): string {
  if (!response) {
    return '';
  }

  return response.error || '';
}

/**
 * All-in-one helper: Extract output from TaskContext
 * Throws error if spite has error, returns output string
 */
export function getOutputFromTaskContext(taskContext: TaskContext | null | undefined): string {
  const response = extractResponseFromTaskContext(taskContext);
  return extractOutput(response);
}

/**
 * All-in-one helper: Extract data from TaskContext with error handling
 * Returns { output, error, response } or throws SpiteError
 */
export function parseTaskContext(taskContext: TaskContext | null | undefined): {
  output: string;
  error: string;
  response: Response | null;
} {
  if (!taskContext) {
    throw new SpiteError('nil task context');
  }

  const spite = taskContext.spite;
  if (!spite) {
    throw new SpiteError('nil spite in task context');
  }

  // Check for errors
  const spiteError = handleMaleficError(spite);
  if (spiteError) {
    throw spiteError;
  }

  // Extract response
  const response = extractResponse(spite);
  const output = extractOutput(response);
  const error = extractError(response);

  return { output, error, response };
}
