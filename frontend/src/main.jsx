import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { installErrorMonitoring } from "./lib/errorMonitoring.js";
import "./styles.css";

installErrorMonitoring();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
