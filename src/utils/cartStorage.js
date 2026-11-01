const CART_STORAGE_KEY = 'cart'

export const addToCart = (gun) => {
  const cart = JSON.parse(localStorage.getItem(CART_STORAGE_KEY) || '[]')
  const updatedCart = [...cart, gun]
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(updatedCart))
  window.dispatchEvent(new Event('storage'))
  return updatedCart
}
