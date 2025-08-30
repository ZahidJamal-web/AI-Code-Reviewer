import React, { useState, useEffect } from "react";
import Navbar from "./components/Navbar";
import Editor from "@monaco-editor/react";
import Select from "react-select";
import { defaultSnippets } from "./snippets";

// Markdown & Syntax Highlighting
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

const App = () => {
  const languageOptions = [
    { value: "python", label: "Python", icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/python/python-original.svg" },
    { value: "java", label: "Java", icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/java/java-original.svg" },
    { value: "c", label: "C", icon: "https://upload.wikimedia.org/wikipedia/commons/1/18/C_Programming_Language.svg" },
    { value: "cpp", label: "C++", icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/cplusplus/cplusplus-original.svg" },
    { value: "csharp", label: "C#", icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/csharp/csharp-original.svg" },
    { value: "javascript", label: "JavaScript", icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/javascript/javascript-original.svg" },
    { value: "typescript", label: "TypeScript", icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/typescript/typescript-original.svg" },
    { value: "php", label: "PHP", icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/php/php-original.svg" },
    { value: "go", label: "Go", icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/go/go-original.svg" },
    { value: "rust", label: "Rust", icon: "https://upload.wikimedia.org/wikipedia/commons/d/d5/Rust_programming_language_black_logo.svg" },
    { value: "sql", label: "SQL", icon: "https://img.icons8.com/color/48/000000/sql.png" },
  ];

  // store code separately for each language
  const [codes, setCodes] = useState(defaultSnippets);
  const [language, setLanguage] = useState(languageOptions[0].value);
  const [review, setReview] = useState("");
  const [loading, setLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(true);

  const toggleDarkMode = () => setDarkMode(!darkMode);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  // Gemini AI Review
  const handleReview = async () => {
    setLoading(true);
    setReview("");

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `Please review this ${language} code. Suggest improvements, best practices, and point out bugs if any:\n\n${codes[language]}`,
                  },
                ],
              },
            ],
          }),
        }
      );

      const data = await response.json();
      const text =
        data?.candidates?.[0]?.content?.parts?.[0]?.text ||
        "⚠️ No response from Gemini.";
      setReview(text);
    } catch (error) {
      console.error(error);
      setReview("❌ Error fetching review. Please try again.");
    }

    setLoading(false);
  };

  // Download function
  const downloadFile = (filename, content) => {
    const element = document.createElement("a");
    const file = new Blob([content], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className={`${darkMode ? "dark" : ""} h-screen`}>
      <div className="flex flex-col h-full bg-white text-black dark:bg-[#1e1e1e] dark:text-gray-200">
        <Navbar darkMode={darkMode} toggleDarkMode={toggleDarkMode} />

        <div className="flex flex-1 flex-col md:flex-row overflow-hidden">
          {/* Left: Code Editor */}
          <div className="flex flex-col w-full md:w-1/2 h-1/2 md:h-full border-r border-gray-700">
            {/* Toolbar */}
            <div className="flex items-center justify-between p-3 bg-gray-200 dark:bg-[#252526] border-b border-gray-400 dark:border-gray-700">
              {/* Language Selector */}
              <Select
                className="w-56 text-black"
                value={languageOptions.find((opt) => opt.value === language)}
                onChange={(e) => setLanguage(e.value)}
                options={languageOptions}
                formatOptionLabel={(option) => (
                  <div className="flex items-center space-x-2">
                    <img
                      src={option.icon}
                      alt={option.label}
                      className="w-5 h-5 rounded-sm"
                    />
                    <span>{option.label}</span>
                  </div>
                )}
                classNames={{
                  control: () =>
                    "bg-white dark:bg-[#2d2d2d] border border-gray-300 dark:border-gray-600 text-sm",
                  singleValue: () => "text-black dark:text-white",
                  menu: () => "bg-white dark:bg-[#2d2d2d] text-black dark:text-white",
                }}
              />

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={handleReview}
                  disabled={loading}
                  className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 transition disabled:opacity-50 text-sm font-medium text-white"
                >
                  {loading ? "Reviewing..." : "Review Code"}
                </button>

                <button
                  onClick={() => downloadFile(`code.${language}`, codes[language])}
                  className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium"
                >
                  Download
                </button>
              </div>
            </div>

            {/* Code Editor */}
            <div className="flex-1 bg-white dark:bg-[#1e1e1e]">
              <Editor
                height="100%"
                theme={darkMode ? "vs-dark" : "light"}
                language={language}
                value={codes[language]} // language-specific code
                onChange={(val) =>
                  setCodes({ ...codes, [language]: val || "" }) // updates only that language
                }
                options={{
                  minimap: { enabled: true },
                  fontSize: 14,
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                }}
              />
            </div>
          </div>

          {/* Right: AI Review */}
          <div className="flex flex-col w-full md:w-1/2 h-1/2 md:h-full bg-gray-100 dark:bg-[#2a2a2a]">
            <div className="p-3 bg-gray-200 dark:bg-[#252526] border-b border-gray-400 dark:border-gray-700">
              <h2 className="text-lg font-semibold">Code Snapshot</h2>
            </div>
            <div className="flex-1 overflow-y-auto p-4 text-sm leading-relaxed prose prose-sm max-w-none dark:prose-invert">
              {loading ? (
                <p className="text-gray-400">⏳ Analyzing your code...</p>
              ) : review ? (
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeHighlight]}
                >
                  {review}
                </ReactMarkdown>
              ) : (
                <p className="text-gray-500">
                  Your code review will appear here.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
