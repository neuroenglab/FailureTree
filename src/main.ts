import { mount } from 'svelte';
import './theme/global.css';
import App from './App.svelte';
import { tree } from './state/tree.svelte';

const app = mount(App, {
  target: document.getElementById('app')!,
});

// Dev-only hook for browser-driven smoke tests.
if (import.meta.env.DEV) {
  (window as { __tree?: typeof tree }).__tree = tree;
}

export default app;
