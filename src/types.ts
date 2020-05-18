import { ResponseType, AxiosError } from 'axios'

export type Token = string
export type GetToken = () => Token | null
export type SetToken = (token: Token) => void

type TokenPair = { accessToken: Token; refreshToken: Token }
export interface RequestTokenRefresh {
  (): Promise<TokenPair>
}

export interface Services {
  sso: string
  [k: string]: string
}

export interface RequestConfig<S extends Services, D = any> {
  service?: keyof S
  auth?: boolean
  cors?: boolean
  withCredentials?: boolean
  params?: any
  data?: D
  headers?: object
  responseType?: ResponseType
  mode?: string
}

export interface UploadRequestConfig<S extends Services, D = any>
  extends RequestConfig<S, D> {
  onUploadProgress: (e: { loaded: number; total: number }) => void
  method: 'POST' | 'PUT'
}

export interface UploadConfig<S extends Services> extends RequestConfig<S> {
  onUploadProgress?: (percent: number) => void
  method: 'POST' | 'PUT'
}

export interface BuildHeadersConfig {
  auth?: boolean
  cors?: boolean
  accessToken: Token | null
}

export interface ClientConfig<S extends Services> {
  services: S
  defaultService: keyof S
  getRefreshToken?: GetToken
  getAccessToken?: GetToken
  onTokenRefreshSuccess?: (payload: object) => void
  onTokenRefreshFailure?: (e: Error) => void
  onError?: (e: AxiosError) => void
}

export interface Headers {
  'Content-Type': string
  Accept: string
  mode?: string
  Authorization?: string
}

export interface QueueItem {
  resolve: (token: Token) => void
  reject: (error: Error) => void
}

export type Queue = QueueItem[]

export type HandleTokenRefresh = (config: {
  requestTokenRefresh: RequestTokenRefresh
  getIsRefreshing: () => boolean
  setIsRefreshing: (isRefreshing: boolean) => void
  pushToQueue: (item: QueueItem) => void
  processQueue: (token: Token) => void
  rejectQueue: (error: Error) => void
}) => (networkError: AxiosError<any>) => any
