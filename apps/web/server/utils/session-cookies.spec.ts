import { createEvent } from 'h3'
import { IncomingMessage, ServerResponse } from 'node:http'
import { Socket } from 'node:net'
import { describe, expect, it } from 'vitest'
import { clearSessionCookies, setSessionCookies } from './session-cookies'

/**
 * A real h3 event over real Node request/response objects: hand-rolled fakes
 * miss methods the cookie helpers call and fail for the wrong reason.
 */
function fakeEvent() {
  const req = new IncomingMessage(new Socket())
  const res = new ServerResponse(req)
  return { event: createEvent(req, res), res }
}

function cookie(res: ServerResponse, name: string): string {
  const raw = res.getHeader('set-cookie')
  const headers = Array.isArray(raw) ? raw : raw ? [String(raw)] : []
  const found = headers.find((header) => header.startsWith(`${name}=`))

  if (!found) throw new Error(`No ${name} cookie was set`)
  return found
}

describe('session cookies', () => {
  it('keeps both tokens out of reach of browser JavaScript', () => {
    const { event, res } = fakeEvent()

    setSessionCookies(event, {
      accessToken: 'access-value',
      refreshToken: 'refresh-value',
    })

    // HttpOnly is the whole reason tokens live in cookies rather than in
    // localStorage: a stray script on the page must not be able to read them.
    expect(cookie(res, 'access')).toMatch(/HttpOnly/i)
    expect(cookie(res, 'refresh')).toMatch(/HttpOnly/i)
  })

  it('sends both cookies on ordinary page requests', () => {
    const { event, res } = fakeEvent()

    setSessionCookies(event, {
      accessToken: 'access-value',
      refreshToken: 'refresh-value',
    })

    // Narrowing the refresh cookie's path looks tidy and breaks renewal during
    // server rendering: the browser would not send it with a request for '/'.
    expect(cookie(res, 'refresh')).toMatch(/Path=\/(;|$)/i)
    expect(cookie(res, 'access')).toMatch(/Path=\/(;|$)/i)
  })

  it('does not attach the session to requests from other sites', () => {
    const { event, res } = fakeEvent()

    setSessionCookies(event, {
      accessToken: 'access-value',
      refreshToken: 'refresh-value',
    })

    // Lax, not Strict: Strict would show the shop signed out to anyone
    // arriving from a link in a message.
    expect(cookie(res, 'access')).toMatch(/SameSite=Lax/i)
  })

  it('outlives the browser session only as long as the tokens do', () => {
    const { event, res } = fakeEvent()

    setSessionCookies(event, {
      accessToken: 'access-value',
      refreshToken: 'refresh-value',
    })

    expect(cookie(res, 'access')).toMatch(/Max-Age=900(;|$)/i)
    expect(cookie(res, 'refresh')).toMatch(/Max-Age=2592000(;|$)/i)
  })

  it('wipes both cookies on sign-out', () => {
    const { event, res } = fakeEvent()

    clearSessionCookies(event)

    expect(cookie(res, 'access')).toMatch(/Max-Age=0/i)
    expect(cookie(res, 'refresh')).toMatch(/Max-Age=0/i)
  })
})
