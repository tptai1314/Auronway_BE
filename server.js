const http = require('http');
const app = require('./app');
const PORT = process.env.PORT || 4000;
const connectDB = require('./src/config/db');

connectDB().then(() => {
  console.log('DB connected!');
  const server = http.createServer(app);
  server.listen(PORT, () => console.log('[auronway] http://localhost:' + PORT));
}).catch(e => console.error('DB error:', e));