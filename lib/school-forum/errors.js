/** A user-facing forum error; `status` becomes the API response code. */
export class ForumError extends Error {
  /**
   * @param {string} message
   * @param {number} [status]
   */
  constructor(message, status = 400) {
    super(message);
    this.name = "ForumError";
    this.status = status;
  }
}

export const forbidden = (message = "You don't have access to do that.") =>
  new ForumError(message, 403);

export const notFound = (message = "That concern could not be found.") =>
  new ForumError(message, 404);
