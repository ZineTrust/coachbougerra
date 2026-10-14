import type { ReactNode } from "react";

/*
  Tag handlers for translated headlines: in the messages, <em>word</em> is
  turned into the coloured accent word. Pick the one that fits the background.
*/
export const emLight = {
  em: (chunks: ReactNode) => <em className="text-jade-600">{chunks}</em>,
};

export const emDark = {
  em: (chunks: ReactNode) => <em className="text-jade-300">{chunks}</em>,
};
