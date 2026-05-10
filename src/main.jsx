import React from "react";
import ReactDOM from "react-dom/client";
import App from "@/App.jsx";
import "@/index.css";
import { initTranslations } from "@/lib/questions/question-translations-es-loader.js";

// Load Spanish question translations — non-blocking, questions show in English until ready
initTranslations();

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
