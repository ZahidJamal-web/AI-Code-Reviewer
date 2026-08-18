import {
  AlertCircle,
  Check,
  ChevronRight,
  CircleAlert,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Zap
} from "lucide-react";

function severityIcon(severity) {
  if (severity === "critical") {
    return <ShieldAlert size={16} />;
  }

  if (severity === "warning") {
    return <CircleAlert size={16} />;
  }

  return <Zap size={16} />;
}

export default function Review({
  review,
  reviewing,
  error,
  onReview
}) {
  if (reviewing) {
    return (
      <div className="review-panel">
        <ReviewHeader />

        <div className="review-loading">
          <div className="ai-orb">
            <Sparkles size={25} />
          </div>

          <h3>
            Analyzing your code
          </h3>

          <p>
            Gemini is reviewing bugs,
            security, performance and
            maintainability.
          </p>

          <div className="loading-steps">
            <div className="loading-step done">
              <Check size={13} />
              Reading source
            </div>

            <div className="loading-step active">
              <span className="pulse-dot" />
              Finding issues
            </div>

            <div className="loading-step">
              <span />
              Generating recommendations
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="review-panel">
        <ReviewHeader />

        <div className="review-error">
          <div className="error-icon">
            <AlertCircle size={23} />
          </div>

          <h3>
            Review failed
          </h3>

          <p>{error}</p>

          <button
            className="retry-button"
            onClick={onReview}
          >
            <RefreshCw size={15} />
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!review) {
    return (
      <div className="review-panel">
        <ReviewHeader />

        <div className="review-empty">
          <div className="empty-orb">
            <Sparkles size={25} />
          </div>

          <h3>
            Ready to review
          </h3>

          <p>
            Let Gemini analyze your code
            for bugs, security issues,
            performance problems and
            maintainability.
          </p>

          <div className="review-capabilities">
            <span>
              <Check size={13} />
              Bugs
            </span>

            <span>
              <Check size={13} />
              Security
            </span>

            <span>
              <Check size={13} />
              Performance
            </span>

            <span>
              <Check size={13} />
              Quality
            </span>
          </div>

          <button
            className="start-review-button"
            onClick={onReview}
          >
            <Sparkles size={16} />
            Review Code
          </button>
        </div>
      </div>
    );
  }

  const issues = review.issues || [];

  const critical = issues.filter(
    (issue) =>
      issue.severity === "critical"
  ).length;

  const warnings = issues.filter(
    (issue) =>
      issue.severity === "warning"
  ).length;

  const suggestions = issues.filter(
    (issue) =>
      issue.severity === "suggestion"
  ).length;

  return (
    <div className="review-panel">
      <ReviewHeader />

      <div className="review-scroll">
        <div className="score-section">
          <div
            className={`score-ring score-${Math.round(
              review.score / 10
            )}`}
          >
            <span>
              {review.score}
            </span>

            <small>/100</small>
          </div>

          <div className="score-content">
            <span className="score-label">
              Code Quality
            </span>

            <h2>
              {getScoreLabel(review.score)}
            </h2>

            <p>
              {review.summary}
            </p>
          </div>
        </div>

        <div className="issue-stats">
          <div className="issue-stat critical">
            <strong>{critical}</strong>
            <span>Critical</span>
          </div>

          <div className="issue-stat warning">
            <strong>{warnings}</strong>
            <span>Warnings</span>
          </div>

          <div className="issue-stat suggestion">
            <strong>{suggestions}</strong>
            <span>Suggestions</span>
          </div>
        </div>

        {review.positives?.length > 0 && (
          <section className="review-section">
            <div className="section-title">
              <Check size={16} />
              Good practices
            </div>

            <div className="positive-list">
              {review.positives.map(
                (positive, index) => (
                  <div
                    className="positive-item"
                    key={index}
                  >
                    <Check size={14} />
                    <span>{positive}</span>
                  </div>
                )
              )}
            </div>
          </section>
        )}

        <section className="review-section">
          <div className="section-title">
            <AlertCircle size={16} />
            Findings
          </div>

          {issues.length === 0 ? (
            <div className="no-issues">
              <Check size={18} />

              <div>
                <strong>
                  No major issues found
                </strong>

                <span>
                  Gemini didn't identify
                  significant problems.
                </span>
              </div>
            </div>
          ) : (
            <div className="issues-list">
              {issues.map(
                (issue, index) => (
                  <div
                    className={`issue-card ${issue.severity}`}
                    key={index}
                  >
                    <div className="issue-card-header">
                      <div className="issue-severity">
                        {severityIcon(
                          issue.severity
                        )}

                        <span>
                          {issue.severity}
                        </span>
                      </div>

                      {issue.line > 0 && (
                        <span className="issue-line">
                          Line {issue.line}
                        </span>
                      )}
                    </div>

                    <h4>
                      {issue.title}
                    </h4>

                    <p>
                      {issue.description}
                    </p>

                    {issue.suggestion && (
                      <div className="suggestion-box">
                        <strong>
                          Recommendation
                        </strong>

                        <span>
                          {issue.suggestion}
                        </span>
                      </div>
                    )}

                    <button className="issue-action">
                      Explain
                      <ChevronRight size={14} />
                    </button>
                  </div>
                )
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function ReviewHeader() {
  return (
    <div className="review-header">
      <div>
        <div className="review-title">
          <Sparkles size={16} />
          AI Code Review
        </div>

        <span>
          Powered by Gemini
        </span>
      </div>

      <div className="gemini-status">
        <span />
        Ready
      </div>
    </div>
  );
}

function getScoreLabel(score) {
  if (score >= 90) return "Excellent";
  if (score >= 80) return "Good";
  if (score >= 70) return "Fair";
  if (score >= 60) return "Needs work";

  return "Poor";
}