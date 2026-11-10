/* Shared bits of the assistant (no server code: also used by the browser). */

/** The longest question a member can send (Arabic and French alike). */
export const QUESTION_MAX = 600;

/** Limits of the notes the owner writes for the assistant. */
export const NOTE_TITLE_MAX = 120;
export const NOTE_KEYWORDS_MAX = 400;
export const NOTE_BODY_MAX = 4000;

/** Added at the end of a streamed answer that broke off, so the page can say so. */
export const STREAM_ERROR_MARK = "\n\n[[ERREUR]]";

/** Daily questions per member unless ASSISTANT_DAILY_LIMIT says otherwise (the free AI plan is small). */
export const DEFAULT_DAILY_LIMIT = 5;
