const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // We can expose specific IPC methods here if needed.
  // For this simple app, the renderer will use fetch() to talk to localhost:5000
});
