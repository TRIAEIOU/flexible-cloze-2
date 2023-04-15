import {nodeResolve} from "@rollup/plugin-node-resolve"
import typescript from "@rollup/plugin-typescript"
import copy from 'rollup-plugin-copy-merge'
import fs from 'fs-extra'
import terser from "@rollup/plugin-terser"

export default [
  {
    input: "src/ts/index.ts",
    output: {
      file: './build/fc2.js',
      format: "iife",
      banner: "var fc2"
    },
    plugins: [
      typescript(),
      nodeResolve({ preferBuiltins: false, browser: true }),
      //terser({format: {comments: false}}),
      copy({
        hook: "writeBundle",
        targets: [
          {
            src: 'src/html/fc2.html',
            dest: 'bin',
            rename: 'fc2-front.html',
            transform: async (contents, fname, fpath) => {
              const cfg = await fs.readFile('src/cfg/cfg_front.js', 'utf-8')
              const js = await fs.readFile('build/fc2.js')
              return contents
                .toString()
                .replace('/*--###CFG###--*/', cfg.toString().trim())
                .replace('/*--###FUNC###--*/', js.toString().trim())
                .replace('__TEMPLATE_SIDE__', "'front'")
            }
          },
          {
            src: 'src/html/fc2.html',
            dest: 'bin',
            rename: 'fc2-back.html',
            transform: async (contents, fname, fpath) => {
              const cfg = await fs.readFile('src/cfg/cfg_back.js', 'utf-8')
              const js = await fs.readFile('build/fc2.js')
              return contents
                .toString()
                .replace('/*--###CFG###--*/', cfg.toString().trim())
                .replace('/*--###FUNC###--*/', js.toString().trim())
                .replace('__TEMPLATE_SIDE__', "'back'")
            }
          },
          {
            src: 'src/html/fc2m.html',
            dest: 'bin',
            rename: 'fc2m-front.html',
            transform: async (contents, fname, fpath) => {
              const cfg = await fs.readFile('src/cfg/cfg_front.js', 'utf-8')
              const js = await fs.readFile('build/fc2.js')
              return contents
                .toString()
                .replace('/*--###CFG###--*/', cfg.toString().trim())
                .replace('/*--###FUNC###--*/', js.toString().trim())
                .replace('__TEMPLATE_SIDE__', "'front'")
            }
          },
          {
            src: 'src/html/fc2m.html',
            dest: 'bin',
            rename: 'fc2m-back.html',
            transform: async (contents, fname, fpath) => {
              const cfg = await fs.readFile('src/cfg/cfg_back.js', 'utf-8')
              const js = await fs.readFile('build/fc2.js')
              return contents
                .toString()
                .replace('/*--###CFG###--*/', cfg.toString().trim())
                .replace('/*--###FUNC###--*/', js.toString().trim())
                .replace('__TEMPLATE_SIDE__', "'back'")
            }
          }
        ]
      })
    ]
  }
]
