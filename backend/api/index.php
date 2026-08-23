{
  "functions": {
    "api/index.php": {
      "runtime": "vercel-php@0.6.0" // Pastikan versi sesuai
    }
  },
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/api/index.php"
    }
  ]
}