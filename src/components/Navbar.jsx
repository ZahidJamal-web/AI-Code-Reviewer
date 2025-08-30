import React from "react";

const Navbar = ({ darkMode, toggleDarkMode }) => {
  return (
    <nav className="flex items-center justify-between px-4 py-3 bg-purple-600 dark:bg-purple-600 shadow-md">
      {/* Left: Logo + Title */}
      <div className="flex items-center space-x-3">
        <img
          src="https://static.thenounproject.com/png/1266207-200.png"
          alt="Coditor Logo"
          className="w-8 h-8"
        />
        <span className="text-white text-2xl font-bold">PixelCode</span>
      </div>

      {/* Right: Theme Toggle */}
      <button
        onClick={toggleDarkMode}
        className="px-3 py-1 rounded-lg bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200 hover:opacity-80 transition"
      >
        {darkMode ? "🌞 " : "🌙 "}
      </button>
    </nav>
  );
};

export default Navbar;
