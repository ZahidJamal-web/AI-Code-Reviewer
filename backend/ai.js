import dotenv from "dotenv";

dotenv.config();

const OLLAMA_URL =
  process.env.OLLAMA_URL || "http://localhost:11434";

const OLLAMA_MODEL =
  process.env.OLLAMA_MODEL || "qwen2.5-coder:7b";

const AI_TIMEOUT =
  Number(process.env.AI_TIMEOUT_MS) || 4200;


/*
|--------------------------------------------------------------------------
| Utility
|--------------------------------------------------------------------------
*/

function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);

    if (!match) {
      throw new Error("AI returned invalid JSON.");
    }

    return JSON.parse(match[0]);
  }
}


/*
|--------------------------------------------------------------------------
| Fast Static Analysis
|--------------------------------------------------------------------------
*/

function staticAnalysis(code, language) {
  const findings = [];
  const lines = code.split("\n");

  const add = (
    severity,
    category,
    title,
    description,
    line = null,
    suggestion = ""
  ) => {
    findings.push({
      id: `static-${findings.length + 1}`,
      source: "static",
      severity,
      category,
      title,
      description,
      line,
      suggestion
    });
  };


  /*
  |--------------------------------------------------------------------------
  | Universal checks
  |--------------------------------------------------------------------------
  */

  if (lines.length > 300) {
    add(
      "warning",
      "maintainability",
      "Large source file",
      "The file is becoming large enough that separating responsibilities may improve maintainability.",
      null,
      "Consider splitting unrelated responsibilities into smaller functions or modules."
    );
  }


  lines.forEach((line, index) => {
    const lineNumber = index + 1;

    if (line.length > 120) {
      add(
        "suggestion",
        "readability",
        "Long line",
        "This line is difficult to scan and may reduce readability.",
        lineNumber,
        "Break the expression into smaller logical pieces."
      );
    }

    if (/\bTODO\b|\bFIXME\b/i.test(line)) {
      add(
        "suggestion",
        "maintainability",
        "Pending work marker",
        "This line contains a TODO/FIXME marker that may represent unfinished work.",
        lineNumber,
        "Resolve the task or track it through your issue management system."
      );
    }
  });


  /*
  |--------------------------------------------------------------------------
  | Python
  |--------------------------------------------------------------------------
  */

  if (language === "python") {

    lines.forEach((line, index) => {
      const lineNumber = index + 1;

      if (/print\s*\(/.test(line)) {
        add(
          "suggestion",
          "maintainability",
          "Direct console output",
          "Direct print statements can make production code harder to test and integrate.",
          lineNumber,
          "Consider returning values or using a logging abstraction where appropriate."
        );
      }

      if (/except\s*:\s*$/.test(line)) {
        add(
          "warning",
          "reliability",
          "Broad exception handling",
          "Catching every exception can hide unexpected failures.",
          lineNumber,
          "Catch specific exception types and handle them deliberately."
        );
      }

      if (/global\s+\w+/.test(line)) {
        add(
          "warning",
          "maintainability",
          "Global state",
          "Global mutable state makes code harder to reason about and test.",
          lineNumber,
          "Prefer passing dependencies explicitly."
        );
      }
    });

    if (
      /for\s+\w+\s+in\s+range\s*\(\s*1\s*,\s*\w+\s*\+\s*1\s*\)/.test(code)
    ) {
      add(
        "suggestion",
        "readability",
        "Loop boundary can be simplified",
        "The loop uses an unnecessarily verbose range boundary.",
        null,
        "Prefer range(1, value + 1) when that is the intended inclusive range."
      );
    }
  }


  /*
  |--------------------------------------------------------------------------
  | JavaScript / TypeScript
  |--------------------------------------------------------------------------
  */

  if (
    language === "javascript" ||
    language === "typescript"
  ) {
    lines.forEach((line, index) => {
      const lineNumber = index + 1;

      if (/console\.log\s*\(/.test(line)) {
        add(
          "suggestion",
          "maintainability",
          "Console logging",
          "Console logging is useful during development but should normally be replaced by structured logging in production code.",
          lineNumber,
          "Use a logging abstraction or remove development-only logging."
        );
      }

      if (/\bvar\s+/.test(line)) {
        add(
          "warning",
          "maintainability",
          "Legacy variable declaration",
          "var has function scope and can introduce accidental state changes.",
          lineNumber,
          "Prefer const by default and let when reassignment is required."
        );
      }
    });
  }


  /*
  |--------------------------------------------------------------------------
  | C / C++
  |--------------------------------------------------------------------------
  */

  if (language === "c" || language === "cpp") {
    if (
      code.includes("malloc(") &&
      !code.includes("free(")
    ) {
      add(
        "critical",
        "reliability",
        "Potential memory leak",
        "Memory is allocated dynamically but no corresponding free operation was detected.",
        null,
        "Ensure every allocation has a clear ownership and cleanup path."
      );
    }
  }


  return findings;
}


/*
|--------------------------------------------------------------------------
| AI Prompt
|--------------------------------------------------------------------------
*/

function buildPrompt({
  code,
  language,
  filename,
  staticFindings
}) {

  return `
You are PixelCode Enterprise Code Review Engine.

You are reviewing production code.

Your job is NOT to give the code a score.

Your job is to help a developer improve the code.

Evaluate these five engineering dimensions:

1. Readability
2. Maintainability
3. Performance
4. Scalability
5. Testability

Return ONLY valid JSON.

Do not use markdown.
Do not include explanations outside JSON.
Keep the response concise.

Required JSON structure:

{
  "summary": "Short professional summary",
  "overallAssessment": "What is good and what should be improved",
  "findings": [
    {
      "severity": "critical|warning|suggestion",
      "category": "readability|maintainability|performance|scalability|testability|security|reliability",
      "title": "Short issue title",
      "description": "Explain the actual problem",
      "line": 10,
      "recommendation": "Specific improvement"
    }
  ],
  "improvements": [
    {
      "area": "Readability|Maintainability|Performance|Scalability|Testability",
      "recommendation": "Concrete improvement"
    }
  ],
  "betterCode": "Complete improved version of the submitted code",
  "betterCodeExplanation": [
    "Short explanation of improvement 1",
    "Short explanation of improvement 2",
    "Short explanation of improvement 3"
  ]
}

Rules:

- Do not invent problems.
- Only report meaningful issues.
- Do not report cosmetic issues unless they materially affect maintainability.
- Prefer practical engineering recommendations.
- Do not rewrite correct code unnecessarily.
- The betterCode must remain functionally equivalent unless an improvement is necessary.
- Preserve the original language.
- Keep betterCode production-oriented.
- Avoid unnecessary abstractions.
- If the original code is already good, make only meaningful improvements.
- Maximum 8 findings.
- Maximum 5 improvements.
- Keep descriptions short.
- The betterCode must contain the COMPLETE code.

FILE:
${filename}

LANGUAGE:
${language}

STATIC FINDINGS:
${JSON.stringify(staticFindings)}

SOURCE CODE:
${code}
`;
}


/*
|--------------------------------------------------------------------------
| Ollama request with timeout
|--------------------------------------------------------------------------
*/

async function callOllama(prompt) {

  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, AI_TIMEOUT);


  try {

    const response = await fetch(
      `${OLLAMA_URL}/api/generate`,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify({
          model: OLLAMA_MODEL,
          prompt,

          stream: false,

          format: "json",

          options: {
            temperature: 0.1,
            top_p: 0.8,
            num_predict: 1800
          }
        }),

        signal: controller.signal
      }
    );


    if (!response.ok) {
      throw new Error(
        `Ollama returned HTTP ${response.status}`
      );
    }


    const data = await response.json();

    if (!data.response) {
      throw new Error("Ollama returned an empty response.");
    }


    return safeJsonParse(data.response);

  } finally {
    clearTimeout(timeout);
  }
}


/*
|--------------------------------------------------------------------------
| Main Review Engine
|--------------------------------------------------------------------------
*/

export async function reviewCode({
  code,
  language,
  filename = "untitled"
}) {

  const start = Date.now();


  /*
  |--------------------------------------------------------------------------
  | STATIC ANALYSIS
  |--------------------------------------------------------------------------
  */

  const staticFindings =
    staticAnalysis(code, language);


  /*
  |--------------------------------------------------------------------------
  | AI REVIEW
  |--------------------------------------------------------------------------
  */

  let aiReview = null;
  let aiError = null;

  try {

    const prompt = buildPrompt({
      code,
      language,
      filename,
      staticFindings
    });

    aiReview = await callOllama(prompt);

  } catch (error) {

    aiError =
      error.name === "AbortError"
        ? "AI review exceeded the response deadline."
        : error.message;

  }


  /*
  |--------------------------------------------------------------------------
  | Merge findings
  |--------------------------------------------------------------------------
  */

  const aiFindings =
    Array.isArray(aiReview?.findings)
      ? aiReview.findings.map((item, index) => ({
          id: `ai-${index + 1}`,
          source: "ai",
          ...item
        }))
      : [];


  const findings = [
    ...staticFindings,
    ...aiFindings
  ];


  const critical =
    findings.filter(
      item => item.severity === "critical"
    ).length;

  const warnings =
    findings.filter(
      item => item.severity === "warning"
    ).length;

  const suggestions =
    findings.filter(
      item => item.severity === "suggestion"
    ).length;


  const duration =
    Date.now() - start;


  /*
  |--------------------------------------------------------------------------
  | Return enterprise review
  |--------------------------------------------------------------------------
  */

  return {

    summary:
      aiReview?.summary ||
      (
        findings.length === 0
          ? "No actionable issues were detected."
          : "The review identified areas that can be improved."
      ),

    overallAssessment:
      aiReview?.overallAssessment ||
      "Static analysis completed. AI analysis was unavailable.",

    findings,

    improvements:
      aiReview?.improvements || [],

    betterCode:
      aiReview?.betterCode || code,

    betterCodeExplanation:
      aiReview?.betterCodeExplanation || [],

    metrics: {
      critical,
      warnings,
      suggestions
    },

    analysis: {
      static: staticFindings.length,
      ai: aiFindings.length
    },

    performance: {
      duration,
      aiAvailable: Boolean(aiReview),
      aiError
    }

  };
}