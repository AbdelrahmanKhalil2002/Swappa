import type { NextConfig } from 'next'

const config: NextConfig = {
  transpilePackages: ['@antigravity/ui', '@antigravity/types', '@antigravity/utils'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'media.antigravity.com',
      },
    ],
  },
}

export default config
