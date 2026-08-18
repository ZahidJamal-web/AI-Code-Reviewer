import { useMemo, useState } from "react";

import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import Editor from "./components/Editor";
import Review from "./components/Review";

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
|
| Only ONE file is created by default.
|
*/

const initialFiles = [
  {
    id: "main",
    name: "main.py",
    language: "python",
    code: languageTemplates.python.starter
  }
];


export default function App() {

  const [files, setFiles] = useState(initialFiles);
  const [activeFileId, setActiveFileId] = useState("main");
  const [theme, setTheme] = useState(
    localStorage.getItem("pixelcode-theme") || "dark"
  );
  const [review, setReview] = useState(null);
  const [reviewing, setReviewing] = useState(false);
  const [error, setError] = useState("");
  const [running, setRunning] = useState(false);
  const [execution, setExecution] = useState(null);

  /*
  |--------------------------------------------------------------------------
  | Active file
  |--------------------------------------------------------------------------
  */

  const activeFile = useMemo(
    () =>
      files.find(
        (file) => file.id === activeFileId
      ) || files[0],
    [files, activeFileId]
  );


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

  }


  /*
  |--------------------------------------------------------------------------
  | Change theme
  |--------------------------------------------------------------------------
  */

  function changeTheme(nextTheme) {

    setTheme(nextTheme);

    localStorage.setItem(
      "pixelcode-theme",
      nextTheme
    );

  }


  /*
  |--------------------------------------------------------------------------
  | Change programming language
  |--------------------------------------------------------------------------
  */

  function changeLanguage(language) {

    const template = languageTemplates[language];

    if (!template) {
      return;
    }

    setFiles((currentFiles) =>
      currentFiles.map((file) => {

        if (file.id !== activeFileId) {
          return file;
        }

        return {
          ...file,

          language,

          name:
            language === "java"
              ? "Main.java"
              : `main.${template.extension}`,

          code: template.starter
        };

      })
    );

    setReview(null);
    setError("");

  }


  /*
  |--------------------------------------------------------------------------
  | AI Code Review
  |--------------------------------------------------------------------------
  */

  async function reviewCode() {

    if (!activeFile?.code?.trim()) {

      setError(
        "There is no code to review."
      );

      return;
    }


    setReviewing(true);

    setError("");

    setReview(null);


    try {

      const response = await fetch(
        "http://localhost:5000/api/review",
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

        throw new Error(
          data.error ||
          "AI code review failed."
        );

      }


      setReview(data.review);

    } catch (err) {

      setError(
        err.message ||
        "Unable to connect to the PixelCode backend."
      );

    } finally {

      setReviewing(false);

    }

  }

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
      "http://localhost:5000/api/run",
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
      throw new Error(
        data.error || "Code execution failed."
      );
    }

    setExecution({
      output: data.output || "",
      error: data.error || "",
      exitCode: data.exitCode
    });

  } catch (err) {
    setExecution({
      output: "",
      error:
        err.message ||
        "Unable to execute code."
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
        theme === "light"
          ? "theme-light"
          : "theme-dark"
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
      />


      <main className="workspace">

        <Sidebar
          files={files}
          activeFileId={activeFileId}
          onSelectFile={setActiveFileId}
        />


        <section className="editor-area">

          {/* Language selector */}

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

                  <option
                    key={key}
                    value={key}
                  >
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


          <div className="mobile-review">

            <Review
              review={review}
              reviewing={reviewing}
              error={error}
              onReview={reviewCode}
            />

          </div>

        </section>


        <aside className="review-area">

          <Review
            review={review}
            reviewing={reviewing}
            error={error}
            onReview={reviewCode}
          />

        </aside>

      </main>


      <footer className="statusbar">

        <div>

          <span className="status-dot" />

          AI Ready

        </div>


        <div>

          {languageTemplates[
            activeFile?.language
          ]?.name || "Plain Text"}

        </div>


        <div>
          UTF-8
        </div>


        <div>
          Spaces: 4
        </div>


        <div className="status-right">

          PixelCode AI

        </div>

      </footer>

    </div>

  );

}