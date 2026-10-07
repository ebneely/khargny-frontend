const React = require('react');

class HostNode {
  constructor(document, tag, text) {
    this.ownerDocument = document;
    this.nodeType = text === undefined ? 1 : 3;
    this.tagName = tag?.toUpperCase();
    this.nodeName = this.tagName || '#text';
    this.namespaceURI = 'http://www.w3.org/1999/xhtml';
    this.parentNode = null;
    this.childNodes = [];
    this.attributes = {};
    this.style = { setProperty(name, value) { this[name] = value; } };
    this.text = text || '';
    this.value = '';
  }
  appendChild(node) { return this.insertBefore(node, null); }
  insertBefore(node, before) {
    node.parentNode?.removeChild(node);
    const index = before ? this.childNodes.indexOf(before) : this.childNodes.length;
    this.childNodes.splice(index, 0, node);
    node.parentNode = this;
    return node;
  }
  removeChild(node) { this.childNodes.splice(this.childNodes.indexOf(node), 1); node.parentNode = null; return node; }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  removeAttribute(name) { delete this.attributes[name]; }
  getAttribute(name) { return this.attributes[name] ?? null; }
  addEventListener() {}
  removeEventListener() {}
  focus() { this.ownerDocument.activeElement = this; }
  get firstChild() { return this.childNodes[0] || null; }
  get textContent() { return this.text + this.childNodes.map(node => node.textContent).join(''); }
  set textContent(value) { this.text = String(value); this.childNodes = []; }
  get nodeValue() { return this.text; }
  set nodeValue(value) { this.text = String(value); }
}

async function mount(render, address) {
  const listeners = new Map();
  const writes = [];
  const document = { nodeType: 9, addEventListener() {}, removeEventListener() {} };
  document.createElement = tag => new HostNode(document, tag);
  document.createElementNS = (namespace, tag) => new HostNode(document, tag);
  document.createTextNode = text => new HostNode(document, undefined, text);
  const browser = {
    location: new URL(address, 'https://offline.invalid'),
    history: { state: { next: true }, replaceState(state, unused, target) { writes.push(target); browser.location = new URL(target, browser.location); } },
    HTMLElement: HostNode,
    HTMLIFrameElement: class {},
    addEventListener(name, listener) { if (!listeners.has(name)) listeners.set(name, new Set()); listeners.get(name).add(listener); },
    removeEventListener(name, listener) { listeners.get(name)?.delete(listener); },
    scrollTo() {},
  };
  document.defaultView = browser;
  document.documentElement = document.createElement('html');
  document.body = document.createElement('body');
  document.activeElement = document.body;
  const previous = { window: global.window, document: global.document, act: global.IS_REACT_ACT_ENVIRONMENT };
  global.window = browser;
  global.document = document;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const { createRoot } = require('react-dom/client');
  const container = document.createElement('div');
  const root = createRoot(container);
  const tree = render(browser);
  await React.act(async () => root.render(tree));
  function nodes(predicate, parent = container) {
    return [parent, ...parent.childNodes.flatMap(node => nodes(() => true, node))].filter(predicate);
  }
  function props(node) { return node[Object.keys(node).find(key => key.startsWith('__reactProps$'))]; }
  return {
    browser, container, document, writes, nodes, props,
    input: () => nodes(node => node.tagName === 'INPUT')[0],
    async rerender() { await React.act(async () => root.render(React.cloneElement(tree, {}, React.cloneElement(tree.props.children)))); },
    async change(value) { const input = this.input(); await React.act(async () => { input.value = value; props(input).onChange({ target: input }); }); },
    async event(name) { await React.act(async () => { for (const listener of listeners.get(name) || []) listener(); }); },
    async close() {
      await React.act(async () => root.unmount());
      global.window = previous.window;
      global.document = previous.document;
      global.IS_REACT_ACT_ENVIRONMENT = previous.act;
    },
  };
}

module.exports = { mount };
