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
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";
const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "qwen2.5-coder:7b";

// Ensure a dedicated directory exists for temporary code execution files
const TEMP_DIR = path.join(process.cwd(), "temp_exec");
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

/* =========================
   MIDDLEWARE
========================= */
app.use(cors({ origin: CLIENT_URL }));
app.use(express.json({ limit: "1mb" }));

/* =========================
   HEALTH CHECK
========================= */
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "PixelCode backend is running",
    provider: "ollama",
    ollamaUrl: OLLAMA_URL,
    model: OLLAMA_MODEL
  });
});

/* =========================
   CODE REVIEW
========================= */
app.post("/api/review", async (req, res) => {
  try {
    const { code, language, filename } = req.body;
    if (!code || !code.trim()) {
      return res.status(400).json({ success: false, error: "Code is required for review." });
    }
    if (!language) {
      return res.status(400).json({ success: false, error: "Programming language is required." });
    }
    console.log(`📝 Review requested: ${filename || "untitled"} (${language})`);
    const review = await reviewCode({ code, language, filename: filename || "untitled" });
    return res.json({ success: true, review });
  } catch (error) {
    console.error("❌ Review error:", error);
    return res.status(500).json({ success: false, error: error.message || "Unable to review code with local AI." });
  }
});

/* =========================
   LANGUAGE CONFIGURATIONS
========================= */
const executionMap = {
  python: { ext: "py", cmd: "python", args: (f) => ["-u", f], help: "Python is not installed or missing from System PATH." },
  javascript: { ext: "js", cmd: "node", args: (f) => [f], help: "Node.js runtime is missing from your system environment." },
  typescript: { ext: "ts", cmd: "ts-node", args: (f) => [f], help: "Please run 'npm install -g ts-node typescript' to support TypeScript execution." },
  go: { ext: "go", cmd: "go", args: (f) => ["run", f], help: "Go compiler toolchain is missing. Please download the Go SDK from golang.org." },
  php: { ext: "php", cmd: "php", args: (f) => [f], help: "PHP runtime executable is missing or unconfigured in system environment variables." },
  ruby: { ext: "rb", cmd: "ruby", args: (f) => [f], help: "Ruby interpreter toolchain could not be found locally." },
  lua: { ext: "lua", cmd: "lua", args: (f) => [f], help: "Lua compiler binaries are missing from the host machine engine paths." },
  perl: { ext: "pl", cmd: "perl", args: (f) => [f], help: "Perl interpreter is unconfigured on the current system environment." },
  r: { ext: "R", cmd: "Rscript", args: (f) => [f], help: "Rscript executor is missing. Please make sure the R environment is installed." },
  bash: { ext: "sh", cmd: "bash", args: (f) => [f], help: "Bash execution environment is missing (Requires Git Bash or WSL on Windows)." },
  java: { ext: "java", cmd: "java", args: (f) => [f], help: "Java Development Kit (JDK) is missing. Please install Java 11 or higher." }, 
  
  c: {
    ext: "c",
    isCompiled: true,
    compileCmd: "gcc",
    compileArgs: (f, out) => [f, "-o", out],
    runCmd: (out) => out,
    runArgs: () => [],
    help: "GCC compiler toolchain is missing. On Windows, install MinGW-w64 and append it to your system PATH environment variable."
  },
  cpp: {
    ext: "cpp",
    isCompiled: true,
    compileCmd: "g++",
    compileArgs: (f, out) => [f, "-o", out],
    runCmd: (out) => out,
    runArgs: () => [],
    help: "G++ compiler toolchain is missing. On Windows, install MinGW-w64 and append it to your system PATH environment variable."
  },
  rust: {
    ext: "rs",
    isCompiled: true,
    compileCmd: "rustc",
    compileArgs: (f, out) => [f, "-o", out],
    runCmd: (out) => out,
    runArgs: () => [],
    help: "Rust compiler framework is missing. Please install rustup from rustup.rs."
  },
  csharp: {
    ext: "cs",
    isCompiled: true,
    compileCmd: "csc",
    compileArgs: (f, out) => [`-out:${out}`, f],
    runCmd: (out) => out,
    runArgs: () => [],
    help: "C# compiler executable (csc) is missing from system frameworks environment variables."
  }
};

const nonExecutableLanguages = {
  html: "HTML configurations are client-side view layouts and do not generate standard console streams.",
  css: "CSS properties map styling definitions and do not have an active console runtime path.",
  sql: "SQL requests require an active relational database engine connection profile to query.",
  kotlin: "Kotlin single scripts require active configured system target toolchain frameworks.",
  swift: "Swift console binaries require target toolchains configured on the local platform environment.",
  dart: "Dart script setups require the standalone Dart SDK runtime tool paths to execute.",
  scala: "Scala environment execution targets require active JVM framework installations."
};

/* =========================
   CODE EXECUTION ENGINE
========================= */
app.post("/api/run", async (req, res) => {
  let tempFilePath = null;
  let binaryPath = null;

  const cleanFiles = () => {
    try {
      if (tempFilePath && fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
      if (binaryPath && fs.existsSync(binaryPath)) fs.unlinkSync(binaryPath);
    } catch (err) {
      console.error("Cleanup error:", err);
    }
  };

  try {
    const { code, language } = req.body;

    if (!code || !code.trim()) {
      return res.status(400).json({ success: false, error: "Code content is required." });
    }

    if (nonExecutableLanguages[language]) {
      return res.json({
        success: true,
        output: `[PixelCode] ${nonExecutableLanguages[language]}`,
        error: "",
        exitCode: 0
      });
    }

    const config = executionMap[language];
    if (!config) {
      return res.status(400).json({
        success: false,
        error: `Language environment '${language}' is currently unsupported or unconfigured.`
      });
    }

    console.log(`▶ Running local compiler execution: [${language}]`);

    const uniqueId = crypto.randomUUID();
    const filename = `script_${uniqueId}.${config.ext}`;
    tempFilePath = path.join(TEMP_DIR, filename);

    if (language === "java") {
      const match = code.match(/public\s+class\s+([a-zA-Z0-9_]+)/);
      const className = match ? match[1] : "Main";
      tempFilePath = path.join(TEMP_DIR, `${className}.java`);
    }

    fs.writeFileSync(tempFilePath, code);

    const executeProcess = (runCmd, runArgs, diagnosticsHelp) => {
      return new Promise((resolve) => {
        const child = spawn(runCmd, runArgs, { windowsHide: true, cwd: TEMP_DIR });
        let stdout = "";
        let stderr = "";

        const timeout = setTimeout(() => {
          child.kill();
          resolve({ timedOut: true });
        }, 15000);

        child.stdout.on("data", (data) => { stdout += data.toString(); });
        child.stderr.on("data", (data) => { stderr += data.toString(); });

        // Catch missing environment binaries smoothly without crashing node app lifecycle
        child.on("error", (err) => {
          clearTimeout(timeout);
          if (err.code === "ENOENT") {
            resolve({ missingToolchain: true, message: diagnosticsHelp });
          } else {
            resolve({ error: err.message });
          }
        });

        child.on("close", (exitCode) => {
          clearTimeout(timeout);
          resolve({ success: true, stdout, stderr, exitCode });
        });
      });
    };

    // PIPELINE FOR COMPILED RUNTIMES (C, C++, Rust, C#)
    if (config.isCompiled) {
      const isWindows = process.platform === "win32";
      const binaryName = `bin_${uniqueId}${isWindows ? ".exe" : ""}`;
      binaryPath = path.join(TEMP_DIR, binaryName);

      const compArgs = config.compileArgs(tempFilePath, binaryPath);
      const compResult = await executeProcess(config.compileCmd, compArgs, config.help);

      if (compResult.missingToolchain) {
        cleanFiles();
        return res.json({
          success: true,
          output: "",
          error: `Local Environment Configuration Issue:\n${compResult.message}`,
          exitCode: 127
        });
      }

      if (compResult.error) {
        cleanFiles();
        return res.status(500).json({ success: false, error: compResult.error });
      }

      if (compResult.exitCode !== 0) {
        cleanFiles();
        return res.json({
          success: true,
          output: compResult.stdout,
          error: `Compilation Error:\n${compResult.stderr}`,
          exitCode: compResult.exitCode
        });
      }

      const runResult = await executeProcess(config.runCmd(binaryPath), config.runArgs(binaryPath), config.help);
      cleanFiles();

      if (runResult.timedOut) {
        return res.status(408).json({ success: false, error: "Execution timed out." });
      }

      return res.json({
        success: true,
        output: runResult.stdout,
        error: runResult.stderr,
        exitCode: runResult.exitCode
      });
    }

    // PIPELINE FOR INTERPRETED RUNTIMES (Python, JS, Java, etc.)
    const args = config.args(tempFilePath);
    const runResult = await executeProcess(config.cmd, args, config.help);
    cleanFiles();

    if (runResult.missingToolchain) {
      return res.json({
        success: true,
        output: "",
        error: `Local Environment Configuration Issue:\n${runResult.message}`,
        exitCode: 127
      });
    }

    if (runResult.error) {
      return res.status(500).json({ success: false, error: runResult.error });
    }

    if (runResult.timedOut) {
      return res.status(408).json({ success: false, error: "Execution timed out." });
    }

    return res.json({
      success: true,
      output: runResult.stdout,
      error: runResult.stderr,
      exitCode: runResult.exitCode
    });

  } catch (error) {
    console.error("Critical core thread engine failure:", error);
    cleanFiles();
    if (res.headersSent) return;
    return res.status(500).json({
      success: false,
      error: error.message || "Internal environment runtime error."
    });
  }
});

/* =========================
   404
========================= */
app.use((req, res) => {
  res.status(404).json({ success: false, error: "Endpoint not found." });
});

/* =========================
   SERVER
========================= */
app.listen(PORT, () => {
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("       PIXELCODE BACKEND");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`🚀 Server: http://localhost:${PORT}`);
  console.log(`🤖 AI Provider: Ollama ✓`);
  console.log(`🔗 Ollama: ${OLLAMA_URL}`);
  console.log(`🧠 Model: ${OLLAMA_MODEL}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
});