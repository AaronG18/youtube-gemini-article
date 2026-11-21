import { z } from "zod";
import { parseYouTubeVideoId } from "../utils/youtube";

export const transcriptSegmentSchema = z.object({
  text: z.string().min(1),
  start: z.number().nonnegative(),
  duration: z.number().positive(),
});

export const transcriptSchema = z.object({
  segments: z.array(transcriptSegmentSchema).min(1),
});

export interface Transcript extends z.infer<typeof transcriptSchema> {}

export class InvalidYouTubeUrlError extends Error {
  constructor(url: string) {
    super(`Not a YouTube video URL: ${url}`);
    this.name = "InvalidYouTubeUrlError";
  }
}

export class TranscriptUnavailableError extends Error {
  constructor(videoId: string) {
    super(
      `No subtitles for ${videoId}. Configure TRANSCRIPT_ENDPOINT, or use webshare.io proxies through a Cloudflare TCP socket when YouTube returns a captcha.`,
    );
    this.name = "TranscriptUnavailableError";
  }
}

export const DEMO_VIDEO_ID = "xRh2sVcNXQ8";

/** Hardcoded transcript keeps the demo stable when YouTube blocks subtitle requests. */
export const DEMO_TRANSCRIPT: Transcript = {
  segments: [
    { text: "Anderson: We are looking at a trillion dollar question in AI.", start: 0, duration: 4 },
    { text: "Mark: The revenue side is exploding while unit costs are collapsing.", start: 4, duration: 5 },
    { text: "Anderson: What does the business model actually look like?", start: 9, duration: 4 },
    { text: "Mark: Consumers subscribe, enterprises pay per token, and value pricing follows.", start: 13, duration: 6 },
    { text: "Anderson: Why now, and why is adoption so fast?", start: 19, duration: 4 },
    { text: "Mark: AI rides the existing internet and delivers direct productivity gains.", start: 23, duration: 5 },
    { text: "Anderson: Where does the cost curve come from?", start: 28, duration: 4 },
    { text: "Mark: Better GPUs, more data centers, and cheaper inference widen demand.", start: 32, duration: 6 },
  ],
};

export interface TranscriptOptions {
  transcriptEndpoint?: string;
}

/** Resolve subtitles from a configured endpoint, or the built-in demo transcript. */
export const getTranscript = async (
  url: string,
  options: TranscriptOptions = {},
): Promise<{ videoId: string; transcript: Transcript }> => {
  const videoId = parseYouTubeVideoId(url);
  if (!videoId) {
    throw new InvalidYouTubeUrlError(url);
  }
  if (videoId === DEMO_VIDEO_ID) {
    return { videoId, transcript: DEMO_TRANSCRIPT };
  }
  if (!options.transcriptEndpoint) {
    throw new TranscriptUnavailableError(videoId);
  }
  const target = new URL(options.transcriptEndpoint);
  target.searchParams.set("videoId", videoId);
  const response = await fetch(target.toString());
  if (!response.ok) {
    throw new TranscriptUnavailableError(videoId);
  }
  return { videoId, transcript: transcriptSchema.parse(await response.json()) };
};
