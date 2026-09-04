/*
================================================================
Node require-hook: CJS interop for @eyeseetea/d2-ui-components
================================================================

@eyeseetea/d2-ui-components ships some files (e.g. locales/index.js, the auto-generated i18n
resource loader) as raw, untranspiled ES module source (`import`/`export`). That's fine in the
webpack browser build (webpack's parser understands ESM natively) and in Jest — jest.config.js
already special-cases exactly this package:

    transformIgnorePatterns: ["/node_modules/(?!@eyeseetea/d2-ui-components)"]

— telling Jest/babel-jest to transpile it despite living in node_modules. But CLI scripts run via
plain `ts-node`/Node `require()` have no such transform pipeline for node_modules .js files, so
loading anything that imports this package (e.g. src/data/repositories/download-template/
sheetBuilder.ts, needed by the AMC bulk/single-country template download flow) crashes with:

    SyntaxError: Cannot use import statement outside a module

This hook reproduces the same fix Jest already uses — transpile ESM to CommonJS with Babel, scoped
to only this one package — as a Node `Module._extensions['.js']` override, loaded via `-r` before
the target script runs. It must be a plain .js file (not .ts): ts-node's TypeScript loader only
intercepts .ts/.tsx files, so this needs to intercept node_modules .js files directly, before
Node's default CJS loader tries (and fails) to parse them.
*/

const Module = require("node:module");
const fs = require("node:fs");
const path = require("node:path");

const targetSegment = path.join("node_modules", "@eyeseetea", "d2-ui-components");
const originalJsLoader = Module._extensions[".js"];

Module._extensions[".js"] = function patchedJsLoader(module, filename) {
    if (!filename.includes(targetSegment)) {
        return originalJsLoader(module, filename);
    }

    const source = fs.readFileSync(filename, "utf8");

    // Most files in the package are already plain CommonJS (its own "main" entry point is CJS) —
    // only transpile the handful that actually start with ESM import/export syntax.
    if (!/^\s*(import|export)\s/m.test(source)) {
        return originalJsLoader(module, filename);
    }

    const babel = require("@babel/core");
    const { code } = babel.transformSync(source, {
        filename,
        babelrc: false,
        configFile: false,
        plugins: ["@babel/plugin-transform-modules-commonjs"],
    });

    module._compile(code, filename);
};
