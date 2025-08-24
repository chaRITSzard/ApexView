import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Telemetry from "./pages/Telemetry";
import Schedule from "./pages/Schedule";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <F1Cursor />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="telemetry" element={<Telemetry />} />
            <Route path="schedule" element={<Schedule />} />
          </Route>
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);


import React from "react";
const F1Cursor: React.FC = () => {
  React.useEffect(() => {
    const cursor = document.createElement('div');
    cursor.id = 'f1-cursor';
    document.body.appendChild(cursor);

    const moveCursor = (e: MouseEvent) => {
      cursor.style.transform = `translate3d(${e.clientX - 20}px, ${e.clientY - 20}px, 0)`;
    };
    const clickCursor = () => {
      document.body.classList.add('f1-cursor-active');
      setTimeout(() => document.body.classList.remove('f1-cursor-active'), 200);
    };
    window.addEventListener('mousemove', moveCursor);
    window.addEventListener('mousedown', clickCursor);

    return () => {
      window.removeEventListener('mousemove', moveCursor);
      window.removeEventListener('mousedown', clickCursor);
      document.body.removeChild(cursor);
    };
  }, []);
  return null;
};

export default App;
