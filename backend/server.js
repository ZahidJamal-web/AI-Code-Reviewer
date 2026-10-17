import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { reviewCode } from "./ai.js";

dotenv.config();

const app = express();

const PORT = process.env.PORT || 5000;

const CLIENT_URL =
  process.env.CLIENT_URL || "http://localhost:5173";

const OLLAMA_URL =
  process.env.OLLAMA_URL || "http://localhost:11434";

const OLLAMA_MODEL =
  process.env.OLLAMA_MODEL || "qwen2.5-coder:7b";

/*
|--------------------------------------------------------------------------
| REVIEW PERFORMANCE
|--------------------------------------------------------------------------
|
| Static analysis runs immediately.
|
| Ollama is given a maximum of 4 seconds.
| This keeps the total review request around 5 seconds.
|
*/

const AI_REVIEW_TIMEOUT =
  Number(process.env.AI_REVIEW_TIMEOUT || 4000);

const MAX_AI_CODE_LINES =
  Number(process.env.MAX_AI_CODE_LINES || 250);

/*
|--------------------------------------------------------------------------
| TEMP EXECUTION DIRECTORY
|--------------------------------------------------------------------------
*/

const TEMP_DIR = path.join(
  process.cwd(),
  "temp_exec"
);

if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, {
    recursive: true
  });
}

/*
|--------------------------------------------------------------------------
| MIDDLEWARE
|--------------------------------------------------------------------------
*/

app.use(cors({
    origin: [
        "http://localhost:5173",
        "https://pixelcode-ai.vercel.app"
    ]
}));

app.use(
  express.json({
    limit: "1mb"
  })
);

/*
|--------------------------------------------------------------------------
| UTILITY
|--------------------------------------------------------------------------
*/

function createIssue({
  severity,
  category,
  line,
  title,
  description,
  suggestion
}) {
  return {
    severity,
    category,
    line,
    title,
    description,
    suggestion
  };
}

/*
|--------------------------------------------------------------------------
| FAST STATIC CODE ANALYZER
|--------------------------------------------------------------------------
|
| This does NOT use AI.
|
| It is intentionally lightweight so that it can run in milliseconds.
|
*/

function runStaticAnalysis({
  code,
  language
}) {
  const issues = [];
  const positives = [];

  const lines = code.split(/\r?\n/);

  const addIssue = (issue) => {
    issues.push(createIssue(issue));
  };

  /*
  --------------------------------------------------------------------------
  | SECURITY: Hard-coded secrets
  --------------------------------------------------------------------------
  */

  const secretPatterns = [
    /api[_-]?key\s*[:=]\s*["'][^"']{8,}["']/i,
    /secret\s*[:=]\s*["'][^"']{8,}["']/i,
    /password\s*[:=]\s*["'][^"']{4,}["']/i,
    /access[_-]?token\s*[:=]\s*["'][^"']{8,}["']/i,
    /private[_-]?key\s*[:=]\s*["'][^"']{8,}["']/i
  ];

  lines.forEach((line, index) => {
    for (const pattern of secretPatterns) {
      if (pattern.test(line)) {
        addIssue({
          severity: "critical",
          category: "security",
          line: index + 1,
          title: "Potential hard-coded secret",
          description:
            "A credential or secret appears to be embedded directly in source code.",
          suggestion:
            "Move secrets to environment variables or a secure secret manager."
        });

        break;
      }
    }
  });

  /*
  --------------------------------------------------------------------------
  | Python
  --------------------------------------------------------------------------
  */

  if (language === "python") {
    lines.forEach((line, index) => {
      const trimmed = line.trim();

      /*
      | eval()
      */

      if (/\beval\s*\(/.test(trimmed)) {
        addIssue({
          severity: "critical",
          category: "security",
          line: index + 1,
          title: "Unsafe eval usage",
          description:
            "eval() can execute dynamically supplied Python code and may introduce code execution vulnerabilities.",
          suggestion:
            "Avoid eval(). Parse and validate expected input explicitly."
        });
      }

      /*
      | exec()
      */

      if (/\bexec\s*\(/.test(trimmed)) {
        addIssue({
          severity: "warning",
          category: "security",
          line: index + 1,
          title: "Dynamic code execution",
          description:
            "exec() executes dynamically generated Python code.",
          suggestion:
            "Avoid exec() unless the input is completely trusted and controlled."
        });
      }

      /*
      | Bare except
      */

      if (/^except\s*:/.test(trimmed)) {
        addIssue({
          severity: "warning",
          category: "quality",
          line: index + 1,
          title: "Broad exception handling",
          description:
            "A bare except catches every exception, including unexpected system exceptions.",
          suggestion:
            "Catch specific exception types instead."
        });
      }

      /*
      | Mutable default argument
      */

      if (
        /def\s+\w+\([^)]*=\s*(\[\]|\{\})/.test(trimmed)
      ) {
        addIssue({
          severity: "warning",
          category: "bug",
          line: index + 1,
          title: "Mutable default argument",
          description:
            "Using a list or dictionary as a default argument can cause state to persist between function calls.",
          suggestion:
            "Use None as the default and initialize the mutable value inside the function."
        });
      }
    });

    if (
      code.includes("if __name__") &&
      code.includes("def main")
    ) {
      positives.push(
        "Uses a clear Python entry-point structure."
      );
    }

    if (code.includes('"""') || code.includes("'''")) {
      positives.push(
        "Contains documentation strings."
      );
    }
  }

  /*
  --------------------------------------------------------------------------
  | JavaScript / TypeScript
  --------------------------------------------------------------------------
  */

  if (
    language === "javascript" ||
    language === "typescript"
  ) {
    lines.forEach((line, index) => {
      const trimmed = line.trim();

      /*
      | eval
      */

      if (/\beval\s*\(/.test(trimmed)) {
        addIssue({
          severity: "critical",
          category: "security",
          line: index + 1,
          title: "Unsafe eval usage",
          description:
            "eval() executes dynamically generated JavaScript.",
          suggestion:
            "Avoid eval() and use explicit parsing or controlled dispatch."
        });
      }

      /*
      | innerHTML
      */

      if (/\.\s*innerHTML\s*=/.test(trimmed)) {
        addIssue({
          severity: "warning",
          category: "security",
          line: index + 1,
          title: "Potential unsafe HTML injection",
          description:
            "Directly assigning innerHTML can introduce XSS when the content is not trusted.",
          suggestion:
            "Prefer textContent or sanitize untrusted HTML before inserting it."
        });
      }

      /*
      | console.log
      */

      if (/console\.log\s*\(/.test(trimmed)) {
        addIssue({
          severity: "suggestion",
          category: "quality",
          line: index + 1,
          title: "Debug logging detected",
          description:
            "Console logging may be undesirable in production code.",
          suggestion:
            "Use a controlled logging strategy or remove debugging statements before production."
        });
      }
    });

    if (
      code.includes("const ") ||
      code.includes("let ")
    ) {
      positives.push(
        "Uses modern variable declarations."
      );
    }

    if (code.includes("async ") && code.includes("await ")) {
      positives.push(
        "Uses asynchronous control flow."
      );
    }
  }

  /*
  --------------------------------------------------------------------------
  | SQL
  --------------------------------------------------------------------------
  */

  if (language === "sql") {
    lines.forEach((line, index) => {
      const trimmed = line.trim();

      if (
        /select\s+.*\+\s*.*from/i.test(trimmed)
      ) {
        addIssue({
          severity: "warning",
          category: "security",
          line: index + 1,
          title: "Potential SQL injection pattern",
          description:
            "Dynamic SQL construction can allow untrusted input to alter a query.",
          suggestion:
            "Use parameterized queries or prepared statements."
        });
      }

      if (
        /\bselect\s+\*/i.test(trimmed)
      ) {
        addIssue({
          severity: "suggestion",
          category: "performance",
          line: index + 1,
          title: "SELECT * detected",
          description:
            "Selecting every column can increase unnecessary data transfer.",
          suggestion:
            "Select only the columns required by the application."
        });
      }
    });
  }

  /*
  --------------------------------------------------------------------------
  | Java / C / C++ / C#
  --------------------------------------------------------------------------
  */

  if (
    language === "java" ||
    language === "c" ||
    language === "cpp" ||
    language === "csharp"
  ) {
    lines.forEach((line, index) => {
      const trimmed = line.trim();

      if (
        /\b(system|runtime)\s*\(\s*["']/.test(
          trimmed
        )
      ) {
        addIssue({
          severity: "warning",
          category: "security",
          line: index + 1,
          title: "Operating system command execution",
          description:
            "Executing operating system commands can become dangerous when arguments contain untrusted input.",
          suggestion:
            "Avoid shell execution where possible and validate all external input."
        });
      }
    });
  }

  /*
  --------------------------------------------------------------------------
  | Generic TODO / FIXME
  --------------------------------------------------------------------------
  */

  lines.forEach((line, index) => {
    if (
      /\b(TODO|FIXME|HACK)\b/i.test(line)
    ) {
      addIssue({
        severity: "suggestion",
        category: "maintainability",
        line: index + 1,
        title: "Pending implementation marker",
        description:
          "The source contains a TODO, FIXME, or HACK marker.",
        suggestion:
          "Resolve the pending work or track it in the project's issue system."
      });
    }
  });

  /*
  --------------------------------------------------------------------------
  | Empty catch blocks
  --------------------------------------------------------------------------
  */

  lines.forEach((line, index) => {
    if (
      /catch\s*\([^)]*\)\s*\{\s*\}/.test(
        line
      )
    ) {
      addIssue({
        severity: "warning",
        category: "quality",
        line: index + 1,
        title: "Empty error handler",
        description:
          "An empty catch block silently ignores errors.",
        suggestion:
          "Handle the error explicitly or log enough information for diagnosis."
      });
    }
  });

  /*
  --------------------------------------------------------------------------
  | Very long lines
  --------------------------------------------------------------------------
  */

  lines.forEach((line, index) => {
    if (line.length > 140) {
      addIssue({
        severity: "suggestion",
        category: "maintainability",
        line: index + 1,
        title: "Long source line",
        description:
          "This line is unusually long and may reduce readability.",
        suggestion:
          "Consider splitting the expression into smaller logical sections."
      });
    }
  });

  /*
  --------------------------------------------------------------------------
  | Positive result
  --------------------------------------------------------------------------
  */

  if (issues.length === 0) {
    positives.push(
      "No obvious security, reliability, or maintainability patterns were detected by static analysis."
    );
  }

  /*
  --------------------------------------------------------------------------
  | Severity counts
  --------------------------------------------------------------------------
  */

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

  return {
    issues,
    positives,
    counts: {
      critical,
      warnings,
      suggestions,
      total: issues.length
    }
  };
}

/*
|--------------------------------------------------------------------------
| AI TIMEOUT WRAPPER
|--------------------------------------------------------------------------
*/

async function runAIReviewWithTimeout({
  code,
  language,
  filename
}) {
  return Promise.race([
    reviewCode({
      code,
      language,
      filename
    }),

    new Promise((resolve) => {
      setTimeout(() => {
        resolve(null);
      }, AI_REVIEW_TIMEOUT);
    })
  ]);
}

/*
|--------------------------------------------------------------------------
| MERGE STATIC + AI REVIEW
|--------------------------------------------------------------------------
*/

function mergeReviews({
  staticReview,
  aiReview
}) {
  const staticIssues =
    staticReview?.issues || [];

  const aiIssues =
    aiReview?.issues || [];

  /*
  | Avoid excessive duplicate findings.
  */

  const combinedIssues = [
    ...staticIssues,
    ...aiIssues
  ];

  const uniqueIssues = [];

  const seen = new Set();

  for (const issue of combinedIssues) {
    const key = [
      issue.line,
      issue.category,
      issue.title
    ]
      .join("|")
      .toLowerCase();

    if (!seen.has(key)) {
      seen.add(key);
      uniqueIssues.push(issue);
    }
  }

  const positives = [
    ...(staticReview?.positives || []),
    ...(aiReview?.positives || [])
  ];

  /*
  | Remove duplicate positives.
  */

  const uniquePositives = [
    ...new Set(positives)
  ];

  const critical = uniqueIssues.filter(
    (issue) =>
      issue.severity === "critical"
  ).length;

  const warnings = uniqueIssues.filter(
    (issue) =>
      issue.severity === "warning"
  ).length;

  const suggestions = uniqueIssues.filter(
    (issue) =>
      issue.severity === "suggestion"
  ).length;

  return {
    summary:
      aiReview?.summary ||
      (
        uniqueIssues.length === 0
          ? "No significant issues were detected."
          : `${uniqueIssues.length} potential issue${uniqueIssues.length === 1 ? "" : "s"} identified.`
      ),

    positives: uniquePositives,

    issues: uniqueIssues,

    counts: {
      critical,
      warnings,
      suggestions,
      total: uniqueIssues.length
    },

    /*
    | Metadata lets the frontend show how the review
    | was generated.
    */

    metadata: {
      staticAnalysis: true,
      aiAnalysis: Boolean(aiReview),
      aiProvider: aiReview
        ? "ollama"
        : "static",
      aiModel: aiReview
        ? OLLAMA_MODEL
        : null
    }
  };
}

/*
|--------------------------------------------------------------------------
| HEALTH CHECK
|--------------------------------------------------------------------------
*/

app.get(
  "/api/health",
  (req, res) => {
    res.json({
      success: true,

      message:
        "PixelCode backend is running",

      provider: "ollama",

      ollamaUrl: OLLAMA_URL,

      model: OLLAMA_MODEL,

      reviewTimeout:
        AI_REVIEW_TIMEOUT,

      staticAnalysis: true
    });
  }
);

/*
|--------------------------------------------------------------------------
|  CODE REVIEW
|--------------------------------------------------------------------------
*/
app.post("/api/review", async (req, res) => {

  const requestStarted = Date.now();

  try {

    const {
      code,
      language,
      filename
    } = req.body;


    if (!code || !code.trim()) {
      return res.status(400).json({
        success: false,
        error: "Code content is required."
      });
    }


    if (!language) {
      return res.status(400).json({
        success: false,
        error: "Programming language is required."
      });
    }


    console.log(
      `📝 Review requested: ${filename || "untitled"} (${language})`
    );


    const review = await reviewCode({
      code,
      language,
      filename: filename || "untitled"
    });


    const duration =
      Date.now() - requestStarted;


    console.log(
      `✓ Review completed in ${duration}ms`
    );


    return res.json({
      success: true,
      review
    });


  } catch (error) {

    console.error(
      "❌ Review error:",
      error
    );


    return res.status(500).json({
      success: false,
      error:
        error.message ||
        "Unable to review code."
    });

  }

});

/*
|--------------------------------------------------------------------------
| LANGUAGE CONFIGURATIONS
|--------------------------------------------------------------------------
*/

const executionMap = {
  python: {
    ext: "py",
    cmd: "python",
    args: (file) => [
      "-u",
      file
    ],
    help:
      "Python is not installed or missing from System PATH."
  },

  javascript: {
    ext: "js",
    cmd: "node",
    args: (file) => [
      file
    ],
    help:
      "Node.js runtime is missing from your system environment."
  },

  typescript: {
    ext: "ts",
    cmd: "ts-node",
    args: (file) => [
      file
    ],
    help:
      "Install TypeScript and ts-node to execute TypeScript."
  },

  go: {
    ext: "go",
    cmd: "go",
    args: (file) => [
      "run",
      file
    ],
    help:
      "Go compiler toolchain is missing."
  },

  php: {
    ext: "php",
    cmd: "php",
    args: (file) => [
      file
    ],
    help:
      "PHP runtime is missing."
  },

  ruby: {
    ext: "rb",
    cmd: "ruby",
    args: (file) => [
      file
    ],
    help:
      "Ruby interpreter is missing."
  },

  lua: {
    ext: "lua",
    cmd: "lua",
    args: (file) => [
      file
    ],
    help:
      "Lua runtime is missing."
  },

  perl: {
    ext: "pl",
    cmd: "perl",
    args: (file) => [
      file
    ],
    help:
      "Perl interpreter is missing."
  },

  r: {
    ext: "R",
    cmd: "Rscript",
    args: (file) => [
      file
    ],
    help:
      "Rscript is missing."
  },

  bash: {
    ext: "sh",
    cmd: "bash",
    args: (file) => [
      file
    ],
    help:
      "Bash is missing."
  },

  java: {
    ext: "java",
    cmd: "java",
    args: (file) => [
      file
    ],
    help:
      "Java runtime is missing."
  },

  c: {
    ext: "c",
    isCompiled: true,

    compileCmd: "gcc",

    compileArgs: (
      file,
      output
    ) => [
      file,
      "-o",
      output
    ],

    runCmd: (
      output
    ) => output,

    runArgs: () => [],

    help:
      "GCC compiler is missing."
  },

  cpp: {
    ext: "cpp",
    isCompiled: true,

    compileCmd: "g++",

    compileArgs: (
      file,
      output
    ) => [
      file,
      "-o",
      output
    ],

    runCmd: (
      output
    ) => output,

    runArgs: () => [],

    help:
      "G++ compiler is missing."
  },

  rust: {
    ext: "rs",
    isCompiled: true,

    compileCmd: "rustc",

    compileArgs: (
      file,
      output
    ) => [
      file,
      "-o",
      output
    ],

    runCmd: (
      output
    ) => output,

    runArgs: () => [],

    help:
      "Rust compiler is missing."
  },

  csharp: {
    ext: "cs",
    isCompiled: true,

    compileCmd: "csc",

    compileArgs: (
      file,
      output
    ) => [
      `-out:${output}`,
      file
    ],

    runCmd: (
      output
    ) => output,

    runArgs: () => [],

    help:
      "C# compiler is missing."
  }
};

/*
|--------------------------------------------------------------------------
| NON EXECUTABLE LANGUAGES
|--------------------------------------------------------------------------
*/

const nonExecutableLanguages = {
  html:
    "HTML is a browser document and cannot be executed as a console program.",

  css:
    "CSS is a styling language and does not have a console runtime.",

  sql:
    "SQL requires a configured database connection.",

  kotlin:
    "Kotlin execution requires a configured Kotlin/JVM toolchain.",

  swift:
    "Swift execution requires a configured Swift toolchain.",

  dart:
    "Dart execution requires the Dart SDK.",

  scala:
    "Scala execution requires a configured JVM/Scala environment."
};

/*
|--------------------------------------------------------------------------
| PROCESS EXECUTOR
|--------------------------------------------------------------------------
*/

function executeProcess(
  command,
  args,
  diagnosticsHelp
) {
  return new Promise(
    (resolve) => {
      const child =
        spawn(
          command,
          args,
          {
            windowsHide: true,
            cwd: TEMP_DIR
          }
        );

      let stdout = "";
      let stderr = "";

      const timeout =
        setTimeout(
          () => {
            child.kill();

            resolve({
              timedOut: true
            });
          },
          15000
        );

      child.stdout.on(
        "data",
        (data) => {
          stdout +=
            data.toString();
        }
      );

      child.stderr.on(
        "data",
        (data) => {
          stderr +=
            data.toString();
        }
      );

      child.on(
        "error",
        (error) => {
          clearTimeout(
            timeout
          );

          if (
            error.code ===
            "ENOENT"
          ) {
            resolve({
              missingToolchain:
                true,

              message:
                diagnosticsHelp
            });

            return;
          }

          resolve({
            error:
              error.message
          });
        }
      );

      child.on(
        "close",
        (exitCode) => {
          clearTimeout(
            timeout
          );

          resolve({
            success: true,
            stdout,
            stderr,
            exitCode
          });
        }
      );
    }
  );
}

/*
|--------------------------------------------------------------------------
| CODE EXECUTION
|--------------------------------------------------------------------------
*/

app.post(
  "/api/run",
  async (req, res) => {
    let tempFilePath = null;
    let binaryPath = null;

    const cleanFiles = () => {
      try {
        if (
          tempFilePath &&
          fs.existsSync(
            tempFilePath
          )
        ) {
          fs.unlinkSync(
            tempFilePath
          );
        }

        if (
          binaryPath &&
          fs.existsSync(
            binaryPath
          )
        ) {
          fs.unlinkSync(
            binaryPath
          );
        }
      } catch (error) {
        console.error(
          "Cleanup error:",
          error
        );
      }
    };

    try {
      const {
        code,
        language
      } = req.body;

      if (
        !code ||
        !code.trim()
      ) {
        return res.status(400).json({
          success: false,
          error:
            "Code content is required."
        });
      }

      if (
        nonExecutableLanguages[
          language
        ]
      ) {
        return res.json({
          success: true,

          output:
            `[PixelCode] ${
              nonExecutableLanguages[
                language
              ]
            }`,

          error: "",

          exitCode: 0
        });
      }

      const config =
        executionMap[
          language
        ];

      if (!config) {
        return res.status(400).json({
          success: false,

          error:
            `Language environment '${language}' is unsupported.`
        });
      }

      console.log(
        `▶ Running: ${language}`
      );

      const uniqueId =
        crypto.randomUUID();

      const filename =
        `script_${uniqueId}.${config.ext}`;

      tempFilePath =
        path.join(
          TEMP_DIR,
          filename
        );

      /*
      | Java requires class filename.
      */

      if (
        language === "java"
      ) {
        const match =
          code.match(
            /public\s+class\s+([a-zA-Z0-9_]+)/
          );

        const className =
          match
            ? match[1]
            : "Main";

        tempFilePath =
          path.join(
            TEMP_DIR,
            `${className}.java`
          );
      }

      fs.writeFileSync(
        tempFilePath,
        code
      );

      /*
      |--------------------------------------------------------------------------
      | Compiled languages
      |--------------------------------------------------------------------------
      */

      if (config.isCompiled) {
        const isWindows =
          process.platform ===
          "win32";

        const binaryName =
          `bin_${uniqueId}${
            isWindows
              ? ".exe"
              : ""
          }`;

        binaryPath =
          path.join(
            TEMP_DIR,
            binaryName
          );

        const compileResult =
          await executeProcess(
            config.compileCmd,
            config.compileArgs(
              tempFilePath,
              binaryPath
            ),
            config.help
          );

        if (
          compileResult.missingToolchain
        ) {
          cleanFiles();

          return res.json({
            success: true,

            output: "",

            error:
              `Environment issue:\n${compileResult.message}`,

            exitCode: 127
          });
        }

        if (
          compileResult.error
        ) {
          cleanFiles();

          return res.status(500).json({
            success: false,

            error:
              compileResult.error
          });
        }

        if (
          compileResult.exitCode !==
          0
        ) {
          cleanFiles();

          return res.json({
            success: true,

            output:
              compileResult.stdout,

            error:
              `Compilation Error:\n${compileResult.stderr}`,

            exitCode:
              compileResult.exitCode
          });
        }

        const runResult =
          await executeProcess(
            config.runCmd(
              binaryPath
            ),
            config.runArgs(
              binaryPath
            ),
            config.help
          );

        cleanFiles();

        if (
          runResult.timedOut
        ) {
          return res.status(408).json({
            success: false,

            error:
              "Execution timed out after 15 seconds."
          });
        }

        return res.json({
          success: true,

          output:
            runResult.stdout,

          error:
            runResult.stderr,

          exitCode:
            runResult.exitCode
        });
      }

      /*
      |--------------------------------------------------------------------------
      | Interpreted languages
      |--------------------------------------------------------------------------
      */

      const runResult =
        await executeProcess(
          config.cmd,
          config.args(
            tempFilePath
          ),
          config.help
        );

      cleanFiles();

      if (
        runResult.missingToolchain
      ) {
        return res.json({
          success: true,

          output: "",

          error:
            `Environment issue:\n${runResult.message}`,

          exitCode: 127
        });
      }

      if (
        runResult.error
      ) {
        return res.status(500).json({
          success: false,

          error:
            runResult.error
        });
      }

      if (
        runResult.timedOut
      ) {
        return res.status(408).json({
          success: false,

          error:
            "Execution timed out after 15 seconds."
        });
      }

      return res.json({
        success: true,

        output:
          runResult.stdout,

        error:
          runResult.stderr,

        exitCode:
          runResult.exitCode
      });
    } catch (error) {
      console.error(
        "❌ Execution engine error:",
        error
      );

      cleanFiles();

      if (
        res.headersSent
      ) {
        return;
      }

      return res.status(500).json({
        success: false,

        error:
          error.message ||
          "Execution engine failure."
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| 404
|--------------------------------------------------------------------------
*/

app.use(
  (req, res) => {
    res.status(404).json({
      success: false,
      error:
        "Endpoint not found."
    });
  }
);

/*
|--------------------------------------------------------------------------
| SERVER
|--------------------------------------------------------------------------
*/

app.listen(
  PORT,
  () => {
    console.log("");

    console.log(
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    );

    console.log(
      "       PIXELCODE BACKEND"
    );

    console.log(
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    );

    console.log(
      `🚀 Server: http://localhost:${PORT}`
    );

    console.log(
      `🤖 AI Provider: Ollama`
    );

    console.log(
      `🔗 Ollama: ${OLLAMA_URL}`
    );

    console.log(
      `🧠 Model: ${OLLAMA_MODEL}`
    );

    console.log(
      `⚡ AI timeout: ${AI_REVIEW_TIMEOUT}ms`
    );

    console.log(
      `🔍 Static analysis: ENABLED`
    );

    console.log(
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    );

    console.log("");
  }
);