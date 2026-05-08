import type { NextConfig } from 'next'

const config: NextConfig = {
  transpilePackages: ['@swappa/ui', '@swappa/types', '@swappa/utils'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'media.swappa.com',
      },
    ],
  },
}

export default config
