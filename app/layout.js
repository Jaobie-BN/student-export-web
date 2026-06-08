import { Plus_Jakarta_Sans, Inter } from "next/font/google";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-headline",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata = {
  title: "SEAS — Student Email Account System | ระบบจัดการบัญชีอีเมลสถานศึกษา",
  description:
    "ระบบอัพโหลดบัญชีอีเมลสถานศึกษา Google Workspace Education — ประมวลผลบนเบราว์เซอร์ ปลอดภัย 100% ไม่ส่งข้อมูลขึ้นเซิร์ฟเวอร์",
  icons: {
    icon: "./SEAS.png",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="th" className={`${plusJakartaSans.variable} ${inter.variable}`}>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
