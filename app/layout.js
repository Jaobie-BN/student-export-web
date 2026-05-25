import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Student Data Export | ระบบแปลงไฟล์รายชื่อนักเรียนอัตโนมัติ",
  description: "ระบบแปลงไฟล์รายชื่อนักเรียนและจัดรูปแบบข้อมูลเพื่อนำเข้าบัญชี Google Workspace หรือสำหรับจัดทำรายงาน ทับงานบนเบราว์เซอร์ ปลอดภัย 100%",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
