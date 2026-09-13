declare module '*.css' {
  const content: { [className: string]: string };
  export default content;
}

declare module '@fontsource/*' {
  const content: unknown;
  export default content;
}

// NOTE: *.svg, *.png, *.jpg and *.webp are intentionally NOT declared here.
// vite/client already declares all four (plus apng, bmp, jpeg, gif, ico,
// avif and more). Redeclaring them produced "Duplicate identifier 'src'"
// against vite/client, an error masked only by skipLibCheck. The former svg
// block also exported a `ReactComponent` for svgr, which this project does
// not use — nothing imports it.
