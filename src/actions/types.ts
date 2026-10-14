/** What every form action returns to `useActionState`. */
export type FormState = {
  ok?: boolean;
  /** field name -> error code (translated in the interface); "form" = whole form */
  errors?: Record<string, string>;
  /** what the visitor typed, so a failed submit doesn't wipe the form (never passwords) */
  values?: Record<string, string>;
  /** extra results to display (a generated password, how many people were notified…) */
  info?: Record<string, string | number>;
};

export const initialState: FormState = {};
