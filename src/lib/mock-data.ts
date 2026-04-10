import type { Product, User } from "@/types/crm";

export const mockUsers: User[] = [
  { id: "1", name: "Rahul Sharma", email: "rahul@mcubespaces.com", role: "admin", isActive: true },
  { id: "2", name: "Priya Patel", email: "priya@mcubespaces.com", role: "sales", isActive: true },
  { id: "3", name: "Amit Kumar", email: "amit@mcubespaces.com", role: "store_manager", isActive: true },
  {
    id: "4",
    name: "Sneha Reddy",
    email: "sneha@mcubespaces.com",
    role: "furniture_specialist",
    isActive: true,
  },
  { id: "5", name: "Vikram Singh", email: "vikram@mcubespaces.com", role: "sales", isActive: false },
];

export const mockProducts: Product[] = [
  { id: "P001", name: "Oslo Sofa Set", sku: "MCB-OSL-001", category: "living_room", price: 125000, inStock: true },
  { id: "P002", name: "Nordic Bed Frame", sku: "MCB-NRD-002", category: "bedroom", price: 85000, inStock: true },
  { id: "P003", name: "Executive Desk Pro", sku: "MCB-EXC-003", category: "office", price: 45000, inStock: true },
  { id: "P004", name: "Garden Lounge Set", sku: "MCB-GRD-004", category: "outdoor", price: 95000, inStock: false },
  { id: "P005", name: "Modern Dining Table", sku: "MCB-MDN-005", category: "dining", price: 75000, inStock: true },
  { id: "P006", name: "Modular Wardrobe", sku: "MCB-MOD-006", category: "wardrobes", price: 150000, inStock: true },
  { id: "P007", name: "Crystal Chandelier", sku: "MCB-CRY-007", category: "lighting", price: 35000, inStock: true },
  { id: "P008", name: "Artisan Vase Collection", sku: "MCB-ART-008", category: "decor", price: 12000, inStock: true },
];
