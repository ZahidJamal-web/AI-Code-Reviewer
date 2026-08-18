import EditorCore from "@monaco-editor/react";

import { Code2, FileCode2 } from "lucide-react";

const monacoLanguages = {
  python: "python",
  javascript: "javascript",
  typescript: "typescript",
  java: "java",
  c: "c",
  cpp: "cpp",
  csharp: "csharp",
  go: "go",
  rust: "rust",
  php: "php",
  ruby: "ruby",
  kotlin: "kotlin",
  swift: "swift",
  dart: "dart",
  scala: "scala",
  r: "r",
  perl: "perl",
  lua: "lua",
  bash: "shell",
  sql: "sql",
  html: "html",
  css: "css"
};

export default function Editor({
  file,
  files,
  onSelectFile,
  onChange,
  theme,
  execution,
  running
}) {

  /*
  |--------------------------------------------------------------------------
  | Get Monaco language
  |--------------------------------------------------------------------------
  */
  const editorLanguage =
    monacoLanguages[file?.language] ||
    "plaintext";

  return (
    <div className="editor-container">

      {/* =========================================================
          FILE TABS
      ========================================================= */}
      <div className="editor-tabs">
        {files.map((item) => (
          <button
            key={item.id}
            className={`editor-tab ${
              item.id === file.id
                ? "active"
                : ""
            }`}

            onClick={() =>
              onSelectFile(item.id)
            }
          >
            <FileCode2 size={14} />
            <span>
              {item.name}
            </span>
            {item.id === file.id && (
              <span className="tab-dot" />
            )}
          </button>
        ))}
        <div className="editor-tabs-spacer" />
        {/* Current language */}
        <div className="editor-language">
          <Code2 size={14} />
          <span>
            {file?.language || "Plain Text"}
          </span>
        </div>
      </div>

      {/* =========================================================
          EDITOR TOOLBAR
      ========================================================= */}
      <div className="editor-toolbar">
        <div className="breadcrumb">
          <span>
            PIXELCODE
          </span>
          <span>
            /
          </span>
          <strong>
            {file.name}
          </strong>
        </div>
        <div className="editor-toolbar-right">
          <span>
            Saved locally
          </span>
        </div>
      </div>

      {/* =========================================================
          MONACO EDITOR
      ========================================================= */}
      <div className="monaco-wrapper">
        <EditorCore
          height="100%"
          language={editorLanguage}
          value={file.code}
          theme={
            theme === "dark"
              ? "vs-dark"
              : "vs"
          }

          onChange={(value) =>
            onChange(value || "")
          }

          options={{
            automaticLayout: true,
            scrollBeyondLastLine: false,
            smoothScrolling: true,
            fontSize: 14,
            fontFamily:
              "JetBrains Mono, Fira Code, Consolas, monospace",
            lineHeight: 22,

            padding: {
              top: 18,
              bottom: 18
            },

            minimap: {
              enabled: true
            },

            cursorBlinking: "smooth",
            cursorSmoothCaretAnimation: "on",

            renderWhitespace: "selection",
            folding: true,
            foldingHighlight: true,
            wordWrap: "off",
            tabSize: 4,
            insertSpaces: true,

            bracketPairColorization: {
              enabled: true
            },

            guides: {
              indentation: true,
              bracketPairs: true
            },

            suggest: {
              showMethods: true,
              showFunctions: true,
              showConstructors: true,
              showDeprecated: true
            },

            scrollbar: {
              verticalScrollbarSize: 8,
              horizontalScrollbarSize: 8
            },

            selectionHighlight: true,
            occurrencesHighlight: "single",
            quickSuggestions: true,

            parameterHints: {
              enabled: true
            },

            find: {
              addExtraSpaceOnTop: false,
              autoFindInSelection: "never"
            },

            accessibilitySupport: "auto"
          }}
        />
      </div>

      {/* =========================
          TERMINAL
      ========================= */}

      <div className="execution-panel">

        <div className="execution-header">

          <div className="execution-title">
            <span className="terminal-dot" />

            TERMINAL
          </div>

          {execution && (
            <div
              className={`execution-status ${
                execution.exitCode === 0
                  ? "success"
                  : "failed"
              }`}
            >
              {execution.exitCode === 0
                ? "Process exited with code 0"
                : `Process exited with code ${execution.exitCode}`}
            </div>
          )}

        </div>

        <div className="execution-output">

          {running ? (
            <div className="terminal-message">
              <span className="terminal-spinner" />
              Running {file.name}...
            </div>
          ) : execution ? (
            <>
              {execution.output && (
                <pre className="terminal-stdout">
                  {execution.output}
                </pre>
              )}

              {execution.error && (
                <pre className="terminal-stderr">
                  {execution.error}
                </pre>
              )}

              {!execution.output &&
                !execution.error && (
                  <div className="terminal-message">
                    Program finished with no output.
                  </div>
                )}
            </>
          ) : (
            <div className="terminal-placeholder">
              Click <strong>Run</strong> to execute your code.
            </div>
          )}

        </div>
      </div>
    </div>
  );
}