import { AxiosError } from 'axios'

export class AuthorizationError extends Error {
  constructor() {
    super()
    this.name = 'AuthorizationError'
  }
}

export class AuthenticationError extends Error {
  axiosError: AxiosError

  constructor(axiosError: AxiosError) {
    super()
    this.axiosError = axiosError
    this.name = 'AuthenticationError'
  }
}

export class NotFoundError extends Error {
  constructor() {
    super()
    this.name = 'NotFoundError'
  }
}

export class BadRequestError extends Error {
  constructor(message: string) {
    super()
    this.name = 'BadRequest'
    this.message = message
  }
}

export class NoRefreshTokenProvidedError extends Error {
  constructor() {
    super()
    this.name = 'NoRefreshTokenProvided'
  }
}
