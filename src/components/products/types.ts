export interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  cost: number;
  stock: number;
  description?: string;
  customFields?: Record<string, string | number | boolean>;
}

export interface Branch {
  id: string;
  name: string;
}

export interface PlanLimits {
  maxProducts: number;
  maxBranches?: number;
  [key: string]: number | undefined;
}

export interface ProductsPageProps {
  // State
  products: Product[];
  loading: boolean;
  error: string;
  branches: Branch[];
  branchesLoading: boolean;
  selectedBranchId: string | null;
  canChangeBranch: boolean;
  search: string;
  showFilters: boolean;
  priceMin: string;
  priceMax: string;
  stockMin: string;
  stockMax: string;
  categoryFilter: string;
  currentPage: number;
  viewMode: 'grid' | 'table';
  sortField: string;
  sortDirection: 'asc' | 'desc';
  visibleColumns: string[];
  showColumnSelector: boolean;
  showAddForm: boolean;
  editProduct: Product | null;
  saving: boolean;
  clearMsg: string;
  qrCodeProductId: string | null;

  // Callbacks
  setSelectedBranchId: (id: string) => void;
  handleBranchChange: (id: string) => void;
  setSearch: (value: string) => void;
  setShowFilters: (show: boolean) => void;
  setPriceMin: (value: string) => void;
  setPriceMax: (value: string) => void;
  setStockMin: (value: string) => void;
  setStockMax: (value: string) => void;
  setCategoryFilter: (value: string) => void;
  setCurrentPage: (page: number) => void;
  setViewMode: (mode: 'grid' | 'table') => void;
  setSortField: (field: string) => void;
  setSortDirection: (direction: 'asc' | 'desc') => void;
  setVisibleColumns: (columns: string[]) => void;
  setShowColumnSelector: (show: boolean) => void;
  setShowAddForm: (show: boolean) => void;
  setEditProduct: (product: Product | null) => void;
  handleAddProduct: (e: React.FormEvent) => Promise<void>;
  handleEditProduct: (e: React.FormEvent) => Promise<void>;
  openEditModal: (product: Product) => void;
  handleDelete: (id: string) => Promise<void>;
  downloadTemplate: () => void;
  handleClearAll: () => Promise<void>;
  toggleColumnVisibility: (column: string) => void;
  handleSort: (field: string) => void;
  setQrCodeProductId: (id: string | null) => void;

  // Computed values
  filteredProducts: Product[];
  totalPages: number;
  startIndex: number;
  endIndex: number;
  currentProducts: Product[];
  allColumns: string[];
  usagePercentage: number;
  isNearLimit: boolean;

  // Permissions
  canViewProducts: boolean;
  canCreateProducts: boolean;
  canEditProducts: boolean;
  canDeleteProducts: boolean;

  // Plan limits
  canCreate: () => boolean;
  limits: PlanLimits;
  getUsagePercentage: () => number;
}
