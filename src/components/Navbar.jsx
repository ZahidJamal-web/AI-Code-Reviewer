
import {
  Bot,
  Moon,
  Play,
  Sparkles,
  Sun,
  PanelLeftClose,
  PanelLeftOpen
} from "lucide-react";

export default function Navbar({
  theme,
  onThemeChange,
  onReview,
  onRun,
  reviewing,
  running,
  activeFile,
  onToggleSidebar,
  sidebarOpen
}) {
  return (
    <header className="navbar">

      {/* BRAND */}
      <div className="brand">
        <div className="brand-icon">
          <Bot size={19} />
        </div>

        <div>
          <div className="brand-name">
            PixelCode
          </div>

          <div className="brand-subtitle">
            AI Code Reviewer
          </div>
        </div>
      </div>

      {/* EXPLORER TOGGLE */}
      <button
        type="button"
        className="theme-button sidebar-toggle"
        onClick={onToggleSidebar}
        title={sidebarOpen ? "Hide Explorer" : "Show Explorer"}
        aria-label={sidebarOpen ? "Hide Explorer" : "Show Explorer"}
      >
        {sidebarOpen ? (
          <PanelLeftClose size={17} />
        ) : (
          <PanelLeftOpen size={17} />
        )}
      </button>

      <div className="nav-spacer" />

      {/* CURRENT FILE */}
      <div className="current-file">
        <span className="python-dot" />
        {activeFile?.name || "main.py"}
      </div>

      {/* RUN */}
      <button
        type="button"
        className={`nav-button ${running ? "loading" : ""}`}
        onClick={onRun}
        disabled={running}
      >
        <Play size={15} />
        <span>{running ? "Running..." : "Run"}</span>
      </button>

      {/* AI REVIEW */}
      <button
        type="button"
        className={`review-button ${reviewing ? "loading" : ""}`}
        onClick={onReview}
        disabled={reviewing}
      >
        <Sparkles size={16} />
        {reviewing ? "Reviewing..." : "Review Code"}
      </button>

      {/* THEME */}
      <button
        type="button"
        className="theme-button"
        onClick={() =>
          onThemeChange(theme === "dark" ? "light" : "dark")
        }
        aria-label="Toggle theme"
        title="Toggle theme"
      >
        {theme === "dark" ? (
          <Sun size={18} />
        ) : (
          <Moon size={18} />
        )}
      </button>

    </header>
  );
}
