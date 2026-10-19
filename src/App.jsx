
import { useEffect, useMemo, useRef, useState } from "react";

import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import Editor from "./components/Editor";
import Review from "./components/Review";

const API_URL = (
  import.meta.env.VITE_API_URL ||
  "https://pixelcode-ai-backend.vercel.app"
).replace(/\/+$/, "");

/*
|--------------------------------------------------------------------------
| Language configuration
|--------------------------------------------------------------------------
*/

const languageTemplates = {
  python: {
    name: "Python",
    extension: "py",
    starter: `def main():
    """Main execution block of the script."""
    print("Hello, World!")

if __name__ == "__main__":
    main()
`
  },

  javascript: {
    name: "JavaScript",
    extension: "js",
    starter: `function main() {
    console.log("Hello, World!");
}

main();
`
  },

  typescript: {
    name: "TypeScript",
    extension: "ts",
    starter: `function main(): void {
    console.log("Hello, World!");
}

main();
`
  },

  java: {
    name: "Java",
    extension: "java",
    starter: `public class Main {

    public static void main(String[] args) {
        System.out.println("Hello, World!");
    }
}
`
  },

  c: {
    name: "C",
    extension: "c",
    starter: `#include <stdio.h>

int main() {
    printf("Hello, World!\\n");

    return 0;
}
`
  },

  cpp: {
    name: "C++",
    extension: "cpp",
    starter: `#include <iostream>

using namespace std;

int main() {
    cout << "Hello, World!" << endl;

    return 0;
}
`
  },

  csharp: {
    name: "C#",
    extension: "cs",
    starter: `using System;

class Program {
    static void Main() {
        Console.WriteLine("Hello, World!");
    }
}
`
  },

  go: {
    name: "Go",
    extension: "go",
    starter: `package main

import "fmt"

func main() {
    fmt.Println("Hello, World!")
}
`
  },

  rust: {
    name: "Rust",
    extension: "rs",
    starter: `fn main() {
    println!("Hello, World!");
}
`
  },

  php: {
    name: "PHP",
    extension: "php",
    starter: `<?php

function main(): void {
    echo "Hello, World!";
}

main();

?>
`
  },

  ruby: {
    name: "Ruby",
    extension: "rb",
    starter: `def main
    puts "Hello, World!"
end

main
`
  },

  kotlin: {
    name: "Kotlin",
    extension: "kt",
    starter: `fun main() {
    println("Hello, World!")
}
`
  },

  swift: {
    name: "Swift",
    extension: "swift",
    starter: `import Foundation

func main() {
    print("Hello, World!")
}

main()
`
  },

  dart: {
    name: "Dart",
    extension: "dart",
    starter: `void main() {
    print("Hello, World!");
}
`
  },

  scala: {
    name: "Scala",
    extension: "scala",
    starter: `object Main {
    def main(args: Array[String]): Unit = {
        println("Hello, World!")
    }
}
`
  },

  r: {
    name: "R",
    extension: "r",
    starter: `main <- function() {
    print("Hello, World!")
}

main()
`
  },

  perl: {
    name: "Perl",
    extension: "pl",
    starter: `#!/usr/bin/perl

sub main {
    print "Hello, World!\\n";
}

main();
`
  },

  lua: {
    name: "Lua",
    extension: "lua",
    starter: `function main()
    print("Hello, World!")
end

main()
`
  },

  bash: {
    name: "Bash",
    extension: "sh",
    starter: `#!/bin/bash

main() {
    echo "Hello, World!"
}

main
`
  },

  sql: {
    name: "SQL",
    extension: "sql",
    starter: `-- Hello World equivalent in SQL

SELECT 'Hello, World!' AS message;
`
  },

  html: {
    name: "HTML",
    extension: "html",
    starter: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Hello World</title>
</head>
<body>
    <h1>Hello, World!</h1>
</body>
</html>
`
  },

  css: {
    name: "CSS",
    extension: "css",
    starter: `/* Basic CSS example */

body {
    font-family: Arial, sans-serif;
}

h1 {
    text-align: center;
}
`
  }
};

/*
|--------------------------------------------------------------------------
| Initial workspace
|--------------------------------------------------------------------------
*/

const initialFiles = [
  {
    id: "main",
    name: "main.py",
    language: "python",
    code: languageTemplates.python.starter
  }
];

/*
|--------------------------------------------------------------------------
| File extension mapping
|--------------------------------------------------------------------------
*/

const extensionLanguages = {
  py: "python",
  js: "javascript",
  jsx: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  ts: "typescript",
  tsx: "typescript",
  java: "java",
  c: "c",
  h: "c",
  cpp: "cpp",
  cc: "cpp",
  cxx: "cpp",
  hpp: "cpp",
  cs: "csharp",
  go: "go",
  rs: "rust",
  php: "php",
  rb: "ruby",
  kt: "kotlin",
  swift: "swift",
  dart: "dart",
  scala: "scala",
  r: "r",
  pl: "perl",
  lua: "lua",
  sh: "bash",
  bash: "bash",
  sql: "sql",
  html: "html",
  htm: "html",
  css: "css"
};

/*
|--------------------------------------------------------------------------
| App
|--------------------------------------------------------------------------
*/

export default function App() {
  const [files, setFiles] = useState(initialFiles);
  const [activeFileId, setActiveFileId] = useState("main");

  const [theme, setTheme] = useState(
    () => localStorage.getItem("pixelcode-theme") || "dark"
  );

  const [review, setReview] = useState(null);
  const [reviewing, setReviewing] = useState(false);
  const [error, setError] = useState("");
  const [running, setRunning] = useState(false);
  const [execution, setExecution] = useState(null);

  /*
  |--------------------------------------------------------------------------
  | Explorer resizing and visibility
  |--------------------------------------------------------------------------
  */

  const [sidebarWidth, setSidebarWidth] = useState(220);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [resizingSidebar, setResizingSidebar] = useState(false);

  const workspaceRef = useRef(null);

  /*
  |--------------------------------------------------------------------------
  | Active file
  |--------------------------------------------------------------------------
  */

  const activeFile = useMemo(
    () =>
      files.find((file) => file.id === activeFileId) || files[0],
    [files, activeFileId]
  );

  /*
  |--------------------------------------------------------------------------
  | Drag to resize Explorer
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (!resizingSidebar) return;

    function handlePointerMove(event) {
      if (!workspaceRef.current) return;

      const bounds = workspaceRef.current.getBoundingClientRect();

      const nextWidth = event.clientX - bounds.left;

      setSidebarWidth(
        Math.min(420, Math.max(160, nextWidth))
      );
    }

    function stopResizing() {
      setResizingSidebar(false);
    }

    document.body.classList.add("resizing-sidebar");

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", stopResizing);
    window.addEventListener("pointercancel", stopResizing);

    return () => {
      document.body.classList.remove("resizing-sidebar");

      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", stopResizing);
      window.removeEventListener("pointercancel", stopResizing);
    };
  }, [resizingSidebar]);

  /*
  |--------------------------------------------------------------------------
  | Update editor code
  |--------------------------------------------------------------------------
  */

  function updateCode(value) {
    setFiles((currentFiles) =>
      currentFiles.map((file) =>
        file.id === activeFileId
          ? {
              ...file,
              code: value
            }
          : file
      )
    );

    setReview(null);
    setError("");
  }

  /*
  |--------------------------------------------------------------------------
  | Change theme
  |--------------------------------------------------------------------------
  */

  function changeTheme(nextTheme) {
    setTheme(nextTheme);

    localStorage.setItem("pixelcode-theme", nextTheme);
  }

  /*
  |--------------------------------------------------------------------------
  | Create a new file
  |--------------------------------------------------------------------------
  */

  function createFile() {
    const filename = window.prompt(
      "Enter a filename with its extension:",
      "newfile.js"
    );

    if (filename === null) return;

    const name = filename.trim();

    if (
      !name ||
      /[<>:"\/\\|?*\x00-\x1f]/.test(name) ||
      name.endsWith(".") ||
      name.endsWith(" ")
    ) {
      window.alert("Please enter a valid filename.");
      return;
    }

    if (
      files.some(
        (file) => file.name.toLowerCase() === name.toLowerCase()
      )
    ) {
      window.alert("A file with this name already exists.");
      return;
    }

    const extension = name.includes(".")
      ? name.split(".").pop().toLowerCase()
      : "";

    const language = extensionLanguages[extension] || "javascript";
    const template = languageTemplates[language];

    const newFile = {
      id: `file-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 7)}`,
      name,
      language,
      code: template?.starter || ""
    };

    setFiles((currentFiles) => [...currentFiles, newFile]);

    setActiveFileId(newFile.id);
    setReview(null);
    setError("");
    setExecution(null);
  }

  /*
  |--------------------------------------------------------------------------
  | Change programming language
  |--------------------------------------------------------------------------
  */

  function changeLanguage(language) {
    const template = languageTemplates[language];

    if (!template || !activeFile) return;

    setFiles((currentFiles) =>
      currentFiles.map((file) => {
        if (file.id !== activeFileId) return file;

        return {
          ...file,
          language,
          name:
            language === "java"
              ? "Main.java"
              : `main.${template.extension}`,
          code: template.starter,
          lastReviewedCode: undefined
        };
      })
    );

    setReview(null);
    setError("");
    setExecution(null);
  }

  /*
  |--------------------------------------------------------------------------
  | AI code review
  |--------------------------------------------------------------------------
  */

  async function reviewCode() {
    if (!activeFile?.code?.trim()) {
      setError("There is no code to review.");
      return;
    }

    if (activeFile.lastReviewedCode === activeFile.code) {
      return;
    }

    setReviewing(true);
    setError("");
    setReview(null);

    try {
      const response = await fetch(
        '${API_URL}/api/review',
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            code: activeFile.code,
            language: activeFile.language,
            filename: activeFile.name
          })
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Code review failed.");
      }

      setReview(data.review);

      const reviewedFileId = activeFile.id;
      const reviewedCode = activeFile.code;

      setFiles((currentFiles) =>
        currentFiles.map((file) =>
          file.id === reviewedFileId
            ? {
                ...file,
                lastReviewedCode: reviewedCode
              }
            : file
        )
      );
    } catch (err) {
      setError(
        err.message || "Unable to connect to PixelCode backend."
      );
    } finally {
      setReviewing(false);
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Run code
  |--------------------------------------------------------------------------
  */

  async function runCode() {
    if (!activeFile?.code?.trim()) {
      setError("There is no code to run.");
      return;
    }

    setRunning(true);
    setError("");
    setExecution(null);

    try {
      const response = await fetch(
        '${API_URL}/api/run',
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            code: activeFile.code,
            language: activeFile.language,
            filename: activeFile.name
          })
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Code execution failed.");
      }

      setExecution({
        output: data.output || "",
        error: data.error || "",
        exitCode: data.exitCode
      });
    } catch (err) {
      setExecution({
        output: "",
        error: err.message || "Unable to execute code.",
        exitCode: 1
      });
    } finally {
      setRunning(false);
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Render
  |--------------------------------------------------------------------------
  */

  return (
    <div
      className={`app ${
        theme === "light" ? "theme-light" : "theme-dark"
      }`}
    >
      <Navbar
        theme={theme}
        onThemeChange={changeTheme}
        onReview={reviewCode}
        onRun={runCode}
        reviewing={reviewing}
        running={running}
        activeFile={activeFile}
        onToggleSidebar={() =>
          setSidebarOpen((open) => !open)
        }
        sidebarOpen={sidebarOpen}
      />

      <main
        className="workspace"
        ref={workspaceRef}
        style={{
          gridTemplateColumns: `${
            sidebarOpen ? `${sidebarWidth}px` : "0px"
          } 5px minmax(0, 1fr) 360px`
        }}
      >
        {/* FILE EXPLORER */}

        <Sidebar
          files={files}
          activeFileId={activeFileId}
          onSelectFile={setActiveFileId}
          onCreateFile={createFile}
        />

        {/* EXPLORER RESIZE HANDLE */}

        <div
          className={`sidebar-resize-handle ${
            resizingSidebar ? "is-resizing" : ""
          }`}
          onPointerDown={(event) => {
            if (!sidebarOpen) return;

            event.preventDefault();
            setResizingSidebar(true);
          }}
          role="separator"
          aria-label="Resize file explorer"
          aria-orientation="vertical"
          title="Drag to resize file explorer"
        />

        {/* EDITOR WORKSPACE */}

        <section className="editor-area">
          <div className="language-toolbar">
            <label htmlFor="language-select">
              Language
            </label>

            <select
              id="language-select"
              value={activeFile?.language || "python"}
              onChange={(event) =>
                changeLanguage(event.target.value)
              }
            >
              {Object.entries(languageTemplates).map(
                ([key, language]) => (
                  <option key={key} value={key}>
                    {language.name}
                  </option>
                )
              )}
            </select>
          </div>

          <Editor
            file={activeFile}
            files={files}
            onSelectFile={setActiveFileId}
            onChange={updateCode}
            theme={theme}
            execution={execution}
            running={running}
          />

          {/* MOBILE REVIEW PANEL */}

          <div className="mobile-review">
            <Review
              review={review}
              reviewing={reviewing}
              error={error}
              onReview={reviewCode}
            />
          </div>
        </section>

        {/* AI REVIEW PANEL */}

        <aside className="review-area">
          <Review
            review={review}
            reviewing={reviewing}
            error={error}
            onReview={reviewCode}
          />
        </aside>
      </main>

      {/* STATUS BAR */}

      <footer className="statusbar">
        <div>
          <span className="status-dot" />
          AI Ready
        </div>

        <div>
          {languageTemplates[activeFile?.language]?.name ||
            "Plain Text"}
        </div>

        <div>UTF-8</div>

        <div>Spaces: 4</div>

        <div className="status-right">
          PixelCode AI
        </div>
      </footer>
    </div>
  );
}
