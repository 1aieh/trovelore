"use client";

import { useEffect, useId, useState, useCallback } from "react";
import {
  ColumnDef,
  flexRender,
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  PaginationState,
  VisibilityState,
  ColumnFiltersState
} from "@tanstack/react-table";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  EllipsisIcon,
  CheckIcon,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Define the type for each order row that the table will display.
import { OrderItem, OrderRow, Order } from "@/types";

// Add a custom event for Shopify sync completion
const SHOPIFY_SYNC_COMPLETE_EVENT = "shopify-sync-complete";

interface OrderDetailsSheetProps {
  order: OrderRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function OrderDetailsSheet({ order, open, onOpenChange }: OrderDetailsSheetProps) {
  if (!order) return null;

  const productsData = (() => {
    try {
      const data = typeof order.products === "string" 
        ? JSON.parse(order.products) 
        : order.products;

      console.log('Raw Products Data:', data);
      console.log('Raw Products String:', order.products); // Debug raw string
      
      if (!Array.isArray(data)) {
        console.error('Products data is not an array:', data);
        return [];
      }
      
      // Map the line items to a consistent format
      return data.map((item: any) => ({
        title: item.title || item.name || item.product_title,
        variant_title: item.variant_title || item.variant_name,
        quantity: item.quantity,
        image_src: item.image?.src || item.featured_image?.src || item.product_image || item.images?.[0]?.src,
        sku: item.sku || item.variant_sku,
        price: item.price || item.variant_price
      }));
    } catch (error) {
      console.error('Error parsing products data:', error);
      return [];
    }
  })();
  
  console.log('Processed Products Data:', productsData); // Debug log

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-3xl overflow-y-auto p-8">
        <SheetHeader className="space-y-2 mb-8">
          <SheetTitle className="text-3xl font-bold">Order Details</SheetTitle>
          <SheetDescription className="text-lg">
            Reference: <span className="font-medium">{order.order_ref}</span>
          </SheetDescription>
        </SheetHeader>
        
        {/* Order Status Section */}
        <div className="space-y-8">
          <div className="space-y-4">
            <h3 className="text-xl font-semibold tracking-tight">Status Information</h3>
            <div className="grid grid-cols-2 gap-6 bg-muted/50 rounded-lg p-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Order Date</label>
                <p className="mt-1.5 text-base">{new Date(order.order_date).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "long",
                  year: "numeric"
                })}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Shipping Status</label>
                <p className="mt-1.5 text-base">{order.ship_status}</p>
              </div>
            </div>
          </div>
          
          <Separator />
          
          {/* Buyer Information */}
          <div className="space-y-2">
            <h3 className="text-xl font-semibold tracking-tight">Buyer Information</h3>
            <div className="grid grid-cols-2 gap-6 bg-muted/50 rounded-lg p-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Buyer Name</label>
                <p className="mt-1.5 text-base font-medium">{order.buyer}</p>
              </div>
            </div>
          </div>
          
          <Separator />
          
          {/* Products Section */}
          <div className="space-y-2">
            <h3 className="text-xl font-semibold tracking-tight">Products</h3>
            <div className="space-y-3">
              {Array.isArray(productsData) && productsData.map((product: any, index: number) => (
                <div key={index} className="bg-muted p-4 rounded-lg hover:bg-muted/70 transition-colors">
                  <div className="grid grid-cols-[1fr,auto] gap-6">
                    <div className="flex gap-4 items-start">
                      <div className="h-16 w-16 rounded-md overflow-hidden flex-shrink-0 bg-muted/30">
                        {product.image_src ? (
                          <div className="h-full w-full relative">
                            <div className="absolute inset-0 animate-pulse bg-muted" />
                            <img
                              src={product.image_src}
                              alt={product.title}
                              className="h-full w-full object-cover relative z-10 transition-opacity duration-200"
                              onLoad={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.opacity = '1';
                              }}
                              style={{ opacity: '0' }}
                            />
                          </div>
                        ) : (
                          <div className="h-full w-full flex items-center justify-center bg-muted">
                            <span className="text-xs text-muted-foreground">No image</span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex flex-col min-w-0">
                          <label className="text-sm font-medium text-muted-foreground">Product Name</label>
                          <p className="mt-1.5 text-base truncate">{product.title || product.name}</p>
                          {product.variant_title && (
                            <p className="text-sm text-muted-foreground mt-0.5">{product.variant_title}</p>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Quantity</label>
                        <p className="mt-1.5 text-base">{product.quantity}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Price</label>
                        <p className="mt-1.5 text-base font-medium">
                          ${typeof product.price === 'string' 
                            ? parseFloat(product.price).toFixed(2)
                            : product.price.toFixed(2)
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <Separator />
          
          {/* Financial Information */}
          <div className="space-y-2">
            <h3 className="text-xl font-semibold tracking-tight">Financial Details</h3>
            <div className="grid grid-cols-2 gap-6 bg-muted/50 rounded-lg p-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Total to Pay</label>
                <p className="mt-1.5 text-lg font-semibold">
                  ${order.total_topay.toFixed(2)}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Payment Status</label>
                <p className="mt-1.5 text-base">{order.payment_status}</p>
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default function OrdersTable({ data: initialData = [] }: { data?: OrderRow[] }) {
  const [selectedOrder, setSelectedOrder] = useState<OrderRow | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const id = useId();
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [sorting, setSorting] = useState<SortingState>([
    { id: "order_date", desc: true },
  ]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [data, setData] = useState<OrderRow[]>(initialData);
  const [loading, setLoading] = useState(initialData.length === 0);
  // Add a refresh trigger
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  // Add data cache for pagination
  const [dataCache, setDataCache] = useState<Map<string, { data: OrderRow[]; pageCount: number }>>(new Map());
  // Add local search term state for debouncing
  const [localSearchTerm, setLocalSearchTerm] = useState('');

  // Track total pages for server-side pagination
  const [pageCount, setPageCount] = useState(0);

  // Function to generate cache key based on current state
  const getCacheKey = () => {
    return JSON.stringify({
      pageIndex: pagination.pageIndex,
      pageSize: pagination.pageSize,
      sorting: sorting,
      columnFilters: columnFilters,
    });
  };

  const columns: ColumnDef<OrderRow>[] = [
  {
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-4"
          disabled={loading}
        >
          Order Ref
          {column.getIsSorted() && (
            <span className="ml-2">
              {column.getIsSorted() === "asc" ? "↑" : "↓"}
            </span>
          )}
        </Button>
      )
    },
    accessorKey: "order_ref",
    size: 120,
  },
  {
    id: "order_date",
    accessorKey: "order_date",
    sortingFn: (rowA, rowB, columnId) => {
      const a = new Date(rowA.getValue(columnId) as string).getTime();
      const b = new Date(rowB.getValue(columnId) as string).getTime();
      return a < b ? -1 : a > b ? 1 : 0;
    },
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-4"
          disabled={loading}
        >
          Order Date
          {column.getIsSorted() && (
            <span className="ml-2">
              {column.getIsSorted() === "asc" ? "↑" : "↓"}
            </span>
          )}
        </Button>
      )
    },
    cell: ({ getValue }) => {
      const dateStr = getValue() as string;
      if (!dateStr) return <span></span>;

      try {
        const date = new Date(dateStr);
        return (
          <span>
            {date.toLocaleDateString("en-GB", {
              day: "numeric",
              month: "long",
              year: "2-digit",
            })}
          </span>
        );
      } catch (error) {
        return <span></span>;
      }
    },
    size: 120,
  },
  {
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-4"
          disabled={loading}
        >
          Buyer
          {column.getIsSorted() && (
            <span className="ml-2">
              {column.getIsSorted() === "asc" ? "↑" : "↓"}
            </span>
          )}
        </Button>
      )
    },
    accessorKey: "buyer",
    size: 180,
  },
  {
    header: "Ship Status",
    accessorKey: "ship_status",
    size: 120,
  },
  {
    header: "Products",
    accessorKey: "products",
    cell: ({ row }) => {
      const productsData = row.original.products;
      let firstProduct = null;
      try {
        const parsed = typeof productsData === "string" ? JSON.parse(productsData) : productsData;
        if (Array.isArray(parsed) && parsed.length > 0) {
          firstProduct = parsed[0];
        }
      } catch (error) {
        console.error('Error parsing product data:', error);
      }

      if (!firstProduct) return <span>No products</span>;

      const handleClick = () => {
        setSelectedOrder(row.original);
        setIsSheetOpen(true);
      };

      return (
        <button
          onClick={handleClick}
          className="group flex items-center gap-3 hover:text-primary transition-colors w-full text-left cursor-pointer relative hover:bg-muted/50 p-1 rounded-md"
          title="Click to view order details"
          aria-label="View order details"
        >
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="h-10 w-10 rounded-md overflow-hidden flex-shrink-0 bg-muted/30 group-hover:ring-2 ring-primary transition-all hover:shadow-md">
                {firstProduct.image_src ? (
                  <div className="h-full w-full relative">
                    <div className="absolute inset-0 animate-pulse bg-muted" />
                    <img
                      src={firstProduct.image_src}
                      alt={firstProduct.title}
                      className="h-full w-full object-cover relative z-10 transition-opacity duration-200"
                      onLoad={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.opacity = '1';
                      }}
                      style={{ opacity: '0' }}
                    />
                  </div>
                ) : (
                  <div className="h-full w-full flex items-center justify-center bg-muted">
                    <span className="text-xs text-muted-foreground">No image</span>
                  </div>
                )}
              </div>
              {(() => {
                try {
                  const parsed = typeof productsData === "string" ? JSON.parse(productsData) : productsData;
                  if (Array.isArray(parsed) && parsed.length > 1) {
                    return (
                      <div className="absolute -top-1 -right-1 bg-primary text-primary-foreground rounded-full w-4 h-4 text-[10px] flex items-center justify-center font-medium ring-2 ring-background">
                        {parsed.length}
                      </div>
                    );
                  }
                  return null;
                } catch (error) {
                  return null;
                }
              })()}
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="truncate group-hover:underline decoration-primary/30 underline-offset-2">
                {(firstProduct.title || firstProduct.name || '').split(' brooch pin')[0]}
              </span>
              {(() => {
                try {
                  const parsed = typeof productsData === "string" ? JSON.parse(productsData) : productsData;
                  if (Array.isArray(parsed) && parsed.length > 1) {
                    return (
                      <span className="text-xs text-muted-foreground mt-0.5">
                        +{parsed.length - 1} more {parsed.length === 2 ? 'item' : 'items'}
                      </span>
                    );
                  }
                  return null;
                } catch (error) {
                  return null;
                }
              })()}
            </div>
          </div>
        </button>
      );
    },
    size: 300,
  },
  {
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-4"
          disabled={loading}
        >
          Total To Pay
          {column.getIsSorted() && (
            <span className="ml-2">
              {column.getIsSorted() === "asc" ? "↑" : "↓"}
            </span>
          )}
        </Button>
      )
    },
    accessorKey: "total_topay",
    cell: ({ row }) => {
      const value = row.getValue("total_topay") as number;
      return `$${value.toFixed(2)}`;
    },
    size: 120,
  },
  {
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-4"
          disabled={loading}
        >
          Payment Status
          {column.getIsSorted() && (
            <span className="ml-2">
              {column.getIsSorted() === "asc" ? "↑" : "↓"}
            </span>
          )}
        </Button>
      )
    },
    accessorKey: "payment_status",
    size: 140,
  },
  {
    id: "actions",
    header: () => <span className="sr-only">Actions</span>,
    cell: ({ row }) => <RowActions row={row} onViewDetails={handleViewDetails} />,
    size: 60,
    enableHiding: false,
  },
];

function RowActions({ row, onViewDetails }: { row: { original: OrderRow }, onViewDetails: (order: OrderRow) => void }) {
  const handleViewDetails = () => {
    onViewDetails(row.original);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="icon" variant="ghost" aria-label="Actions">
          <EllipsisIcon size={16} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={handleViewDetails}>
            <span>View Details</span>
            <DropdownMenuShortcut>⌘V</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <span>Edit</span>
            <DropdownMenuShortcut>⌘E</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <span>Duplicate</span>
            <DropdownMenuShortcut>⌘D</DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem className="text-destructive">
            <span>Delete</span>
            <DropdownMenuShortcut>⌘⌫</DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

  const table = useReactTable({
    data,
    columns,
    pageCount, // Add total pages count
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    manualPagination: true, // Enable manual pagination
    state: { sorting, pagination, columnFilters, columnVisibility },
  });

    // Handlers for sheet
    const handleViewDetails = useCallback((order: OrderRow) => {
      setSelectedOrder(order);
      setIsSheetOpen(true);
    }, []);

    // Function to prefetch next page data
    const prefetchNextPage = async (currentCacheKey: string) => {
    const nextPageIndex = pagination.pageIndex + 1;
    if (nextPageIndex >= pageCount) return;

    const nextCacheKey = JSON.stringify({
      pageIndex: nextPageIndex,
      pageSize: pagination.pageSize,
      sorting: sorting,
      columnFilters: columnFilters,
    });

    if (dataCache.has(nextCacheKey)) return;

    try {
      const params = new URLSearchParams({
        page: (nextPageIndex + 1).toString(),
        pageSize: pagination.pageSize.toString(),
        orderBy: sorting[0]?.id || "order_date",
        order: sorting[0]?.desc ? "desc" : "asc",
      });

      columnFilters.forEach((filter) => {
        if (filter.value) {
          if (filter.id === "order_ref") {
            params.set("search", filter.value as string);
          } else {
            params.set(filter.id, filter.value as string);
          }
        }
      });

      const response = await fetch(`/api/orders?${params}`);
      if (!response.ok) return;

      const result = await response.json();
      const rawOrders: OrderRow[] = (result.data || []).map((order: Order) => ({
        id: order.id?.toString() || '',
        order_ref: order.order_ref || '',
        order_date: order.order_date || '',
        buyer: order.buyer || '',
        ship_status: order.ship_status || '',
        products: order.products || '[]',
        total_topay: order.total_topay || 0,
        payment_status: order.payment_status || '',
      }));

      setDataCache((prevCache) => {
        const newCache = new Map(prevCache);
        newCache.set(nextCacheKey, { data: rawOrders, pageCount: result.pagination.totalPages });
        return newCache;
      });
    } catch (err) {
      console.error("Failed to prefetch next page:", err);
    }
  };

  // Debounce effect for search term changes
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    const handleSearchChange = () => {
      timeoutId = setTimeout(() => {
        if (localSearchTerm) {
          setPagination(prev => ({ ...prev, pageIndex: 0 }));
          setSorting([{ id: "order_date", desc: true }]);
          setColumnFilters([{ id: "order_ref", value: localSearchTerm }]);
        } else {
          setColumnFilters([]);
        }
      }, 500);
    };

    handleSearchChange();

    return () => {
      clearTimeout(timeoutId);
    };
  }, [localSearchTerm]);

  // Fetch data from API with caching and prefetching
  useEffect(() => {
    let isMounted = true;

    async function fetchOrders() {
      try {
        const cacheKey = getCacheKey();
        const cachedData = dataCache.get(cacheKey);

        if (cachedData) {
          setData(cachedData.data);
          setPageCount(cachedData.pageCount);
          setLoading(false);
          
          // Prefetch next page after current data is loaded
          await prefetchNextPage(cacheKey);
        } else {
          console.log("OrdersTable: Fetching orders...");
          setLoading(true);

          const params = new URLSearchParams({
            page: (pagination.pageIndex + 1).toString(),
            pageSize: pagination.pageSize.toString(),
            orderBy: sorting[0]?.id || "order_date",
            order: sorting[0]?.desc ? "desc" : "asc",
          });

          columnFilters.forEach((filter) => {
            if (filter.value) {
              if (filter.id === "order_ref") {
                params.set("search", filter.value as string);
              } else {
                params.set(filter.id, filter.value as string);
              }
            }
          });

          const response = await fetch(`/api/orders?${params}`);

          if (!response.ok) {
            console.error(`HTTP error! status: ${response.status}`);
            setData([]);
            setPageCount(0);
            return;
          }

          const result = await response.json();
          console.log(`OrdersTable: Fetched ${result.data?.length || 0} orders`);
          console.log("Pagination info:", result.pagination);

          if (!isMounted) return;

          const rawOrders: OrderRow[] = (result.data || []).map((order: Order) => ({
            id: order.id?.toString() || '',
            order_ref: order.order_ref || '',
            order_date: order.order_date || '',
            buyer: order.buyer || '',
            ship_status: order.ship_status || '',
            products: order.products || '[]',
            total_topay: order.total_topay || 0,
            payment_status: order.payment_status || '',
          }));

          setDataCache((prevCache) => {
            const newCache = new Map(prevCache);
            newCache.set(cacheKey, { data: rawOrders, pageCount: result.pagination.totalPages });
            return newCache;
          });

          setData(rawOrders);
          setPageCount(result.pagination.totalPages);

          // Prefetch next page after current data is loaded
          await prefetchNextPage(cacheKey);
        }
      } catch (err) {
        console.error("Failed to fetch orders:", err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchOrders();

    return () => {
      isMounted = false;
    };
  }, [pagination, sorting, columnFilters, refreshTrigger, dataCache, prefetchNextPage, getCacheKey]);

  // Listen for Shopify sync completion event
  useEffect(() => {
    const handleSyncComplete = () => {
      console.log("OrdersTable: Detected Shopify sync completion, refreshing data...");
      setRefreshTrigger(prev => prev + 1);
    };
    
    window.addEventListener(SHOPIFY_SYNC_COMPLETE_EVENT, handleSyncComplete);
    
    return () => {
      window.removeEventListener(SHOPIFY_SYNC_COMPLETE_EVENT, handleSyncComplete);
    };
  }, []);

  // Show loading overlay for initial load
  if (loading && !data.length) {
    return <div className="text-center py-8">Loading orders...</div>;
  }

  // Show loading indicator in the table footer during updates
  const loadingIndicator = loading && data.length ? (
    <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
      <div className="text-sm text-muted-foreground">Updating...</div>
    </div>
  ) : null;

  return (
    <>
    <div className="space-y-4 relative">
      {/* Filtering Section */}
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search orders (Order Ref, Buyer)..."
            value={localSearchTerm}
            disabled={loading}
            onChange={(e) => setLocalSearchTerm(e.target.value)}
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="ml-auto" disabled={loading}>
              Filter {columnFilters.length > 0 && (
                <span className="ml-2 rounded-full bg-primary w-5 h-5 text-xs flex items-center justify-center text-primary-foreground">
                  {columnFilters.length}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[200px]">
            <DropdownMenuGroup>
              <DropdownMenuItem 
                onClick={() => {
                  setPagination(prev => ({ ...prev, pageIndex: 0 }));
                  setSorting([{ id: "order_date", desc: true }]);
                  setColumnFilters([{ id: "ship_status", value: "Pending" }]);
                }}
                className="flex items-center justify-between"
              >
                <span>Pending Orders</span>
                {columnFilters[0]?.id === "ship_status" && columnFilters[0]?.value === "Pending" && (
                  <CheckIcon className="h-4 w-4" />
                )}
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => {
                  setPagination(prev => ({ ...prev, pageIndex: 0 }));
                  setSorting([{ id: "order_date", desc: true }]);
                  setColumnFilters([{ id: "ship_status", value: "Shipped" }]);
                }}
                className="flex items-center justify-between"
              >
                <span>Shipped Orders</span>
                {columnFilters[0]?.id === "ship_status" && columnFilters[0]?.value === "Shipped" && (
                  <CheckIcon className="h-4 w-4" />
                )}
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => {
                  setPagination(prev => ({ ...prev, pageIndex: 0 }));
                  setSorting([{ id: "order_date", desc: true }]);
                  setColumnFilters([{ id: "payment_status", value: "No Payment" }]);
                }}
                className="flex items-center justify-between"
              >
                <span>Unpaid Orders</span>
                {columnFilters[0]?.id === "payment_status" && columnFilters[0]?.value === "No Payment" && (
                  <CheckIcon className="h-4 w-4" />
                )}
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => {
                  setPagination(prev => ({ ...prev, pageIndex: 0 }));
                  setSorting([{ id: "order_date", desc: true }]);
                  setColumnFilters([]);
                }}
              className="text-destructive"
            >
              Clear Filters
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Table */}
      <div className="bg-background overflow-hidden rounded-md border relative">
        {loadingIndicator}
        <Table className="table-fixed">
          <TableHeader>
            {table.getHeaderGroups().map(headerGroup => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <TableHead key={header.id} style={{ width: `${header.getSize()}px` }}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map(row => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map(cell => (
                <TableCell key={cell.id}>
                  {cell.column.id === 'actions' 
                    ? flexRender(cell.column.columnDef.cell, { ...cell.getContext(), row: { ...cell.getContext().row, onViewDetails: handleViewDetails } })
                    : flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length + 1} className="text-center">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="text-sm text-muted-foreground">
            {table.getState().pagination.pageIndex + 1} of{" "}
            {table.getPageCount()} pages
          </div>
          <select
            value={table.getState().pagination.pageSize}
            onChange={e => {
              setPagination({ pageIndex: 0, pageSize: Number(e.target.value) });
            }}
            className="h-8 w-[70px] rounded-md border border-input bg-background px-2 py-1 text-sm"
            disabled={loading}
          >
            {[10, 20, 30, 40, 50].map(pageSize => (
              <option key={pageSize} value={pageSize}>
                {pageSize}
              </option>
            ))}
          </select>
          <span className="text-sm text-muted-foreground">per page</span>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
            aria-label="Previous page"
          >
            <ChevronLeftIcon size={16} />
          </Button>
          <span className="text-sm">
            Page {table.getState().pagination.pageIndex + 1}
          </span>
          <Button
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
            aria-label="Next page"
          >
            <ChevronRightIcon size={16} />
          </Button>
        </div>
      </div>
    </div>
    
    {/* Order Details Sheet */}
    <OrderDetailsSheet
      order={selectedOrder}
      open={isSheetOpen}
      onOpenChange={setIsSheetOpen}
    />
    </>
  );
}
