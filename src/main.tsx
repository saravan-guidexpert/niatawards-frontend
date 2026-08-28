import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { scheduleThirdPartyTracking } from "./lib/thirdPartyTracking";

scheduleThirdPartyTracking();
createRoot(document.getElementById("root")!).render(<App />);
