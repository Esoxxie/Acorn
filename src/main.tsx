import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./app/App";
import { initializePwaUpdates } from "./lib/pwa-update";
import "./styles/app.css";

initializePwaUpdates();

ReactDOM.createRoot(document.getElementById("app")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
