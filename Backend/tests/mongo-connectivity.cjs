const path = require('node:path');
const root = path.resolve(__dirname, '..', '..');
const backend = file => path.join(root, 'Backend', file);
const mongoose = require(backend('node_modules/mongoose'));
const { loadEnvironment, applyDatabaseDns } = require(backend('config/environment'));
loadEnvironment();

// Reads connection metadata only; never creates, changes, or deletes documents.
(async () => {
  try {
    applyDatabaseDns();
    await mongoose.connect(process.env.DATABASE_API_KEY, {
      serverSelectionTimeoutMS: 8000,
      connectTimeoutMS: 5000,
      autoIndex: false,
      autoCreate: false
    });
    console.log('MongoDB read-only connectivity: PASS');
    const Trip = require(backend('models/trip'));
    const indexes = await Trip.collection.indexes();
    const active = indexes.some(index => index.unique && index.key?.creator === 1 &&
      index.key?.status === 1 && index.partialFilterExpression?.status === 'active');
    console.log('Live unique active-trip index: ' + (active ? 'PASS' : 'MISSING'));
    if (!active) process.exitCode = 1;
  } catch (error) {
    console.log('MongoDB read-only connectivity: FAIL (' + (error.code || error.name) + ')');
    const category = /querySrv|ENOTFOUND|ETIMEOUT/.test(error.message) ? 'DNS SRV lookup' :
      /ECONNREFUSED/.test(error.message) ? 'connection refused' :
      /authentication/i.test(error.message) ? 'authentication' : 'network/server selection';
    console.log('Failure category: ' + category);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
})();
