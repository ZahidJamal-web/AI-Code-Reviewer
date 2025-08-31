import React, { useState, useEffect } from "react";
import Navbar from "./components/Navbar";
import Editor from "@monaco-editor/react";
import Select from "react-select";
import { defaultSnippets } from "./snippets";
import { Toaster, toast } from "react-hot-toast";
import { Menu, Plus, Save, File } from "lucide-react";

// Markdown & Syntax Highlighting
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

const App = () => {
  // ---------- STATE ----------
  const [files, setFiles] = useState([]);
  const [currentFile, setCurrentFile] = useState(null);
  const [codes, setCodes] = useState(defaultSnippets);
  const [language, setLanguage] = useState("python");
  const [review, setReview] = useState("");
  const [loading, setLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // ---------- LANGUAGE OPTIONS ----------
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

  // ---------- EXTENSIONS ----------
  const extensions = {
    python: "py",
    java: "java",
    c: "c",
    cpp: "cpp",
    csharp: "cs",
    javascript: "js",
    typescript: "ts",
    php: "php",
    go: "go",
    rust: "rs",
    sql: "sql",
  };

  // ---------- THEME ----------
  const toggleDarkMode = () => setDarkMode(!darkMode);
  useEffect(() => {
    if (darkMode) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  }, [darkMode]);

  // ---------- GEMINI REVIEW ----------
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
            contents: [{ parts: [{ text: `Please review this ${language} code:\n\n${codes[language]}` }] }],
          }),
        }
      );

      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "⚠️ No response from Gemini.";
      setReview(text);
    } catch (error) {
      console.error(error);
      setReview("❌ Error fetching review. Please try again.");
    }
    setLoading(false);
  };

  // ---------- FILE FUNCTIONS ----------
  const handleSaveFile = () => {
    const ext = extensions[language] || "txt";

    if (!currentFile) {
      // generate unique filename
      let counter = 1;
      let newName = `Untitled-${counter}.${ext}`;
      while (files.some((f) => f.name === newName)) {
        counter++;
        newName = `Untitled-${counter}.${ext}`;
      }

      const newFile = {
        id: Date.now(),
        name: newName,
        language,
        content: codes[language],
        timestamp: new Date().toLocaleString(),
      };
      setFiles([...files, newFile]);
      setCurrentFile(newFile);
      toast.success(`File "${newFile.name}" saved`);
    } else {
      // update existing file
      const updated = files.map((f) =>
        f.id === currentFile.id
          ? {
              ...f,
              content: codes[language],
              language,
              name: f.name.split(".")[0] + `.${ext}`,
              timestamp: new Date().toLocaleString(),
            }
          : f
      );
      setFiles(updated);
      setCurrentFile({
        ...currentFile,
        content: codes[language],
        language,
        name: currentFile.name.split(".")[0] + `.${ext}`,
      });
      toast.success(`File "${currentFile.name}" updated`);
    }
  };

  const handleNewFile = () => {
    const ext = extensions[language] || "txt";
    setCurrentFile(null);
    setCodes({ ...codes, [language]: defaultSnippets[language] });
    toast(`📝 New ${language.toUpperCase()} file (.${ext}) created`, { icon: "✨" });
  };

  const handleOpenFile = (file) => {
    setCurrentFile(file);
    setLanguage(file.language);
    setCodes({ ...codes, [file.language]: file.content });
    toast(`Opened "${file.name}"`);
  };

  const handleDeleteFile = (id) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
    if (currentFile?.id === id) setCurrentFile(null);
    toast("🗑️ File deleted");
  };

  // ---------- UI ----------
  return (
    <div className={`${darkMode ? "dark" : ""} h-screen`}>
      <div className="flex h-full bg-white text-black dark:bg-[#1e1e1e] dark:text-gray-200">

        {/* Sidebar */}
        <div
          className={`${sidebarOpen ? "w-64" : "w-16"} transition-all duration-300
          bg-gray-100 dark:bg-[#202123] border-r border-gray-300 dark:border-gray-700 flex flex-col`}
        >
          {/* Top */}
          <div className="flex items-center justify-between p-3 border-b border-gray-300 dark:border-gray-700">
            <button onClick={() => setSidebarOpen(!sidebarOpen)}>
              <Menu size={20} />
            </button>
            {sidebarOpen && <h2 className="text-lg font-bold">Files</h2>}
          </div>

          {/* File List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {files.length === 0 ? (
              sidebarOpen && <p className="text-sm text-gray-500">No files saved yet.</p>
            ) : (
              files.map((file) => (
                <div
                  key={file.id}
                  className={`group p-2 rounded-md flex items-center justify-between ${
                    currentFile?.id === file.id
                      ? "bg-purple-600 text-white"
                      : "bg-gray-200 dark:bg-[#2a2b32] hover:bg-gray-300 dark:hover:bg-[#383a40]"
                  }`}
                >
                  <div
                    className="flex items-center gap-2 cursor-pointer flex-1"
                    onClick={() => handleOpenFile(file)}
                  >
                    <File size={16} />
                    {sidebarOpen && (
                      <div>
                        <p className="text-sm font-medium">{file.name}</p>
                        <p className="text-xs opacity-70">{file.timestamp}</p>
                      </div>
                    )}
                  </div>
                  {sidebarOpen && (
                    <div className="hidden group-hover:flex gap-2 ml-2">
                      <button
                        onClick={() => handleOpenFile(file)}
                        className="text-xs hover:text-blue-400"
                      >
                        👁
                      </button>
                      <button
                        onClick={() => handleDeleteFile(file.id)}
                        className="text-xs hover:text-red-400"
                      >
                        🗑
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Main */}
        <div className="flex-1 flex flex-col">
          <Navbar darkMode={darkMode} toggleDarkMode={toggleDarkMode} />

          <div className="flex flex-1 flex-col md:flex-row overflow-hidden">

            {/* Editor */}
            <div className="flex flex-col w-full md:w-1/2 h-1/2 md:h-full border-r border-gray-700">
              <div className="flex items-center justify-between p-3 bg-gray-200 dark:bg-[#252526] border-b border-gray-400 dark:border-gray-700">
                <Select
                  className="w-56 text-black"
                  value={languageOptions.find((opt) => opt.value === language)}
                  onChange={(e) => setLanguage(e.value)}
                  options={languageOptions}
                  formatOptionLabel={(option) => (
                    <div className="flex items-center space-x-2">
                      <img src={option.icon} alt={option.label} className="w-5 h-5" />
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
              </div>

              <div className="flex-1 bg-white dark:bg-[#1e1e1e]">
                <Editor
                  height="100%"
                  theme={darkMode ? "vs-dark" : "light"}
                  language={language}
                  value={codes[language]}
                  onChange={(val) => setCodes({ ...codes, [language]: val || "" })}
                  options={{
                    minimap: { enabled: true },
                    fontSize: 14,
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                  }}
                />
              </div>
            </div>

            {/* AI Review */}
            <div className="flex flex-col w-full md:w-1/2 h-1/2 md:h-full bg-gray-100 dark:bg-[#2a2a2a]">
              <div className="p-3 bg-gray-200 dark:bg-[#252526] border-b border-gray-400 dark:border-gray-700 flex justify-between gap-2">
                <h2 className="text-lg font-semibold">AI Review</h2>
                <div className="flex gap-2">
                  <button
                    onClick={handleNewFile}
                    className="px-3 py-1 rounded-md bg-blue-600 text-white text-sm flex items-center gap-1"
                  >
                    <Plus size={14} /> New
                  </button>
                  <button
                    onClick={handleSaveFile}
                    className="px-3 py-1 rounded-md bg-green-600 text-white text-sm flex items-center gap-1"
                  >
                    <Save size={14} /> Save
                  </button>
                  <button
                    onClick={handleReview}
                    disabled={loading}
                    className="px-3 py-1 rounded-md bg-purple-600 text-white text-sm"
                  >
                    {loading ? "Reviewing..." : "Review Code"}
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 text-sm leading-relaxed prose prose-sm max-w-none dark:prose-invert">
                {loading ? (
                  <p className="text-gray-400">⏳ Analyzing your code...</p>
                ) : review ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
                    {review}
                  </ReactMarkdown>
                ) : (
                  <p className="text-gray-500">Your code review will appear here.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <Toaster position="bottom-right" />
    </div>
  );
};

export default App;
