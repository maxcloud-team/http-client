import axios, { AxiosError } from 'axios'

import { Headers, BuildHeadersConfig, HandleTokenRefresh, Token } from './types'
import {
  AuthenticationError,
  BadRequestError,
  AuthorizationError,
  NotFoundError,
} from './errors'

export const isAuthenticationError = (error?: Error) =>
  error instanceof AuthenticationError
export const isAccessError = (error?: Error) =>
  error instanceof AuthorizationError
export const isNotFoundError = (error?: Error) => error instanceof NotFoundError
export const isBadRequestError = (error?: Error) =>
  error instanceof BadRequestError

export const buildUrl = (route: string, serviceUrl: string) =>
  `${serviceUrl}${route}`

export const buildAuthHeader = (accessToken: Token) => `Bearer ${accessToken}`

export const buildHeaders = ({
  auth,
  cors,
  accessToken,
}: BuildHeadersConfig) => {
  const headers: Headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  }

  if (cors) {
    headers.mode = 'cors'
  }

  if (auth && accessToken) {
    headers.Authorization = buildAuthHeader(accessToken)
  }

  return headers
}

export const handleTokenRefresh: HandleTokenRefresh = ({
  requestTokenRefresh,
  setIsRefreshing,
  getIsRefreshing,
  pushToQueue,
  processQueue,
  rejectQueue,
}) => async (error) => {
  if (error instanceof AuthenticationError) {
    const originalRequest = error.axiosError.config

    if (getIsRefreshing()) {
      try {
        const accessToken: Token = await new Promise((resolve, reject) => {
          pushToQueue({ resolve, reject })
        })
        if (accessToken) {
          originalRequest.headers['Authorization'] = buildAuthHeader(
            accessToken,
          )
        }
        return axios(originalRequest)
      } catch (err) {
        return err
      }
    }

    setIsRefreshing(true)

    return new Promise((resolve, reject) => {
      requestTokenRefresh()
        .then(({ accessToken }) => {
          if (accessToken) {
            originalRequest.headers['Authorization'] = buildAuthHeader(
              accessToken,
            )
          }
          processQueue(accessToken)
          resolve(axios(originalRequest))
        })
        .catch((error: Error) => {
          rejectQueue(error)
          reject(error)
        })
        .then(() => {
          setIsRefreshing(false)
        })
    })
  }

  return Promise.reject(error)
}

export const handleRequestError = (error: AxiosError) => {
  switch (error.response?.status) {
    case 400: {
      throw new BadRequestError(error.response?.data?.message || '')
    }
    case 401: {
      throw new AuthenticationError(error)
    }
    case 403: {
      throw new AuthorizationError()
    }
    case 404: {
      throw new NotFoundError()
    }
    default: {
      throw error
    }
  }
}
