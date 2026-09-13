/**
 * Who is signed in. The session middleware already worked this out for this
 * request, so there is nothing to fetch here.
 */
export default defineEventHandler((event) => {
  return event.context.session ?? null
})
