import ReactDOM from "react-dom/client";
import App from "./App";
import "./style.css";

const root = document.getElementById("app");

if (!root) {
  throw new Error("App root not found.");
}

ReactDOM.createRoot(root).render(
  <App />
);