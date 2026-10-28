const path = require('node:path');
const { Resolver } = require('node:dns').promises;
const backend = file => path.resolve(__dirname, '..', file);
require(backend('node_modules/dotenv')).config({ path: backend('.env'), quiet: true });

// Query public DNS records only. Never print credentials or change DNS settings.
(async () => {
  const uri = process.env.DATABASE_API_KEY;
  if (!uri?.startsWith('mongodb+srv://')) {
    console.log('Configured database does not use DNS SRV discovery.');
    return;
  }
  const hostname = new URL(uri).hostname;
  await Promise.all([
    ['system', undefined], ['Cloudflare', ['1.1.1.1']], ['Google', ['8.8.8.8']]
  ].map(async ([label, servers]) => {
    const resolver = new Resolver({ timeout: 4000, tries: 1 });
    if (servers) resolver.setServers(servers);
    try {
      const [srv, txt] = await Promise.all([
        resolver.resolveSrv('_mongodb._tcp.' + hostname),
        resolver.resolveTxt(hostname)
      ]);
      console.log(label + ': PASS (' + srv.length + ' SRV targets, ' + txt.length + ' TXT records)');
    } catch (error) {
      console.log(label + ': FAIL (' + error.code + ')');
    }
  }));
})();
