const fs = require('fs');

const origMkdir = fs.mkdir;
const origMkdirSync = fs.mkdirSync;

fs.mkdir = function (path, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }
  let retries = 5;
  function attempt() {
    origMkdir(path, options, (err) => {
      if (err && (err.code === 'EPERM' || err.code === 'EEXIST') && retries > 0) {
        retries--;
        setTimeout(() => {
          if (fs.existsSync(path)) {
            return callback ? callback(null) : undefined;
          }
          attempt();
        }, 50);
        return;
      }
      if (callback) callback(err);
    });
  }
  attempt();
};

fs.mkdirSync = function (path, options) {
  let retries = 5;
  while (retries >= 0) {
    try {
      return origMkdirSync(path, options);
    } catch (err) {
      if ((err.code === 'EPERM' || err.code === 'EEXIST') && retries > 0) {
        retries--;
        if (fs.existsSync(path)) return;
        // busy wait 30ms
        const end = Date.now() + 30;
        while (Date.now() < end) {}
      } else {
        throw err;
      }
    }
  }
};

