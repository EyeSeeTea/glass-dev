// src/polyfills/node-web-apis.ts

import { Blob as PBlob, File as PFile, FormData as PFormData } from "formdata-node";

const g = globalThis as any;
// 2) Blob / File / FormData (formdata-node polyfill)
g.Blob ??= PBlob;
g.File ??= PFile;
g.FormData ??= PFormData;

// (No fetch/undici here unless you truly need fetch in this process)
