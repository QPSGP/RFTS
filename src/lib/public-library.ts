type WithAudio = {
  audioUrl?: string;
  allowedUserEmails?: string[];
};

/** Browser payload: playback goes through /api/stream/audio, not the file URL. */
export function libraryItemForBrowser<T extends WithAudio>(item: T): T {
  const hasAudio = Boolean(item.audioUrl?.trim());
  return {
    ...item,
    audioUrl: hasAudio ? "ready" : "",
    allowedUserEmails: []
  };
}
