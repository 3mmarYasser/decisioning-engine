/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  transpilePackages: ['@decisioning/shared-types'],
};

module.exports = nextConfig;
