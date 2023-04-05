import {nodeResolve} from "@rollup/plugin-node-resolve"
import typescript from "@rollup/plugin-typescript"
import commonjs from "@rollup/plugin-commonjs"
import terser from "@rollup/plugin-terser"

export default [
  {
    input: "src/ts/index.ts",
    plugins: [
      typescript(),
      commonjs(),
      nodeResolve({ preferBuiltins: false, browser: true }),
      //terser({format: {comments: false}})
    ],
    output: {
      dir: "bin",
      format: "iife",
      name: "fc2",
      globals: {}
    }
  }
]
