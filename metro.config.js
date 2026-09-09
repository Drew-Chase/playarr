// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const fs = require('fs');
const path = require('path');

// react-native-tvos packaging bug: @react-native-tvos/virtualized-lists declares
// upstream react-native as a hard dependency, so npm nests an upstream copy inside
// the TV fork. Any self-require from the fork then resolves to that copy and the
// devtools setup runs twice -> "property is not writable" crash at startup.
// Remove it before Metro builds the graph. (Also guarded by package.json postinstall.)
const nestedRn = path.join(__dirname, 'node_modules/react-native/node_modules/react-native');
if (fs.existsSync(nestedRn)) {
  fs.rmSync(nestedRn, { recursive: true, force: true });
  console.log('[metro] removed nested upstream react-native copy (react-native-tvos packaging bug)');
}

const config = getDefaultConfig(__dirname);

// When enabled, the optional code below will allow Metro to resolve
// and bundle source files with TV-specific extensions
// (e.g., *.ios.tv.tsx, *.android.tv.tsx, *.tv.tsx)
//
// Metro will still resolve source files with standard extensions
// as usual if TV-specific files are not found for a module.
//
/*
if (process.env?.EXPO_TV === '1') {
  const originalSourceExts = config.resolver.sourceExts;
  const tvSourceExts = [
    ...originalSourceExts.map((e) => `tv.${e}`),
    ...originalSourceExts,
  ];
  config.resolver.sourceExts = tvSourceExts;
}
 */

module.exports = config;
