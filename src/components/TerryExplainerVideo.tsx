"use client";

import { useRef, useState } from "react";
import {
  TERRY_LONG_VIDEO_SRC,
  WHY_IT_WORKS_VIDEO_SRC,
  logTerryLongVideoStarted,
  logWhyItWorksVideoStarted
} from "@/lib/video-play-log";

type TerryExplainerVideoProps = {
  /** Start the short video as soon as it is shown (modal). The homepage waits for a tap. */
  autoPlay?: boolean;
};

/**
 * Short Terry video, with Learn more while it is playing. Learn more switches to the long film.
 */
export default function TerryExplainerVideo({ autoPlay = false }: TerryExplainerVideoProps) {
  const [clip, setClip] = useState<"short" | "long">("short");
  const [showLearnMore, setShowLearnMore] = useState(false);
  const loggedRef = useRef<"short" | "long" | null>(null);
  const src = clip === "short" ? WHY_IT_WORKS_VIDEO_SRC : TERRY_LONG_VIDEO_SRC;

  const onStarted = () => {
    if (clip === "short") setShowLearnMore(true);
    if (loggedRef.current === clip) return;
    loggedRef.current = clip;
    if (clip === "short") logWhyItWorksVideoStarted();
    else logTerryLongVideoStarted();
  };

  return (
    <div>
      <video
        key={src}
        controls
        playsInline
        autoPlay={autoPlay || clip === "long"}
        preload="metadata"
        onPlay={onStarted}
        onPlaying={onStarted}
        style={{
          width: "100%",
          maxHeight: "70vh",
          borderRadius: 8,
          display: "block",
          background: "#0f172a"
        }}
      >
        <source src={src} type="video/mp4" />
        Your browser does not support the video tag.
      </video>
      {showLearnMore && clip === "short" && (
        <button
          type="button"
          className="button"
          style={{ marginTop: 12 }}
          onClick={() => setClip("long")}
        >
          Learn more
        </button>
      )}
    </div>
  );
}
