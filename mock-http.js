const http = require('http');
const https = require('https');

function sanitizeHeaders(headers) {
  if (!headers) return;
  for (const key of Object.keys(headers)) {
    if (typeof headers[key] === 'string') {
      headers[key] = headers[key].replace(/[^\x20-\x7E]/g, '');
    }
  }
}

const originalHttpRequest = http.request;
http.request = function(...args) {
  if (args[0] && args[0].headers) sanitizeHeaders(args[0].headers);
  if (args[1] && args[1].headers) sanitizeHeaders(args[1].headers);
  return originalHttpRequest.apply(this, args);
};

const originalHttpsRequest = https.request;
https.request = function(...args) {
  if (args[0] && args[0].headers) sanitizeHeaders(args[0].headers);
  if (args[1] && args[1].headers) sanitizeHeaders(args[1].headers);
  return originalHttpsRequest.apply(this, args);
};
