require('dotenv').config();
const app = require('./app');

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`VM 2026 API running on http://localhost:${PORT}`);
});
