export type Category = 'Apparel' | 'Footwear' | 'Accessories' | 'Gear'

export type SortOption = 'featured' | 'price-asc' | 'price-desc' | 'rating'

export interface Product {
  id: string
  name: string
  description: string
  price: number
  rating: number
  reviews: number
  stock: number
  category: Category
  collections: string[]
  image: string
  tags: string[]
}

export interface CartItem {
  product: Product
  quantity: number
}
