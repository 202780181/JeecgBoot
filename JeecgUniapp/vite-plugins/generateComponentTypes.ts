import { Plugin } from 'vite'
import fs from 'node:fs'
import path from 'node:path'

export function generateComponentTypes(): Plugin {
  return {
    name: 'generate-component-types',
    async buildStart() {
      const componentsDir = path.resolve(process.cwd(), 'src/components')
      const dtsPath = path.resolve(process.cwd(), 'src/components/components.d.ts')

      // Get immediate subdirectories only
      const directories = fs
        .readdirSync(componentsDir, { withFileTypes: true })
        .filter((dirent) => dirent.isDirectory())
        .map((dirent) => dirent.name)

      // Generate type definitions only for valid components
      const typeDefinitions = directories
        .filter((dir) => {
          // Check if ComponentName/ComponentName.vue exists
          const componentFile = path.join(componentsDir, dir, `${dir}.vue`)
          return fs.existsSync(componentFile)
        })
        .map((dir) => {
          return `${dir}: typeof import('./${dir}/${dir}.vue')['default']`
        })

      // Create the type definition file content
      const content = `declare module 'vue' {
  export interface GlobalComponents {
${typeDefinitions.join('\n')}
  }
}

export {}`

      // Write the type definition file
      fs.writeFileSync(dtsPath, content, 'utf-8')
    },
  }
}
