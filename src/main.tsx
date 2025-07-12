
import './index.css'
import Index from './pages/index.tsx'
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router";
import { ThemeProvider } from "@/components/theme-provider"

import { Toaster } from "@/components/ui/sonner"

const root = document.getElementById("root");

ReactDOM.createRoot(root!).render(

  <BrowserRouter>
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <Index />
    </ThemeProvider>
    <Toaster />
  </BrowserRouter>
);