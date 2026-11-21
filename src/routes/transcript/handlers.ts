import {
  getTranscript,
  InvalidYouTubeUrlError,
  TranscriptUnavailableError,
} from "../../services/transcript";
import type { AppContext } from "../../types";

/** Resolve subtitles for a YouTube URL and return their segments. */
export const handleTranscript = async (c: AppContext, url: string) => {
  try {
    const { videoId, transcript } = await getTranscript(url, {
      transcriptEndpoint: c.env?.TRANSCRIPT_ENDPOINT,
    });
    return c.json({ videoId, segments: transcript.segments });
  } catch (error) {
    if (error instanceof InvalidYouTubeUrlError) {
      return c.json({ error: error.message }, 400);
    }
    if (error instanceof TranscriptUnavailableError) {
      return c.json({ error: error.message }, 502);
    }
    throw error;
  }
};
