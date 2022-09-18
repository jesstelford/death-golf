/*
module.exports = {
  multipass: true,
  js2svg: {
    indent: 2, // string with spaces or number of spaces. 4 by default
    pretty: true, // boolean, false by default
  },
  plugins: [
    {
      name: "preset-default",
      params: {
        overrides: {
          convertPathData: {
            // Inkscape inserts transformations unnecessarily
            forceAbsolutePath: true,
            floatPrecision: 2,
            transformPrecision: 2,
          },

          // or disable plugins
          //removeDoctype: false,
        },
      },
    },
    {
      name: "removeAttrs",
      params: {
        // We don't care about these attributes
        attrs: "(xmlns|width|height|viewBox)",
      },
    },
    // enable a built-in plugin by name
    //"removeStyleElement",
    //"prefixIds",
  ],
};
*/
module.exports = {
  //full: true,
  multipass: true,
  precision: 2,
  // order of plugins is important to correct functionality
  plugins: [
    "removeDoctype",
    "removeXMLProcInst",
    "removeComments",
    "removeMetadata",
    "removeEditorsNSData",
    "cleanupAttrs",
    "inlineStyles",
    "minifyStyles",
    "mergeStyles",
    "convertStyleToAttrs",
    "cleanupIDs",
    "removeRasterImages",
    "removeUselessDefs",
    "cleanupNumericValues",
    "cleanupListOfValues",
    { name: "convertColors", params: { currentColor: "#f0f" } },
    "removeUnknownsAndDefaults",
    "removeNonInheritableGroupAttrs",
    "removeUselessStrokeAndFill",
    "cleanupEnableBackground",
    "removeEmptyText",
    "convertShapeToPath",
    "moveElemsAttrsToGroup",
    "moveGroupAttrsToElems",
    "collapseGroups",
    {
      name: "convertPathData",
      params: {
        // Inkscape inserts transformations unnecessarily
        forceAbsolutePath: true,
        floatPrecision: 2,
        transformPrecision: 2,
      },
    },
    "convertTransform",
    "removeEmptyAttrs",
    "removeEmptyContainers",
    "mergePaths",
    "removeUnusedNS",
    "sortAttrs",
    "removeTitle",
    "removeDesc",
    "removeStyleElement",
    "removeScriptElement",
    {
      name: "removeAttrs",
      params: {
        // We don't care about these attributes
        attrs: "(xmlns|stroke|paint-order)",
      },
    },
    {
      name: "addAttributesToSVGElement",
      params: {
        attribute: {
          // Rendered svg should not be visible
          style: "position: absolute; left: -999999px; right: -999999px",
        },
      },
    },
    "sortDefsChildren",
  ],
  js2svg: {
    pretty: false,
  },
};
