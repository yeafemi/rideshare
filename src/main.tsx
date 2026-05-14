import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { getRouter } from "./router";
import "./styles.css";

const loadStart = Date.now();
const MIN_LOADER_MS = 800;

function hideLoader() {
  const elapsed = Date.now() - loadStart;
  const remaining = Math.max(0, MIN_LOADER_MS - elapsed);

  setTimeout(() => {
    const loader = document.getElementById("ridealong-loader");
    if (!loader) return;
    loader.classList.add("fade-out");
    setTimeout(() => loader.remove(), 600);
  }, remaining);
}

const router = getRouter();

router.load().then(() => {
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <RouterProvider router={router} />
    </React.StrictMode>,
  );

  hideLoader();
});
