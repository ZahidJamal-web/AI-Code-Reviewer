import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  Copy,
  FileCode2,
  Lightbulb,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Wrench,
  Zap
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL;

const response = await fetch(`${API_URL}/api/review`, {
    method: "POST",
    headers: {
        "Content-Type": "application/json"
    },
    body: JSON.stringify({
        code,
        language
    })
});

export default function Review({
  review,
  reviewing,
  error,
  onReview
}) {

  if (reviewing) {
    return (
      <div className="review-panel">

        <div className="review-header">

          <div>
            <div className="review-title">
              <Sparkles size={16} />
              AI Code Review
            </div>

            <span>
              Static analysis + local AI
            </span>
          </div>

          <div className="gemini-status">
            <span />
            ANALYZING
          </div>

        </div>


        <div className="review-loading">

          <div className="ai-orb">
            <Sparkles size={24} />
          </div>

          <h3>
            Reviewing your code
          </h3>

          <p>
            PixelCode is checking the code for
            practical engineering improvements.
          </p>


          <div className="loading-steps">

            <div className="loading-step done">
              <CheckCircle2 size={14} />
              Static analysis
            </div>

            <div className="loading-step active">
              <span className="pulse-dot" />
              AI engineering review
            </div>

            <div className="loading-step">
              <span />
              Generate improved version
            </div>

          </div>

        </div>

      </div>
    );
  }


  if (error) {

    return (
      <div className="review-panel">

        <div className="review-header">

          <div>
            <div className="review-title">
              <Sparkles size={16} />
              AI Code Review
            </div>

            <span>
              Review engine
            </span>
          </div>

          <div className="gemini-status error-status">
            ERROR
          </div>

        </div>


        <div className="review-error">

          <div className="error-icon">
            <AlertCircle size={25} />
          </div>

          <h3>
            Review failed
          </h3>

          <p>
            {error}
          </p>

          <button
            className="retry-button"
            onClick={onReview}
          >
            <RefreshCw size={13} />
            Try Again
          </button>

        </div>

      </div>
    );
  }


  if (!review) {

    return (
      <div className="review-panel">

        <div className="review-header">

          <div>
            <div className="review-title">
              <Sparkles size={16} />
              AI Code Review
            </div>

            <span>
              Engineering-focused analysis
            </span>
          </div>

          <div className="gemini-status">
            <span />
            READY
          </div>

        </div>


        <div className="review-empty">

          <div className="empty-orb">
            <FileCode2 size={25} />
          </div>

          <h3>
            Ready to review
          </h3>

          <p>
            PixelCode analyzes your code and
            produces practical improvements plus
            a cleaner version of the implementation.
          </p>


          <div className="review-capabilities">

            <span>
              <ShieldCheck size={11} />
              Readability
            </span>

            <span>
              <Wrench size={11} />
              Maintainability
            </span>

            <span>
              <Zap size={11} />
              Performance
            </span>

            <span>
              <FileCode2 size={11} />
              Scalability
            </span>

            <span>
              <CheckCircle2 size={11} />
              Testability
            </span>

          </div>


          <button
            className="start-review-button"
            onClick={onReview}
          >
            <Sparkles size={13} />
            Review Code
          </button>

        </div>

      </div>
    );
  }


  const findings =
    Array.isArray(review.findings)
      ? review.findings
      : [];


  const improvements =
    Array.isArray(review.improvements)
      ? review.improvements
      : [];


  const explanations =
    Array.isArray(review.betterCodeExplanation)
      ? review.betterCodeExplanation
      : [];


  const copyBetterCode = async () => {

    if (!review.betterCode) return;

    try {

      await navigator.clipboard.writeText(
        review.betterCode
      );

    } catch (error) {

      console.error(
        "Unable to copy code:",
        error
      );

    }

  };


  return (
    <div className="review-panel">

      {/* HEADER */}

      <div className="review-header">

        <div>

          <div className="review-title">
            <Sparkles size={16} />
            AI Code Review
          </div>

          <span>
            Static analysis + local AI
          </span>

        </div>


        <div className="gemini-status">
          <span />
          COMPLETE
        </div>

      </div>


      <div className="review-scroll">

        {/* SUMMARY */}

        <section className="review-summary">

          <div className="review-summary-label">
            <Sparkles size={12} />
            Review Summary
          </div>

          <h3>
            {review.summary}
          </h3>

          <p>
            {review.overallAssessment}
          </p>

        </section>


        {/* FINDINGS OVERVIEW */}

        <section className="review-section">

          <div className="section-title">
            <AlertCircle size={12} />
            Findings Overview
          </div>


          <div className="review-metrics">

            <div className="review-metric">

              <div className="review-metric-label">
                Critical
              </div>

              <div className="review-metric-value red">
                {review.metrics?.critical || 0}
              </div>

            </div>


            <div className="review-metric">

              <div className="review-metric-label">
                Warnings
              </div>

              <div className="review-metric-value yellow">
                {review.metrics?.warnings || 0}
              </div>

            </div>


            <div className="review-metric">

              <div className="review-metric-label">
                Suggestions
              </div>

              <div className="review-metric-value blue">
                {review.metrics?.suggestions || 0}
              </div>

            </div>

          </div>

        </section>


        {/* ENGINE STATUS */}

        <div className="review-meta">

          <div className="review-meta-item">
            <FileCode2 size={12} />
            Static: {review.analysis?.static || 0}
          </div>

          <div className="review-meta-item">
            <Sparkles size={12} />
            AI: {review.analysis?.ai || 0}
          </div>

          <div className="review-meta-item">
            <Clock3 size={12} />
            {review.performance?.duration || 0}ms
          </div>

        </div>


        {/* FINDINGS */}

        <section className="review-section">

          <div className="section-title">
            <AlertCircle size={12} />
            Findings
          </div>


          {findings.length === 0 ? (

            <div className="no-issues">

              <CheckCircle2 size={16} />

              <div>

                <strong>
                  No actionable issues found
                </strong>

                <span>
                  PixelCode did not detect meaningful
                  problems in the submitted code.
                </span>

              </div>

            </div>

          ) : (

            <div className="issues-list">

              {findings.map((finding, index) => (

                <div
                  className={`issue-card ${
                    finding.severity || "suggestion"
                  }`}
                  key={finding.id || index}
                >

                  <div className="issue-card-header">

                    <div className="issue-severity">

                      {finding.severity === "critical" && (
                        <AlertCircle size={12} />
                      )}

                      {finding.severity === "warning" && (
                        <AlertCircle size={12} />
                      )}

                      {finding.severity === "suggestion" && (
                        <Lightbulb size={12} />
                      )}

                      {finding.severity}
                    </div>


                    {finding.line && (
                      <span className="issue-line">
                        Line {finding.line}
                      </span>
                    )}

                  </div>


                  <h4>
                    {finding.title}
                  </h4>


                  <p>
                    {finding.description}
                  </p>


                  {finding.recommendation && (

                    <div className="suggestion-box">

                      <strong>
                        Recommended approach
                      </strong>

                      <span>
                        {finding.recommendation}
                      </span>

                    </div>

                  )}


                  <span className="issue-category">
                    {finding.category}
                  </span>

                </div>

              ))}

            </div>

          )}

        </section>


        {/* ENGINEERING IMPROVEMENTS */}

        {improvements.length > 0 && (

          <section className="review-section">

            <div className="section-title">
              <Wrench size={12} />
              Engineering Improvement Plan
            </div>


            <div className="improvement-list">

              {improvements.map(
                (item, index) => (

                  <div
                    className="improvement-card"
                    key={index}
                  >

                    <div className="improvement-icon">
                      <CheckCircle2 size={13} />
                    </div>

                    <div>

                      <strong>
                        {item.area}
                      </strong>

                      <p>
                        {item.recommendation}
                      </p>

                    </div>

                  </div>

                )
              )}

            </div>

          </section>

        )}


        {/* BETTER CODE */}

        {review.betterCode && (

          <section className="review-section better-code-section">

            <div className="section-title">

              <FileCode2 size={12} />

              Recommended Implementation

              <button
                className="copy-code-button"
                onClick={copyBetterCode}
                title="Copy improved code"
              >
                <Copy size={12} />
                Copy
              </button>

            </div>


            <div className="better-code">

              <pre>
                <code>
                  {review.betterCode}
                </code>
              </pre>

            </div>

          </section>

        )}


        {/* WHY BETTER */}

        {explanations.length > 0 && (

          <section className="review-section">

            <div className="section-title">
              <Lightbulb size={12} />
              Why This Version Is Better
            </div>


            <div className="better-reasons">

              {explanations.map(
                (explanation, index) => (

                  <div
                    className="better-reason"
                    key={index}
                  >

                    <CheckCircle2 size={13} />

                    <span>
                      {explanation}
                    </span>

                  </div>

                )
              )}

            </div>

          </section>

        )}


        {/* REVIEW ACTION */}

        <div className="review-actions">

          <button
            className="review-action-button primary"
            onClick={onReview}
          >
            <RefreshCw size={12} />
            Re-run Review
          </button>

        </div>

      </div>

    </div>
  );
}