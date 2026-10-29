import type { ReactNode } from "react";

import "@fontsource/vazirmatn/400.css";
import "@fontsource/vazirmatn/500.css";
import "@fontsource/vazirmatn/600.css";
import "@fontsource/vazirmatn/700.css";
import "@fontsource/vazirmatn/800.css";

import "./globals.css";

export default function RootLayout({
    children,
}: {
    children: ReactNode;
}) {
    return (
        <html lang="fa" dir="rtl">
            <body>{children}</body>
        </html>
    );
}