import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Profile = {
  id: string
  email: string
  full_name: string
  phone: string
  role: 'buyer' | 'seller' | 'broker' | 'builder'
  avatar_url?: string
  created_at: string
}

export type Property = {
  id: string
  seller_id: string
  title: string
  description: string
  type: 'buy' | 'rent' | 'commercial'
  sub_type: 'flat' | 'plot' | 'house' | 'sco' | 'office' | 'warehouse' | 'coworking' | 'builder_floor'
  price: number
  area_sqft: number
  bedrooms?: number
  bathrooms?: number
  location: string
  city: string
  sector?: string
  lat?: number
  lng?: number
  photos: string[]
  amenities: string[]
  status: 'active' | 'sold' | 'rented' | 'paused'
  is_featured: boolean
  contact_name: string
  contact_phone: string
  created_at: string
}

export type SavedProperty = {
  id: string
  user_id: string
  property_id: string
  created_at: string
  property?: Property
}

export type Conversation = {
  id: string
  user_id: string
  title: string
  messages: { role: string; content: string }[]
  created_at: string
}

export type Inquiry = {
  id: string
  from_user_id: string
  property_id: string
  message: string
  status: 'new' | 'read' | 'replied'
  created_at: string
}