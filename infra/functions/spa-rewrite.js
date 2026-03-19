// CloudFront function for SPA routing.
// Rewrites requests for paths without file extensions to /index.html
// so that client-side routing works correctly.

// biome-ignore lint/correctness/noUnusedVariables: CloudFront function handler signature
function handler(event) {
  var request = event.request;
  var uri = request.uri;

  // If the URI has a file extension, serve the file as-is
  if (uri.includes(".")) {
    return request;
  }

  // For all other paths, rewrite to index.html for SPA routing
  request.uri = "/index.html";
  return request;
}
