import * as esbuild from "esbuild";
import {entryPoints} from "./entryPoints.mjs";

// The fix was posted here:
// https://medium.com/geekculture/build-a-library-with-esbuild-23235712f3c
await esbuild.build({
    entryPoints: entryPoints,
    bundle: true,
    minify: true,
    platform: "node",
    // splitting: true,
    write: true,
    treeShaking: true,
    sourcemap: false,
    format: "cjs",
    define: { gobal: "window" },
    target: "node20",
    outdir: "dist",
    logLevel: "info",
    legalComments: "none",
    // outExtension: { '.js': '.cjs' },
    // target: ['chrome58', 'firefox57', 'safari11', 'edge16'],
    plugins:[
    ]
}).catch(() => process.exit(1));
