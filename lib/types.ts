export interface User {
  id: number;
  telegram_id: number | null;
  username?: string;
  password?: string;
  first_name?: string;
  phone?: string;
  address?: string;
  approved: boolean;
  role_id: number;
  role?: { name: string };
  created_at: string;
}

export interface Product {
  id: number;
  name: string;
  description?: string;
  price: number;
  active: boolean;
  images?: ProductImage[];
  created_at: string;
}

export interface ProductImage {
  id: number;
  product_id: number;
  image_url: string;
  order_index: number;
}

export interface Order {
  id: number;
  user_id: number;
  user?: User;
  status: string;
  total?: number;
  completed: boolean;
  notes?: string;
  items?: OrderItem[];
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: number;
  order_id: number;
  product_id: number;
  product?: Product;
  quantity: number;
  price: number;
}

export interface Role {
  id: number;
  name: string;
  description?: string;
}

export interface DashboardStats {
  totalOrders: number;
  completedOrders: number;
  pendingOrders: number;
  totalUsers: number;
  totalSales: number;
}