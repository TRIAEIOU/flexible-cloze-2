import {nodeResolve} from "@rollup/plugin-node-resolve"
import typescript from "@rollup/plugin-typescript"
import copy from 'rollup-plugin-copy-merge'
import fs from 'fs-extra'
import terser from "@rollup/plugin-terser"

async function transform(contents, cfg, js, func, side) {
  cfg = (await fs.readFile(cfg, 'utf-8'))
    .toString()
    .trim()
  js = (await fs.readFile(js, 'utf-8'))
    .toString()
    .trim()
    .replace('__TEMPLATE_SIDE__', `'${side}'`)
  func = (await fs.readFile(func, 'utf-8'))
    .toString()
    .trim()
    .replace('/*--###JS###--*/', js)
  return cfg.concat('\n\n', contents.toString().trim(), '\n\n', func)
}

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
            transform: async (contents) => {
              return transform(contents, 'src/cfg/cfg_front.html',
                'build/fc2.js', 'src/html/func.html', 'front')
            }
          },
          {
            src: 'src/html/fc2.html',
            dest: 'bin',
            rename: 'fc2-back.html',
            transform: async (contents) => {
              return transform(contents, 'src/cfg/cfg_back.html',
                'build/fc2.js', 'src/html/func.html', 'back')
            }
          },
          {
            src: 'src/html/fc2m.html',
            dest: 'bin',
            rename: 'fc2m-front.html',
            transform: async (contents) => {
              return transform(contents, 'src/cfg/cfg_front.html',
                'build/fc2.js', 'src/html/func.html', 'front')
            }
          },
          {
            src: 'src/html/fc2m.html',
            dest: 'bin',
            rename: 'fc2m-back.html',
            transform: async (contents) => {
              return transform(contents, 'src/cfg/cfg_back.html',
                'build/fc2.js', 'src/html/func.html', 'back')
            }
          }
        ]
      })
    ]
  }
]
