// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: ['@nuxt/ui', '@pinia/nuxt'],
  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    apiUrl: '',
    // Proves to the API that a request really came from this app, so it can
    // trust the visitor's address we forward with it.
    internalRequestSecret: '',
    public: {
      siteUrl: '',
    },
  },
  routeRules: {
    '/admin/**': { ssr: false },
  },
})
