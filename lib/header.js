var deprecatedHeaders = [
  'connection',
  'host',
  'keep-alive',
  'proxy-connection',
  'te',
  'transfer-encoding',
  'upgrade'
];

function removeDeprecatedHeaders(headers) {
  deprecatedHeaders.map(function(name) {
    delete headers[name];
  });

  return headers;
}

exports.removeDeprecatedHeaders = removeDeprecatedHeaders;