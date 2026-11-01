import { apiClient, IS_SUPABASE } from '../config/api'
import { fetchWithQueryCache, invalidateQueryCache } from './queryCache'

const readStoredImageLists = () =>
  JSON.parse(localStorage.getItem('gun_images') || '{}')

const saveStoredImageList = (id, images) => {
  const imageLists = readStoredImageLists()
  imageLists[id] = images
  localStorage.setItem('gun_images', JSON.stringify(imageLists))
}

// ---------------------------------------------------------------------------
// Normalizer — standardizes product shape whether received from Supabase
// (public.products) or from the university API (/api/v1/recipes).
// ---------------------------------------------------------------------------
export const normalizeProduct = (item) => {
  if (!item) return null

  // Resolve specifications from Supabase `specs` (text array) or API `ingredients`
  let specsList = []
  if (Array.isArray(item.specs)) {
    specsList = item.specs.map((s, idx) => {
      if (typeof s === 'string') {
        const colonIndex = s.indexOf(':')
        if (colonIndex > -1) {
          return {
            id: `spec-${idx}`,
            name: s.substring(0, colonIndex).trim(),
            quantity: s.substring(colonIndex + 1).trim(),
          }
        }
        return {
          id: `spec-${idx}`,
          name: 'Specification',
          quantity: s.trim(),
        }
      }
      return s
    })
  } else if (Array.isArray(item.ingredients)) {
    specsList = item.ingredients
  }

  // Resolve steps
  const stepsList =
    Array.isArray(item.steps) && item.steps.length > 0
      ? item.steps
      : ['Verify firearm is completely unloaded and point in safe direction.', 'Inspect receiver and mechanism for maintenance.']
  const primaryImage = item.image_url || item.image || '/guns/pistol.svg'
  const storedImages = item.id
    ? readStoredImageLists()[item.id]
    : undefined
  const images = Array.isArray(item.images) && item.images.length > 0
    ? item.images
    : Array.isArray(storedImages) && storedImages.length > 0
      ? storedImages
      : [primaryImage]

  return {
    ...item,
    id: item.id,
    name: item.name || 'Hardware Piece',
    type: item.type || item.category || 'Hardware',
    category: item.type || item.category || 'Hardware',
    caliber: item.caliber || 'Standard',
    price: Number(item.price ?? item.cook_time ?? 0),
    description: item.description || '',
    image_url: primaryImage,
    image: primaryImage,
    images: [...new Set([primaryImage, ...images].filter(Boolean))],
    ingredients: specsList,
    steps: stepsList,
  }
}

// ---------------------------------------------------------------------------
// GunService — wraps backend CRUD endpoints.
// Supports both Supabase PostgREST table (/rest/v1/products) and
// standard REST API (/api/v1/recipes).
// ---------------------------------------------------------------------------
class GunService {
  /**
   * Fetch a paginated, filterable list of products.
   */
  async getGuns(params = {}, options = {}) {
    const queryKey = `guns:${JSON.stringify(params, Object.keys(params).sort())}`
    return fetchWithQueryCache(queryKey, () => this.fetchGuns(params), options)
  }

  async fetchGuns(params = {}) {
    if (IS_SUPABASE) {
      const queryParts = ['select=*']

      if (params.search) {
        queryParts.push(`name=ilike.*${encodeURIComponent(params.search)}*`)
      }

      if (params.category && params.category !== 'All') {
        queryParts.push(`type=eq.${encodeURIComponent(params.category)}`)
      }

      if (params.sort_by) {
        const order = params.order === 'desc' ? 'desc' : 'asc'
        queryParts.push(`order=${encodeURIComponent(params.sort_by)}.${order}`)
      } else {
        queryParts.push('order=created_at.desc')
      }

      if (params.limit) {
        queryParts.push(`limit=${params.limit}`)
      }

      const queryString = queryParts.join('&')
      const data = await apiClient.get(`/rest/v1/products?${queryString}`)
      const list = Array.isArray(data) ? data.map(normalizeProduct) : []

      return {
        success: true,
        data: list,
        pagination: {
          total: list.length,
          page: params.page || 1,
          limit: params.limit || 50,
        },
      }
    }

    // Fallback: university REST API
    const clean = Object.fromEntries(
      Object.entries(params).filter(([, v]) => v !== '' && v != null),
    )
    return apiClient.get('/api/v1/recipes', { params: clean })
  }

  /**
   * Fetch a single product by ID.
   */
  async getGunById(id) {
    return fetchWithQueryCache(`gun:${id}`, async () => {
      if (IS_SUPABASE) {
        const data = await apiClient.get(`/rest/v1/products?id=eq.${id}&select=*`)
        if (Array.isArray(data) && data.length > 0) {
          return { success: true, data: normalizeProduct(data[0]) }
        }
        throw new Error('Hardware item not found.')
      }
      const response = await apiClient.get(`/api/v1/recipes/${id}`)
      if (response?.data) {
        return { ...response, data: normalizeProduct(response.data) }
      }
      return response
    })
  }

  /**
   * Create a new product.
   */
  async createGun(data) {
    if (IS_SUPABASE) {
      const specsArray = Array.isArray(data.ingredients)
        ? data.ingredients.map((i) => `${i.name}: ${i.quantity}`)
        : Array.isArray(data.specs)
        ? data.specs
        : []

      const payload = {
        name: data.name,
        type: data.type || (data.category === 'minuman' ? 'Rifle' : 'Pistol'),
        caliber: data.caliber || '9mm',
        price: Number(data.price ?? data.cook_time ?? 0),
        description: data.description || '',
        specs: specsArray,
        image_url: data.image_url || null,
      }
      if (!IS_SUPABASE && Array.isArray(data.images)) payload.images = data.images

      const res = await apiClient.post('/rest/v1/products', payload, {
        headers: { Prefer: 'return=representation' },
      })
      const created = Array.isArray(res) ? res[0] : res
      if (created?.id && Array.isArray(data.images)) {
        saveStoredImageList(created.id, data.images)
      }
      invalidateQueryCache()
      return { success: true, data: normalizeProduct(created) }
    }
    const response = await apiClient.post('/api/v1/recipes', data)
    const created = response.data || response
    if (created?.id && Array.isArray(data.images)) {
      saveStoredImageList(created.id, data.images)
    }
    invalidateQueryCache()
    return response
  }

  /**
   * Update existing product.
   */
  async updateGun(id, data) {
    if (IS_SUPABASE) {
      const specsArray = Array.isArray(data.ingredients)
        ? data.ingredients.map((i) => `${i.name}: ${i.quantity}`)
        : Array.isArray(data.specs)
        ? data.specs
        : undefined

      const payload = {
        updated_at: new Date().toISOString(),
      }
      if (data.name !== undefined) payload.name = data.name
      if (data.type !== undefined) payload.type = data.type
      if (data.caliber !== undefined) payload.caliber = data.caliber
      if (data.price !== undefined || data.cook_time !== undefined) {
        payload.price = Number(data.price ?? data.cook_time ?? 0)
      }
      if (data.description !== undefined) payload.description = data.description
      if (specsArray !== undefined) payload.specs = specsArray
      if (data.image_url !== undefined) payload.image_url = data.image_url
      if (!IS_SUPABASE && Array.isArray(data.images)) payload.images = data.images

      const res = await apiClient.patch(`/rest/v1/products?id=eq.${id}`, payload, {
        headers: { Prefer: 'return=representation' },
      })
      const updated = Array.isArray(res) ? res[0] : res
      if (Array.isArray(data.images)) saveStoredImageList(id, data.images)
      invalidateQueryCache()
      return { success: true, data: normalizeProduct(updated) }
    }
    const response = await apiClient.put(`/api/v1/recipes/${id}`, data)
    if (Array.isArray(data.images)) saveStoredImageList(id, data.images)
    invalidateQueryCache()
    return response
  }

  /**
   * Partial update (PATCH).
   */
  async patchGun(id, data) {
    if (IS_SUPABASE) {
      return this.updateGun(id, data)
    }
    return apiClient.patch(`/api/v1/recipes/${id}`, data)
  }

  async deleteGun(gunOrId) {
    const isObject = typeof gunOrId === 'object' && gunOrId !== null
    const id = isObject ? gunOrId.id : gunOrId
    if (id == null) throw new Error('A product ID is required to archive it.')

    const gunData = isObject ? gunOrId : { id, name: 'Archived Hardware' }
    const archiveDetails = JSON.parse(localStorage.getItem('archived_guns_detail') || '[]')
    if (!archiveDetails.some((item) => String(item.id) === String(id))) {
      archiveDetails.push({ ...gunData, archivedAt: new Date().toISOString() })
    }
    localStorage.setItem('archived_guns_detail', JSON.stringify(archiveDetails))

    const archives = JSON.parse(localStorage.getItem('archived_guns') || '[]')
    if (!archives.some((item) => String(item?.id ?? item) === String(id))) {
      archives.push(id)
    }
    localStorage.setItem('archived_guns', JSON.stringify(archives))
    invalidateQueryCache()
    return { success: true }
  }

  async restoreGun(id) {
    const archives = JSON.parse(localStorage.getItem('archived_guns') || '[]')
    const remaining = archives.filter((item) => String(item?.id ?? item) !== String(id))
    localStorage.setItem('archived_guns', JSON.stringify(remaining))

    const archiveDetails = JSON.parse(localStorage.getItem('archived_guns_detail') || '[]')
    localStorage.setItem(
      'archived_guns_detail',
      JSON.stringify(archiveDetails.filter((item) => String(item.id) !== String(id))),
    )
    invalidateQueryCache()
    return { success: true }
  }

  async permanentlyDeleteGun(id) {
    if (id == null) throw new Error('A product ID is required to delete it.')

    if (!String(id).startsWith('local-')) {
      if (IS_SUPABASE) {
        await apiClient.delete(`/rest/v1/products?id=eq.${encodeURIComponent(id)}`)
      } else {
        await apiClient.delete(`/api/v1/recipes/${encodeURIComponent(id)}`)
      }
    } else {
      const deleted = JSON.parse(localStorage.getItem('permanently_deleted_guns') || '[]')
      if (!deleted.includes(id)) {
        deleted.push(id)
        localStorage.setItem('permanently_deleted_guns', JSON.stringify(deleted))
      }
    }

    const archives = JSON.parse(localStorage.getItem('archived_guns') || '[]')
    localStorage.setItem(
      'archived_guns',
      JSON.stringify(archives.filter((item) => String(item?.id ?? item) !== String(id))),
    )
    const archiveDetails = JSON.parse(localStorage.getItem('archived_guns_detail') || '[]')
    localStorage.setItem(
      'archived_guns_detail',
      JSON.stringify(archiveDetails.filter((item) => String(item.id) !== String(id))),
    )
    const imageLists = readStoredImageLists()
    delete imageLists[id]
    localStorage.setItem('gun_images', JSON.stringify(imageLists))
    invalidateQueryCache()
    return { success: true }
  }
}

export default new GunService()
