const OLLAMA_URL =
  process.env.OLLAMA_URL || "http://localhost:11434";

const MODEL =
  process.env.OLLAMA_MODEL || "qwen2.5-coder:3b";

const reviewSchema = {
  score: 0,
  summary: "",
  positives: [],
  issues: []
};

export async function reviewCode({
  code,
  language,
  filename
}) {
  const prompt = `
You are PixelCode AI, an expert senior software engineer,
security engineer and code reviewer.

Perform a professional code review.

FILE:
${filename}

LANGUAGE:
${language}

SOURCE CODE:
--------------------
${code}
--------------------

Analyze the code for:

1. Security vulnerabilities
2. Bugs and incorrect logic
3. Performance problems
4. Error handling
5. Maintainability
6. Code quality
7. Language/framework best practices
8. Production issues

IMPORTANT RULES:

- Do not invent issues.
- Only report meaningful findings.
- Use actual source line numbers whenever possible.
- If an issue applies to the whole file, use line 1.
- Critical = serious security vulnerability,
  data loss risk, authentication bypass,
  exposed secret, or severe production bug.
- Warning = real issue that should be fixed.
- Suggestion = non-critical improvement.
- Keep descriptions concise.
- Provide practical recommendations.
- Mention good practices when they genuinely exist.
- Score the code from 0 to 100.

Return ONLY valid JSON.

The JSON must have exactly this structure:

{
  "score": 85,
  "summary": "Short overall review",
  "positives": [
    "Good practice found in the code"
  ],
  "issues": [
    {
      "severity": "warning",
      "category": "bug",
      "line": 10,
      "title": "Issue title",
      "description": "What is wrong",
      "suggestion": "How to fix it"
    }
  ]
}

Allowed severity values:

critical
warning
suggestion

Allowed category values:

security
bug
performance
quality
maintainability
best-practice
`;

  const response = await fetch(
    `${OLLAMA_URL}/api/chat`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify({
        model: MODEL,

        messages: [
          {
            role: "user",
            content: prompt
          }
        ],

        stream: false,

        format: "json",

        options: {
          temperature: 0.2
        }
      })
    }
  );

  if (!response.ok) {
    const errorText = await response.text();

    console.error(
      "Ollama error:",
      errorText
    );

    throw new Error(
      "Unable to connect to the local AI model."
    );
  }

  const data = await response.json();

  const text =
    data?.message?.content;

  if (!text) {
    throw new Error(
      "Ollama returned an empty response."
    );
  }

  try {
    const review = JSON.parse(text);

    return {
      ...reviewSchema,
      ...review
    };
  } catch (error) {
    console.error(
      "Invalid AI JSON:",
      text
    );

    throw new Error(
      "AI returned an invalid review format."
    );
  }
}