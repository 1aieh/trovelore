"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
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
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
} from "@/components/ui/pagination";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Define the type for each order row that the table will display.
import { OrderRow } from "@/types";

// Add a custom event for Shopify sync completion
const SHOPIFY_SYNC_COMPLETE_EVENT = "shopify-sync-complete";

const columns: ColumnDef<OrderRow>[] = [
  {
    header: "Order Ref",
    accessorKey: "order_ref",
    size: 120,
  },
  {
    header: "Order Date",
    accessorKey: "order_date",
    size: 120,
  },
  {
    header: "Buyer",
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
    header: "Total To Pay",
    accessorKey: "total_topay",
    cell: ({ row }) => `$${row.getValue("total_topay")}`,
    size: 120,
  },
  {
    header: "Payment Status",
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

function RowActions({ row }: { row: any }) {
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

export default function OrdersTable({ data: initialData = [] }: { data?: OrderRow[] }) {
  const id = useId();
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [sorting, setSorting] = useState<SortingState>([
    { id: "order_ref", desc: false },
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

  // Fetch data from Supabase
  useEffect(() => {
    async function fetchOrders() {
      try {
        console.log("OrdersTable: Fetching orders from Supabase...");
        setLoading(true);
        const { supabase } = await import('@/lib/supabaseClient');
        const { data: orders, error } = await supabase
          .from('orders')
          .select('*');
        
        if (error) {
          console.error('Error fetching orders:', error);
          return;
        }
        
        console.log(`OrdersTable: Fetched ${orders?.length || 0} orders from Supabase`);
        
        // Transform the data to match OrderRow type
        const formattedOrders: OrderRow[] = (orders || []).map(order => ({
          id: order.id.toString(),
          order_ref: order.order_ref || '',
          order_date: order.order_date || '',
          buyer: order.buyer || '',
          ship_status: order.ship_status || '',
          products: order.products || '[]',
          total_topay: order.total_topay || 0,
          payment_status: order.payment_status || '',
        }));
        
        setData(formattedOrders);
      } catch (err) {
        console.error('Failed to fetch orders:', err);
      } finally {
        setLoading(false);
      }
    }
    
    fetchOrders();
  }, [initialData, refreshTrigger]); // Add refreshTrigger to dependencies

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

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    state: { sorting, pagination, columnFilters, columnVisibility },
  });

  // Show loading state
  if (loading) {
    return <div className="text-center py-8">Loading orders...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Filtering Input */}
      <div className="flex flex-col gap-2">
        <Input
          placeholder="Filter by Order Ref or Buyer..."
          value={(table.getColumn("order_ref")?.getFilterValue() as string) || ""}
          onChange={(e) => table.getColumn("order_ref")?.setFilterValue(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="bg-background overflow-hidden rounded-md border">
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
      <div className="flex items-center justify-end space-x-2">
        <Button
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
          variant="outline"
          size="icon"
          aria-label="Previous page"
        >
          <ChevronLeftIcon size={16} />
        </Button>
        <Button
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
          variant="outline"
          size="icon"
          aria-label="Next page"
        >
          <ChevronRightIcon size={16} />
        </Button>
      </div>
    </div>
  );
}