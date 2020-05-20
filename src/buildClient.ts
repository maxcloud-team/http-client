import axios, { Method, AxiosResponse, AxiosError } from 'axios'

import {
  buildUrl,
  buildHeaders,
  handleTokenRefresh,
  handleRequestError,
} from './utils'
import {
  Services,
  RequestConfig,
  ClientConfig,
  Queue,
  RequestTokenRefresh,
  QueueItem,
  Token,
  UploadRequestConfig,
  UploadConfig,
} from './types'
import { NoRefreshTokenProvidedError, NotConfiguredError } from './errors'

export const buildClient = <S extends Services>(_config: ClientConfig<S>) => {
  let config = _config
  const { services, defaultService, onError } = config

  let isRefreshing = false
  const setIsRefreshing = (value: boolean) => {
    isRefreshing = value
  }

  const getIsRefreshing = () => isRefreshing

  let requestsQueue: Queue = []
  const pushToQueue = (queueItem: QueueItem) => {
    requestsQueue.push(queueItem)
  }

  const processQueue = (token: Token) => {
    requestsQueue.forEach((item: QueueItem) => {
      item.resolve(token)
    })
    requestsQueue = []
  }

  const rejectQueue = (error: Error) => {
    requestsQueue.forEach((item: QueueItem) => {
      item.reject(error)
    })
    requestsQueue = []
  }

  const requestTokenRefresh: RequestTokenRefresh = async () => {
    if (!config.getRefreshToken) {
      throw new NotConfiguredError('getRefreshToken is not provided')
    }
    const currentRefreshToken = config.getRefreshToken()

    try {
      if (!currentRefreshToken) {
        throw new NoRefreshTokenProvidedError()
      }

      const refreshResponse = await axios
        .get(`${services.sso}/login/refresh`, {
          params: { refreshToken: currentRefreshToken },
          withCredentials: true,
        })
        .catch(handleRequestError)

      if (config.onTokenRefreshSuccess) {
        config.onTokenRefreshSuccess(refreshResponse.data)
      }

      const {
        access_token: accessToken,
        refresh_token: refreshToken,
      } = refreshResponse.data

      return {
        accessToken,
        refreshToken,
      }
    } catch (e) {
      if (config.onTokenRefreshFailure) {
        config.onTokenRefreshFailure(e)
      }
      throw e
    }
  }

  const request = (method: Method) => <R, D = any>(
    route: string,
    requestConfig: RequestConfig<S, D> | UploadRequestConfig<S, D> = {},
  ): Promise<AxiosResponse<R>> => {
    const {
      auth = true,
      cors = true,
      withCredentials = true,
      service,
      headers,
      ...axiosConfig
    } = requestConfig
    const serviceUrl = services[service || defaultService]

    if (auth && !config.getAccessToken) {
      throw new NotConfiguredError('getAccessToken is not provided')
    }
    const accessToken = config.getAccessToken ? config.getAccessToken() : null

    return axios
      .request<R>({
        method,
        url: buildUrl(route, serviceUrl),
        withCredentials,
        headers: {
          ...buildHeaders({
            auth,
            cors,
            accessToken,
          }),
          ...headers,
        },
        ...axiosConfig,
      })
      .catch((error: AxiosError) => {
        if (onError) {
          onError(error)
        }
        handleRequestError(error)
      })
      .catch(
        handleTokenRefresh({
          requestTokenRefresh,
          getIsRefreshing,
          setIsRefreshing,
          pushToQueue,
          processQueue,
          rejectQueue,
        }),
      )
  }

  const upload = <D>(
    route: string,
    file: Blob,
    config: UploadConfig<S>,
  ): Promise<AxiosResponse<D>> => {
    const { method = 'POST', onUploadProgress, ...restConfig } = config

    const data = new FormData()
    data.append('file', file)

    return request(method)(route, {
      data,
      onUploadProgress: (progressEvent: { loaded: number; total: number }) => {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total,
        )
        if (config.onUploadProgress) {
          config.onUploadProgress(percentCompleted)
        }
      },
      ...restConfig,
    })
  }

  return {
    get: request('GET'),
    post: request('POST'),
    put: request('PUT'),
    delete: request('DELETE'),
    upload,
    requestTokenRefresh,
    config: (nextConfig: Partial<ClientConfig<S>>) => {
      Object.assign(config, nextConfig)
    },
  }
}
