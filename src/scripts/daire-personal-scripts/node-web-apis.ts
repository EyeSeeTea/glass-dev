
// src/polyfills/node-web-apis.ts

import { TextEncoder, TextDecoder } from 'util';

const g = globalThis as any;
// 2) Blob / File / FormData (formdata-node polyfill)
import { Blob as PBlob, File as PFile, FormData as PFormData } from 'formdata-node';
g.Blob ??= PBlob;
g.File ??= PFile;
g.FormData ??= PFormData;

// (No fetch/undici here unless you truly need fetch in this process)
