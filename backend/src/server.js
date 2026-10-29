const { createApp } = require('./app');

const PORT = process.env.PORT || 3000;

createApp().listen(PORT, () => {
  console.log(`VetConnect listo: abre http://localhost:${PORT}`);
  console.log(`API de citas en  http://localhost:${PORT}/api/citas`);
});
