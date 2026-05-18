import { useAppStore } from "../store/appStore";

interface ContextPanelProps {
  onRefresh: () => void;
}

export const ContextPanel = ({ onRefresh }: ContextPanelProps) => {
  const { clinicalContext, isLoadingContext } = useAppStore();

  return (
    <div className="bg-canvas rounded-lg border border-hairline p-5 h-full min-h-0 flex flex-col shadow-sm">
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-hairline">
        <h2 className="text-body-large font-medium text-ink flex items-center">
          <svg
            className="w-5 h-5 mr-3 text-deep-green"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          Clinical Context
        </h2>
        <button
          onClick={onRefresh}
          disabled={isLoadingContext}
          className="text-action-blue hover:text-focus-blue transition-all disabled:opacity-50 p-2 rounded-sm hover:bg-pale-blue"
          title="Refresh context"
        >
          <svg
            className={`w-5 h-5 transition-transform ${isLoadingContext ? "animate-spin" : "hover:rotate-180"}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </button>
      </div>

      {isLoadingContext ? (
        <div className="text-center py-12 text-muted flex-1 overflow-y-auto animate-pulse">
          <svg
            className="animate-spin h-10 w-10 mx-auto mb-3 text-deep-green"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-20"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="3"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          <p className="text-body text-ink">Extracting context</p>
        </div>
      ) : !clinicalContext ? (
        <div className="text-center py-12 text-muted flex-1 overflow-y-auto">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-soft-stone rounded-lg mb-4">
            <svg
              className="w-8 h-8 text-ink opacity-40"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <p className="text-body font-medium text-ink mb-1">No context yet</p>
          <p className="text-caption text-muted">
            Refresh to extract clinical information
          </p>
        </div>
      ) : (
        <div className="space-y-4 flex-1 overflow-y-auto scrollbar-thin">
          {clinicalContext.chief_complaint && (
            <div className="p-3 bg-pale-blue rounded-sm border-l-2 border-action-blue animate-slide-in">
              <h3 className="text-caption font-medium text-action-blue mb-2 uppercase tracking-wide">
                Chief Complaint
              </h3>
              <p className="text-body text-ink leading-relaxed">
                {clinicalContext.chief_complaint}
              </p>
            </div>
          )}

          {clinicalContext.symptoms.length > 0 && (
            <div className="p-3 bg-soft-stone rounded-sm animate-slide-in" style={{ animationDelay: '100ms' }}>
              <h3 className="text-caption font-medium text-deep-green mb-2 uppercase tracking-wide">
                Symptoms
              </h3>
              <ul className="space-y-2">
                {clinicalContext.symptoms.map((symptom, index) => (
                  <li key={index} className="flex items-start text-body text-ink">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-deep-green mr-2 mt-2 flex-shrink-0"></span>
                    {symptom}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {clinicalContext.duration && (
            <div className="p-3 bg-canvas rounded-sm border border-hairline animate-slide-in" style={{ animationDelay: '200ms' }}>
              <h3 className="text-caption font-medium text-ink mb-2 uppercase tracking-wide">
                Duration
              </h3>
              <p className="text-body text-ink leading-relaxed">{clinicalContext.duration}</p>
            </div>
          )}

          {clinicalContext.location && (
            <div className="p-3 bg-canvas rounded-sm border border-hairline animate-slide-in" style={{ animationDelay: '300ms' }}>
              <h3 className="text-caption font-medium text-ink mb-2 uppercase tracking-wide">
                Location
              </h3>
              <p className="text-body text-ink leading-relaxed">{clinicalContext.location}</p>
            </div>
          )}

          {clinicalContext.associated_symptoms.length > 0 && (
            <div className="p-3 bg-soft-stone rounded-sm animate-slide-in" style={{ animationDelay: '400ms' }}>
              <h3 className="text-caption font-medium text-deep-green mb-2 uppercase tracking-wide">
                Associated Symptoms
              </h3>
              <ul className="space-y-2">
                {clinicalContext.associated_symptoms.map((symptom, index) => (
                  <li key={index} className="flex items-start text-body text-ink">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-deep-green mr-2 mt-2 flex-shrink-0"></span>
                    {symptom}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {clinicalContext.medications.length > 0 && (
            <div className="p-3 bg-pale-blue rounded-sm border-l-2 border-action-blue animate-slide-in" style={{ animationDelay: '500ms' }}>
              <h3 className="text-caption font-medium text-action-blue mb-2 uppercase tracking-wide">
                Medications
              </h3>
              <ul className="space-y-2">
                {clinicalContext.medications.map((med, index) => (
                  <li key={index} className="flex items-start text-body text-ink">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-action-blue mr-2 mt-2 flex-shrink-0"></span>
                    {med}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {clinicalContext.allergies.length > 0 && (
            <div className="p-3 bg-error/5 rounded-sm border-l-2 border-error animate-slide-in" style={{ animationDelay: '600ms' }}>
              <h3 className="text-caption font-medium text-error mb-2 uppercase tracking-wide flex items-center">
                <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                Allergies
              </h3>
              <ul className="space-y-2">
                {clinicalContext.allergies.map((allergy, index) => (
                  <li key={index} className="flex items-start text-body text-ink font-medium">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-error mr-2 mt-2 flex-shrink-0"></span>
                    {allergy}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
