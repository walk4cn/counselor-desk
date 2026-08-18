'use strict';

const http = require('node:http');
const { handleAiRelayRequest, isLoopbackHost, RELAY_PATH } = require('./ai-relay');

const host = process.env.AI_RELAY_HOST || '127.0.0.1';
const port = Number(process.env.AI_RELAY_PORT || 8787);
const requireRelayToken = !isLoopbackHost(host);

const server = http.createServer(async (request, response) => {
  if (await handleAiRelayRequest(request, response, { requireToken:requireRelayToken })) return;
  response.writeHead(404, { 'content-type':'application/json; charset=utf-8' });
  response.end(JSON.stringify({ error:{ code:'AI_RELAY_NOT_FOUND' } }));
});

server.on('error', error => {
  if (error.code === 'EADDRINUSE') console.error(`AI relay port ${port} is already in use. Set AI_RELAY_PORT to use another port.`);
  else console.error(error);
  process.exitCode = 1;
});

server.listen(port, host, () => {
  console.log(`AI relay: http://${host}:${port}${RELAY_PATH}`);
  console.log('The relay never logs API keys or request bodies.');
});
