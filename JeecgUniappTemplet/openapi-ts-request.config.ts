import type { GenerateServiceProps } from 'openapi-ts-request'

export default [
  {
    schemaPath: process.env.VITE_OPENAPI_SCHEMA || 'http://localhost:8080/jeecg-boot/v3/api-docs',
    serversPath: './src/service/app',
    requestLibPath: `import request from '@/utils/request';\n import { CustomRequestOptions } from '@/interceptors/request';`,
    requestOptionsType: 'CustomRequestOptions',
    isGenReactQuery: true,
    reactQueryMode: 'vue',
    isGenJavaScript: false,
  },
] as GenerateServiceProps[]
