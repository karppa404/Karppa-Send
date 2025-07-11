
import './index.css'
import Index from './pages/index.tsx'
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router";
import { ThemeProvider } from "@/components/theme-provider"


const root = document.getElementById("root");

ReactDOM.createRoot(root!).render(
  
  <BrowserRouter>
  <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <Index />
  </ThemeProvider>
    </BrowserRouter>
);