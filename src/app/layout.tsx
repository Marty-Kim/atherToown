import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AppShell } from '@/components/shell/AppShell';

export const metadata: Metadata = {
  title: 'Agent Town — 팀 Agent 협업 워크스페이스',
  description:
    'APP · FE · BE · QA Agent가 하나의 기능을 만들기 위해 협업하는 과정을 실시간으로 관찰하고 개입하는 가상 오피스.',
};

export const viewport: Viewport = {
  themeColor: '#080b16',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className="at-grid">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-md focus:bg-[#3d5bd9] focus:px-3 focus:py-2 focus:text-[13px] focus:text-white"
        >
          본문으로 건너뛰기
        </a>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
