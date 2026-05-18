import { useAppStore } from '../store/appStore';

export const SummaryModal = () => {
  const { summary, isLoadingSummary, setShowSummaryModal } = useAppStore();

  const handleClose = () => {
    setShowSummaryModal(false);
  };

  return (
    <div className="fixed inset-0 bg-cohere-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-canvas rounded-lg shadow-2xl max-w-3xl w-full max-h-[85vh] overflow-hidden animate-scale-in border border-hairline">
        {/* Header */}
        <div className="bg-deep-green text-on-dark px-6 py-5 flex items-center justify-between border-b border-on-dark/20">
          <h2 className="text-card-heading font-normal flex items-center">
            <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Conversation Summary
          </h2>
          <button
            onClick={handleClose}
            className="text-on-dark/80 hover:text-on-dark transition-colors p-2 rounded-sm hover:bg-on-dark/10"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(85vh-140px)] scrollbar-thin">
          {isLoadingSummary ? (
            <div className="text-center py-16 text-muted animate-pulse">
              <svg className="animate-spin h-12 w-12 mx-auto mb-4 text-deep-green" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="text-body-large text-ink">Generating summary</p>
            </div>
          ) : !summary ? (
            <div className="text-center py-16 text-muted">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-soft-stone rounded-lg mb-4">
                <svg className="w-8 h-8 text-ink opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-body text-ink">No summary available</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Chief Complaint */}
              <div className="p-4 bg-pale-blue rounded-lg border-l-4 border-action-blue animate-slide-in">
                <h3 className="text-body-large font-medium text-action-blue mb-3 uppercase tracking-wide flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  Chief Complaint
                </h3>
                <p className="text-body text-ink leading-relaxed">{summary.chief_complaint}</p>
              </div>

              {/* Key Findings */}
              {summary.key_findings.length > 0 && (
                <div className="animate-slide-in" style={{ animationDelay: '100ms' }}>
                  <h3 className="text-body-large font-medium text-deep-green mb-3 uppercase tracking-wide flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Key Findings
                  </h3>
                  <div className="bg-soft-stone rounded-sm p-4">
                    <ul className="space-y-3">
                      {summary.key_findings.map((finding, index) => (
                        <li key={index} className="flex items-start">
                          <span className="inline-block w-2 h-2 bg-deep-green rounded-full mt-2 mr-3 flex-shrink-0"></span>
                          <span className="text-body text-ink leading-relaxed">{finding}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Discussed Topics */}
              {summary.discussed_topics.length > 0 && (
                <div className="animate-slide-in" style={{ animationDelay: '200ms' }}>
                  <h3 className="text-body-large font-medium text-ink mb-3 uppercase tracking-wide">Discussed Topics</h3>
                  <div className="flex flex-wrap gap-2">
                    {summary.discussed_topics.map((topic, index) => (
                      <span
                        key={index}
                        className="px-3 py-1.5 bg-pale-green text-deep-green rounded-xs text-caption font-medium border border-deep-green/20"
                      >
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Pending Topics */}
              {summary.pending_topics.length > 0 && (
                <div className="animate-slide-in" style={{ animationDelay: '300ms' }}>
                  <h3 className="text-body-large font-medium text-coral mb-3 uppercase tracking-wide flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                    </svg>
                    Pending Topics
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {summary.pending_topics.map((topic, index) => (
                      <span
                        key={index}
                        className="px-3 py-1.5 bg-coral/10 text-coral rounded-xs text-caption font-medium border border-coral/30"
                      >
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Session Stats */}
              <div className="border-t border-gray-200 pt-4 mt-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-textSecondary">Duration:</span>
                    <span className="ml-2 font-semibold text-textPrimary">
                      {Math.round(summary.duration_minutes)} minutes
                    </span>
                  </div>
                  <div>
                    <span className="text-textSecondary">Word Count:</span>
                    <span className="ml-2 font-semibold text-textPrimary">
                      {summary.word_count} words
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 flex justify-end">
          <button
            onClick={handleClose}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
