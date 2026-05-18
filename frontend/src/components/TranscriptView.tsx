import { useAppStore } from "../store/appStore";

export const TranscriptView = () => {
  const { transcript } = useAppStore();

  const getSpeakerIcon = (speaker: string) => {
    if (speaker === "physician") {
      return (
        <svg className="w-8 h-8 text-deep-green" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
        </svg>
      );
    } else if (speaker === "patient") {
      return (
        <svg className="w-8 h-8 text-action-blue" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
        </svg>
      );
    }
    return null;
  };

  const getSpeakerLabel = (speaker: string) => {
    if (speaker === "physician") return "Physician";
    if (speaker === "patient") return "Patient";
    return "Unknown";
  };

  return (
    <div className="bg-canvas rounded-lg border border-hairline p-6 h-[calc(100vh-200px)] lg:h-[calc(100vh-200px)] flex flex-col shadow-sm">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-hairline">
        <h2 className="text-feature-heading font-normal text-ink flex items-center">
          <span className="inline-block w-2 h-2 rounded-full bg-coral mr-3 animate-pulse"></span>
          Live Transcript
        </h2>
        <span className="text-caption text-muted bg-soft-stone px-3 py-1 rounded-sm">
          {transcript.length}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pr-2 scrollbar-thin">
        {transcript.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted">
            <div className="text-center animate-fade-in">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-soft-stone rounded-lg mb-4">
                <svg
                  className="w-8 h-8 text-ink opacity-40 animate-pulse"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                  />
                </svg>
              </div>
              <p className="text-body font-medium text-ink mb-1">Waiting for audio</p>
              <p className="text-caption text-muted">Conversation will appear here</p>
            </div>
          </div>
        ) : (
          transcript.map((segment, index) => (
            <div 
              key={index} 
              className="flex items-start space-x-4 p-4 rounded-lg hover:bg-soft-stone transition-all duration-200 animate-slide-in"
              style={{ animationDelay: `${Math.min(index * 50, 500)}ms` }}
            >
              <div className="flex-shrink-0 mt-1">
                {getSpeakerIcon(segment.speaker)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline space-x-2 mb-2">
                  <span
                    className={`text-caption font-medium uppercase tracking-wide ${
                      segment.speaker === "physician"
                        ? "text-deep-green"
                        : "text-action-blue"
                    }`}
                  >
                    {getSpeakerLabel(segment.speaker)}
                  </span>
                  {segment.confidence && (
                    <span className="text-micro text-muted bg-canvas px-2 py-0.5 rounded-xs">
                      {Math.round(segment.confidence * 100)}%
                    </span>
                  )}
                </div>
                <p className="text-body text-ink leading-relaxed">{segment.text}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
