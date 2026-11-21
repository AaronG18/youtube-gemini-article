const VIDEO_ID_PATTERNS: readonly RegExp[] = [
  /^https?:\/\/(?:www\.)?youtube\.com\/watch\?(?:[^#]*&)?v=([\w-]{11})(?:[&#]|$)/,
  /^https?:\/\/(?:www\.)?youtu\.be\/([\w-]{11})(?:\?|#|$)/,
  /^https?:\/\/(?:www\.)?youtube\.com\/embed\/([\w-]{11})(?:\?|#|$)/,
  /^https?:\/\/(?:www\.)?youtube\.com\/shorts\/([\w-]{11})(?:\?|#|$)/,
];

/** Extract an 11-character YouTube video id from common URL shapes. */
export const parseYouTubeVideoId = (input: string): string | null => {
  const url = input.trim();
  for (const pattern of VIDEO_ID_PATTERNS) {
    const match = pattern.exec(url);
    if (match) {
      return match[1];
    }
  }
  return null;
};
