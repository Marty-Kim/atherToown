import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  /* next dev 가 자동 생성하는 AGENTS.md / CLAUDE.md 를 만들지 않는다. */
  agentRules: false,
};

export default nextConfig;
