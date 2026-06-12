import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { installErrorMonitoring } from "./lib/errorMonitoring.js";
import { hydrateDefaultStorageAdapter } from "./lib/storageAdapter.js";
import "./styles.css";

async function bootstrap() {
  await hydrateDefaultStorageAdapter();

  installErrorMonitoring();

  ReactDOM.createRoot(document.getElementById("root")).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

bootstrap();
