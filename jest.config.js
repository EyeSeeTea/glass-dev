module.exports = {
    collectCoverageFrom: ["src/**/*.js"],
    testPathIgnorePatterns: ["/node_modules/", "/cypress", "/.claude/"],
    // @eyeseetea/d2-api pulls in a *nested* axios 1.x (node_modules/@eyeseetea/d2-api/node_modules/axios)
    // that ships ESM-only, so it must be transformed too. The `.*axios` alternative is what makes the
    // nested copy match: this pattern is unanchored, so without it the outer `node_modules/` position
    // (followed by `@eyeseetea/d2-api`) would match and the whole path would be skipped. The character
    // class accepts both separators so the pattern also works on Windows.
    transformIgnorePatterns: ["node_modules[\\\\/](?!(@eyeseetea[\\\\/]d2-ui-components|.*axios))"],
    modulePaths: ["src"],
    moduleDirectories: ["node_modules"],
    moduleNameMapper: {
        "\\.(css|scss)$": "<rootDir>/config/styleMock.js",
        "\\.(jpg|jpeg|png|svg)$": "<rootDir>/config/fileMock.js",
    },
    transform: {
        "^.+\\.[t|j]sx?$": "babel-jest",
    },
    testRegex: "((\\.|/)(test|spec))\\.(jsx?|tsx?)$",
    moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
    testEnvironment: "jsdom",
    globals: {
        window: true,
        document: true,
        navigator: true,
        Element: true,
    },
};
