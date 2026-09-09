const orig = global.ErrorUtils && global.ErrorUtils.getGlobalHandler ? global.ErrorUtils.getGlobalHandler() : null;

if (global.ErrorUtils && global.ErrorUtils.setGlobalHandler) {
  global.ErrorUtils.setGlobalHandler((error, isFatal) => {
    const msg = (error && error.message) || String(error);
    const stack = (error && error.stack) || '(no stack)';
    console.error('POLYFIX >>> ' + (isFatal ? 'FATAL ' : '') + msg + '\nSTACK:\n' + stack);
    if (orig) orig(error, isFatal);
  });
}

try {
  const g = global;
  for (const k of ['performance', '__fbBatchedBridgeConfig', 'window', 'document']) {
    const d = Object.getOwnPropertyDescriptor(g, k);
    if (d && !d.writable && d.set === undefined) {
      console.error('POLYFIX >>> global "' + k + '" is non-writable at startup');
    }
  }
} catch {}
