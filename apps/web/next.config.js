const defaultServerUrl = process.env.NODE_ENV === 'production'
  ? 'https://kafila-server.vercel.app'
  : 'http://localhost:4000';

const serverHttpUrl = (process.env.NEXT_PUBLIC_SERVER_HTTP_URL || defaultServerUrl).replace(/\/$/, '');

const nextConfig = {
  reactStrictMode: false,
  transpilePackages: ['@mantar-jantar/shared', '@mantar-jantar/game-core'],
  async rewrites() {
    return [
      {
        source: '/status',
        destination: `${serverHttpUrl}/status`
      },
      {
        source: '/api/rooms',
        destination: `${serverHttpUrl}/api/rooms`
      },
      {
        source: '/api/info',
        destination: `${serverHttpUrl}/api/info`
      }
    ];
  }
};

module.exports = nextConfig;
