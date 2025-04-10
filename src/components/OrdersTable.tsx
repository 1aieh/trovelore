"use client";

import { useEffect, useId, useState } from "react";
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

export default function OrdersTable({ data: initialData = [] }: { data?: OrderRow[] }) {
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

  // Track total pages for server-side pagination
  const [pageCount, setPageCount] = useState(0);

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
    accessorKey: "order_date",
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
      let productName = "";
      try {
        // Parse the JSON string; if already an array, use it directly.
        const parsed = typeof productsData === "string" ? JSON.parse(productsData) : productsData;
        if (Array.isArray(parsed) && parsed.length > 0) {
          productName = parsed[0].title || "";
        }
      } catch (error) {
        productName = "";
      }
      return <span>{productName}</span>;
    },
    size: 200,
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
    cell: ({ row }) => `$${row.getValue("total_topay")}`,
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
    cell: ({ row }) => <RowActions row={row} />,
    size: 60,
    enableHiding: false,
  },
];

function RowActions({ row }: { row: { original: OrderRow } }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="icon" variant="ghost" aria-label="Actions">
          <EllipsisIcon size={16} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuGroup>
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

  // Fetch data from API
  useEffect(() => {
    let isMounted = true;
    
    async function fetchOrders() {
      try {
        console.log("OrdersTable: Fetching orders...");
        setLoading(true);

          // Build query parameters
        const params = new URLSearchParams({
          page: (pagination.pageIndex + 1).toString(),
          pageSize: pagination.pageSize.toString(),
          orderBy: sorting[0]?.id || "order_date",
          order: sorting[0]?.desc ? "desc" : "asc",
        });

        // Get active filters from columnFilters
        columnFilters.forEach(filter => {
          if (filter.value) {
            if (filter.id === "order_ref") {
              params.set("search", filter.value as string);
            } else {
              params.set(filter.id, filter.value as string);
            }
          }
        });

        // Fetch orders from API
        const response = await fetch(`/api/orders?${params}`);
        
        if (!response.ok) {
          console.error(`HTTP error! status: ${response.status}`);
          setData([]);
          setPageCount(0);
          return;
        }
        
        const result = await response.json();
        console.log(`OrdersTable: Fetched ${result.data?.length || 0} orders`);
        console.log('Pagination info:', result.pagination);

        if (!isMounted) return;
        
        // Transform the data to match OrderRow type
        const formattedOrders: OrderRow[] = (result.data || []).map((order: Order) => ({
          id: order.id?.toString() || '',
          order_ref: order.order_ref || '',
          order_date: order.order_date || '',
          buyer: order.buyer || '',
          ship_status: order.ship_status || '',
          products: order.products || '[]',
          total_topay: order.total_topay || 0,
          payment_status: order.payment_status || '',
        }));
        
        setData(formattedOrders);

        // Update pagination state with server response
        const { totalPages = 0 } = result.pagination;
        setPageCount(totalPages);
      } catch (err) {
        console.error('Failed to fetch orders:', err);
        // TODO: Add error toast or notification here
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
  }, [pagination, sorting, columnFilters, refreshTrigger]); // Include columnFilters in dependencies

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
    <div className="space-y-4">
      {/* Filtering Section */}
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search orders (Order Ref, Buyer)..."
            value={(table.getColumn("order_ref")?.getFilterValue() as string) || ""}
            disabled={loading}
            onChange={(e) => {
              const value = e.target.value;
              // Clear other filters and reset page when searching
              if (value) {
                setPagination(prev => ({ ...prev, pageIndex: 0 }));
                setSorting([{ id: "order_date", desc: true }]);
                setColumnFilters([{ id: "order_ref", value }]);
              } else {
                setColumnFilters([]);
              }
            }}
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
              >
                Pending Orders
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => {
                  setPagination(prev => ({ ...prev, pageIndex: 0 }));
                  setSorting([{ id: "order_date", desc: true }]);
                  setColumnFilters([{ id: "ship_status", value: "Shipped" }]);
                }}
              >
                Shipped Orders
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => {
                  setPagination(prev => ({ ...prev, pageIndex: 0 }));
                  setSorting([{ id: "order_date", desc: true }]);
                  setColumnFilters([{ id: "payment_status", value: "No Payment" }]);
                }}
              >
                Unpaid Orders
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
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
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
  );
}
