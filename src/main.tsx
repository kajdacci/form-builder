import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes, Navigate } from "react-router";
import { ThemeProvider } from "@/providers/theme-provider";
import { FlowEditor } from "@/pages/admin/flow-editor";
import { ChatPage } from "@/pages/chat/chat-page";
import { NotFound } from "@/pages/not-found";
import "@/styles/globals.css";

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <ThemeProvider>
            <BrowserRouter>
                <Routes>
                    <Route path="/" element={<Navigate to="/admin" replace />} />
                    <Route path="/admin" element={<FlowEditor />} />
                    <Route path="/chat/:token" element={<ChatPage />} />
                    <Route path="*" element={<NotFound />} />
                </Routes>
            </BrowserRouter>
        </ThemeProvider>
    </StrictMode>,
);
