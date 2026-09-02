/**
 * Example trees bundled with the deployed app. Files live in public/examples/
 * (served as static assets); picking one in the tree switcher imports a copy.
 */
export interface ExampleTree {
  label: string;
  url: string;
}

export const EXAMPLE_TREES: ExampleTree[] = [
  { label: 'Disaster Tree v0.7.0', url: 'examples/disaster-tree-v0.7.0.json' },
];
