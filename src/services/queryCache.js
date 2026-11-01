const CACHE_TTL_MS = 60_000
const STORAGE_PREFIX = 'gun_query_cache:'
const queryCache = new Map()
const pendingQueries = new Map()

const readCacheVersion = () => localStorage.getItem('guns_cache_version') || ''

const readStoredQuery = (key, version) => {
  try {
    const stored = JSON.parse(localStorage.getItem(`${STORAGE_PREFIX}${key}`) || 'null')
    if (
      stored &&
      stored.version === version &&
      Date.now() - stored.cachedAt < CACHE_TTL_MS
    ) {
      return stored.data
    }
    return null
  } catch (error) {
    console.warn('Could not read the cached product query.', error)
    return null
  }
}

export const fetchWithQueryCache = async (key, fetcher, { force = false } = {}) => {
  const version = readCacheVersion()
  const pendingKey = `${key}:${version}`
  const cached = queryCache.get(key)
  if (!force && cached && cached.version === version && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
    return cached.data
  }

  if (!force) {
    const storedData = readStoredQuery(key, version)
    if (storedData !== null) {
      queryCache.set(key, { data: storedData, cachedAt: Date.now(), version })
      return storedData
    }
  }

  if (!force && pendingQueries.has(pendingKey)) {
    return pendingQueries.get(pendingKey)
  }

  const request = Promise.resolve()
    .then(fetcher)
    .then((data) => {
      const cachedAt = Date.now()
      queryCache.set(key, { data, cachedAt, version })
      try {
        localStorage.setItem(
          `${STORAGE_PREFIX}${key}`,
          JSON.stringify({ data, cachedAt, version }),
        )
      } catch (error) {
        console.warn('Could not persist the product query cache.', error)
      }
      return data
    })
    .finally(() => {
      if (pendingQueries.get(pendingKey) === request) pendingQueries.delete(pendingKey)
    })

  pendingQueries.set(pendingKey, request)
  return request
}

export const invalidateQueryCache = () => {
  queryCache.clear()
  const version = `${Date.now()}-${Math.random()}`
  localStorage.setItem('guns_cache_version', version)

  for (let index = localStorage.length - 1; index >= 0; index -= 1) {
    const key = localStorage.key(index)
    if (key?.startsWith(STORAGE_PREFIX)) localStorage.removeItem(key)
  }
}
