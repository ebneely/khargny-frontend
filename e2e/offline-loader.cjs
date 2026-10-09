const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const moduleCaches = new WeakMap();

function load(relativePath, dependencies = {}) {
  const filename = path.join(__dirname, '..', relativePath);
  let modules = moduleCaches.get(dependencies);
  if (!modules) { modules = new Map(); moduleCaches.set(dependencies, modules); }
  if (modules.has(filename)) return modules.get(filename);
  const output = ts.transpileModule(dependencies.sources?.[relativePath] ?? fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const exports = {};
  modules.set(filename, exports);
  vm.runInNewContext(output, { exports, URL, URLSearchParams, Headers, Request, Response, AbortSignal, AbortController, setTimeout, clearTimeout, Date,
    window: dependencies.window, navigator: dependencies.navigator, fetch: dependencies.fetch, process: dependencies.process ?? { env: { NODE_ENV: 'test', CI: '1' } },
    require(name) {
      if (name in dependencies) return dependencies[name];
      if (name === 'server-only') return {};
      if (name.endsWith('.module.css')) return { default: new Proxy({}, { get: (target, key) => String(key) }) };
      if (name.endsWith('.css')) return {};
      if (name === 'lucide-react') return new Proxy({}, { get: () => (props) => require('react').createElement('svg', props) });
      if (name.startsWith('@/') || name.startsWith('.')) {
        const base = name.startsWith('@/') ? path.join(__dirname, '../src', name.slice(2)) : path.resolve(path.dirname(filename), name);
        const alias = '@/' + path.relative(path.join(__dirname, '../src'), base).split(path.sep).join('/');
        if (alias in dependencies) return dependencies[alias];
        const resolved = ['.ts', '.tsx'].map((suffix) => base + suffix).find(fs.existsSync);
        return load(path.relative(path.join(__dirname, '..'), resolved), dependencies);
      }
      return require(name);
    },
  }, { filename });
  return exports;
}

module.exports = { load };
