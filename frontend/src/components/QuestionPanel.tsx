import { useAppStore } from "../store/appStore";

interface QuestionPanelProps {
  onRefresh: () => void;
  onMarkAsked: (questionId: string) => void;
}

export const QuestionPanel = ({
  onRefresh,
  onMarkAsked,
}: QuestionPanelProps) => {
  const { suggestedQuestions, isLoadingQuestions, markQuestionAsAsked } =
    useAppStore();

  const getPriorityColor = (priority: number) => {
    if (priority >= 8) return "bg-error text-white";
    if (priority >= 5) return "bg-warning text-white";
    return "bg-gray-200 text-textPrimary";
  };

  const getPriorityLabel = (priority: number) => {
    if (priority >= 8) return "High";
    if (priority >= 5) return "Medium";
    return "Low";
  };

  return (
    <div className="bg-canvas rounded-lg border border-hairline p-5 h-full min-h-0 flex flex-col shadow-sm">
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-hairline">
        <h2 className="text-body-large font-medium text-ink flex items-center">
          <svg
            className="w-5 h-5 mr-3 text-coral"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          Questions
          <span className="ml-2 inline-flex items-center justify-center rounded-xs bg-coral/10 text-coral text-micro font-medium px-2 py-1">
            {suggestedQuestions.length}
          </span>
        </h2>
        <button
          onClick={onRefresh}
          disabled={isLoadingQuestions}
          className="text-action-blue hover:text-focus-blue transition-all disabled:opacity-50 p-2 rounded-sm hover:bg-pale-blue"
          title="Refresh questions"
        >
          <svg
            className={`w-5 h-5 transition-transform ${isLoadingQuestions ? "animate-spin" : "hover:rotate-180"}`}
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

      <div className="space-y-3 overflow-y-auto flex-1 scrollbar-thin">
        {isLoadingQuestions ? (
          <div className="text-center py-12 text-muted animate-pulse">
            <svg
              className="animate-spin h-10 w-10 mx-auto mb-3 text-coral"
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
            <p className="text-body text-ink">Generating questions</p>
          </div>
        ) : suggestedQuestions.length === 0 ? (
          <div className="text-center py-12 text-muted">
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
                  d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <p className="text-body font-medium text-ink mb-1">No questions yet</p>
            <p className="text-caption text-muted">
              Refresh once conversation starts
            </p>
          </div>
        ) : (
          suggestedQuestions.map((question, index) => (
            <div
              key={question.id}
              className="border border-hairline rounded-sm p-4 hover:border-action-blue hover:shadow-sm transition-all duration-200 bg-canvas group animate-slide-in"
              style={{ animationDelay: `${Math.min(index * 100, 500)}ms` }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <span
                      className={`px-2 py-1 rounded-xs text-micro font-medium ${getPriorityColor(
                        question.priority
                      )}`}
                    >
                      {getPriorityLabel(question.priority)}
                    </span>
                    <span className="text-micro text-muted uppercase tracking-wide">
                      {question.category}
                    </span>
                  </div>
                  <p className="text-body text-ink font-medium leading-snug mb-2">
                    {question.question}
                  </p>
                  <p className="text-caption text-body-muted">
                    {question.rationale}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  markQuestionAsAsked(question.id);
                  onMarkAsked(question.id);
                }}
                disabled={question.is_asked}
                className={`mt-3 w-full px-4 py-2 text-button font-medium rounded-sm transition-all ${
                  question.is_asked
                    ? "bg-soft-stone text-muted cursor-not-allowed"
                    : "bg-action-blue/10 text-action-blue hover:bg-action-blue hover:text-on-primary"
                }`}
              >
                {question.is_asked ? "✓ Asked" : "Mark as Asked"}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
