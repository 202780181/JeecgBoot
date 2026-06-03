import { http } from '@/utils/http'


//重复校验
export const duplicateCheck = (params)=>http.get("/sys/duplicate/check",params);


