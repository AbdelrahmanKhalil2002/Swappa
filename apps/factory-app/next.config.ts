import type { NextConfig } from 'next'
import withPWA from '@ducanh2912/next-pwa'

const config: NextConfig = {
  transpilePackages: ['@antigravity/ui', '@antigravity/types', '@antigravity/utils'],
}

export default withPWA({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
})(config)
