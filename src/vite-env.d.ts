declare module "*.css" {}
// plotly.js-dist-min ships no type declarations; we use it only for imperative
// calls (relayout/downloadImage) that don't need typing.
declare module "plotly.js-dist-min";
