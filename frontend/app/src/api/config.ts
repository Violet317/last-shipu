export interface ApiConfig {
  baseUrl: string
}

function envBaseUrl(): string {
  // #ifdef H5
  return '/'
  // #endif

  // #ifndef H5
  // App / 小程序 直接连接服务器（部署后替换为你的公网IP或域名）
  return 'http://shanyushipu.top:8787'
  // #endif
}

export const apiConfig: ApiConfig = {
  baseUrl: envBaseUrl(),
}
