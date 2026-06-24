"use client";

import { useRef } from "react";

type AdminAudioPreviewProps = {
  src: string;
  controlsList?: string;
  style?: React.CSSProperties;
};

export default function AdminAudioPreview({
  src,
  controlsList,
  style
}: AdminAudioPreviewProps) {
  const audioRef = useRef<HTMLAudioElement>(null);

  const repeatLastTenSeconds = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.max(0, audio.currentTime - 10);
    void audio.play();
  };

  return (
    <div>
      <audio
        ref={audioRef}
        controls
        controlsList={controlsList}
        preload="metadata"
        src={src}
        style={style}
      >
        Your browser does not support audio.
      </audio>
      <button
        type="button"
        className="button button-secondary"
        style={{ marginTop: 8 }}
        onClick={repeatLastTenSeconds}
      >
        Repeat last 10 seconds
      </button>
    </div>
  );
}
