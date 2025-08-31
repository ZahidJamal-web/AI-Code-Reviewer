import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { Toaster } from "react-hot-toast";

// Mount the App + Toaster (no duplicate renders)
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
    <Toaster position="bottom-right" reverseOrder={false} />
  </React.StrictMode>
);
