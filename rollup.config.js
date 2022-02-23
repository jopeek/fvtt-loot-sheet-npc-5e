import copy from "rollup-plugin-copy";
import { nodeResolve } from '@rollup/plugin-node-resolve';
import sourcemaps from "rollup-plugin-sourcemaps";
import { terser } from "rollup-plugin-terser";
import replace from 'rollup-plugin-replace';

const staticFiles = ["templates", "libs", "fonts", "styles", "icons", "lang", "packs", "module.json"].map((file) => `src/${file}`);

/**
 * @type {import('rollup').RollupOptions}
 */
const config = {
    input: "src/lootsheetnpc5e.js",
    external: ["../../../../../systems/dnd5e/module/actor/sheets/npc.js"],
    output: {
        dir: "dist/",
        format: "es",
        sourcemap: true,
        assetFileNames: "[name].[ext]",
    },
    plugins: [
        replace({
            // If you would like DEV messages, specify 'development'
            // Otherwise use 'production'
            'process.env.NODE_ENV': JSON.stringify('production')
        }),
        nodeResolve({
            tippy: true,
        }),
        sourcemaps(),
        copy({
            watch: staticFiles,
            targets: staticFiles.map((file) => ({
                src: `${file}`,
                dest: "dist",
            })),
        }),
        terser({ ecma: 2020, keep_fnames: true }),
    ],
};

module.exports = config;
