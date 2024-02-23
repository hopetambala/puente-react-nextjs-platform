const path = require('path');
const withImages = require('next-images');

module.exports = withImages({
  sassOptions: {
    includePaths: [path.join(__dirname, 'styles')],
  },
});

module.exports = {
  async redirects() {
    return [
      {
        source: "/",
        destination: "/account/login",
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: "upgrade-insecure-requests",
          },
        ],
      },
    ];
  },
};
