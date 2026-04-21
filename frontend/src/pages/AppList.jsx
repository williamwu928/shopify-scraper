import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Download, 
  Grid3X3, 
  Table2,
  FileSpreadsheet,
  List,
  LayoutGrid
} from 'lucide-react';
import { getApps, getStats, getCategories } from '../api';
import DataTable from '../components/DataTable';
import AdvancedFilterPanel from '../components/AdvancedFilterPanel';
import ColumnSelector from '../components/ColumnSelector';
import TablePagination from '../components/TablePagination';
import StatsSummaryBar from '../components/StatsSummaryBar';

const ALL_COLUMNS = [
  { key: 'name', label: 'Name', width: '220px', type: 'icon' },
  { key: 'category_url_clean', label: 'Category', width: '160px', type: 'category' },
  { key: 'rating', label: 'Rating', width: '90px', type: 'rating', align: 'center' },
  { key: 'review_count', label: 'Reviews', width: '100px', type: 'reviews', align: 'right' },
  { key: 'pricing_text', label: 'Pricing', width: '140px', type: 'pricing' },
  { key: 'has_free_plan', label: 'Free Plan', width: '100px', type: 'badge', 
    badgeTrue: { label: 'Free', className: 'bg-green-100 text-green-700' } },
  { key: 'built_for_shopify', label: 'Built', width: '100px', type: 'badge',
    badgeTrue: { label: 'Shopify', className: 'bg-emerald-100 text-emerald-700' } },
  { key: 'short_description', label: 'Description', width: '280px', type: 'description' },
];

const DEFAULT_VISIBLE_COLUMNS = ['name', 'category_url_clean', 'rating', 'review_count', 'pricing_text', 'has_free_plan', 'built_for_shopify'];

export default function AppList() {
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [apps, setApps] = useState([]);
  const [allApps, setAllApps] = useState([]); // For client-side filtering
  const [stats, setStats] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'grid'
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  
  // Sorting
  const [sortColumn, setSortColumn] = useState('rating');
  const [sortDirection, setSortDirection] = useState('desc');
  
  // Row selection
  const [selectedRows, setSelectedRows] = useState([]);
  
  // Column visibility
  const [visibleColumns, setVisibleColumns] = useState(() => {
    const saved = localStorage.getItem('tableColumns');
    return saved ? JSON.parse(saved) : DEFAULT_VISIBLE_COLUMNS;
  });

  // Filters state
  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    category: searchParams.get('category') || undefined,
    rating: searchParams.get('rating') ? JSON.parse(searchParams.get('rating')) : undefined,
    reviews: searchParams.get('reviews') ? JSON.parse(searchParams.get('reviews')) : undefined,
    pricing: searchParams.get('pricing') ? JSON.parse(searchParams.get('pricing')) : undefined,
    has_free_plan: searchParams.get('free_only') === 'true',
    built_for_shopify: searchParams.get('built') === 'true',
    is_ad: searchParams.get('is_ad') === 'true',
  });

  // Fetch all apps (for client-side filtering)
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [appsData, statsData] = await Promise.all([
          getApps({ limit: 5000 }), // Get all apps
          getStats()
        ]);
        console.log('Apps data sample:', appsData.items?.slice(0, 3));
        console.log('First app rating:', appsData.items?.[0]?.rating);
        setAllApps(appsData.items || []);
        setStats(statsData);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Apply filters and sorting (client-side)
  const filteredAndSortedApps = useMemo(() => {
    let result = [...allApps];

    // Search filter
    if (filters.search) {
      const search = filters.search.toLowerCase();
      result = result.filter(app => 
        app.name?.toLowerCase().includes(search) ||
        app.short_description?.toLowerCase().includes(search) ||
        app.handle?.toLowerCase().includes(search)
      );
    }

    // Category filter
    if (filters.category?.length > 0) {
      result = result.filter(app => 
        filters.category.some(cat => app.category_url_clean?.includes(cat))
      );
    }

    // Rating filter
    if (filters.rating) {
      const min = parseFloat(filters.rating.min) || 0;
      const max = parseFloat(filters.rating.max) || 5;
      result = result.filter(app => {
        const rating = parseFloat(app.rating) || 0;
        return rating >= min && rating <= max;
      });
    }

    // Reviews filter
    if (filters.reviews) {
      const min = parseInt(filters.reviews.min) || 0;
      const max = parseInt(filters.reviews.max) || Infinity;
      result = result.filter(app => {
        const reviews = parseInt(app.review_count) || 0;
        return reviews >= min && reviews <= max;
      });
    }

    // Pricing filter
    if (filters.pricing?.length > 0) {
      result = result.filter(app => {
        const pricing = (app.pricing_text || '').toLowerCase();
        return filters.pricing.some(p => {
          switch (p) {
            case 'free': return pricing.includes('free plan');
            case 'free_trial': return pricing.includes('free trial');
            case 'free_install': return pricing.includes('free to install');
            case 'paid': return !pricing.includes('free');
            default: return true;
          }
        });
      });
    }

    // Boolean filters
    if (filters.has_free_plan) {
      result = result.filter(app => app.has_free_plan);
    }
    if (filters.built_for_shopify) {
      result = result.filter(app => app.built_for_shopify);
    }
    if (filters.is_ad) {
      result = result.filter(app => app.is_ad);
    }

    // Sorting
    result.sort((a, b) => {
      let aVal = a[sortColumn];
      let bVal = b[sortColumn];

      // Handle null/undefined
      if (aVal == null) aVal = sortDirection === 'asc' ? Infinity : -Infinity;
      if (bVal == null) bVal = sortDirection === 'asc' ? Infinity : -Infinity;

      // Numeric sorting
      if (['rating', 'review_count'].includes(sortColumn)) {
        aVal = parseFloat(aVal) || 0;
        bVal = parseFloat(bVal) || 0;
      }

      // String sorting
      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = (bVal || '').toLowerCase();
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [allApps, filters, sortColumn, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedApps.length / itemsPerPage);
  const paginatedApps = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedApps.slice(start, start + itemsPerPage);
  }, [filteredAndSortedApps, currentPage, itemsPerPage]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  // Handle sort
  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  // Handle filter changes
  const handleFilterChange = (newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  // Clear all filters
  const handleClearAll = () => {
    setFilters({
      search: '',
      category: undefined,
      rating: undefined,
      reviews: undefined,
      pricing: undefined,
      has_free_plan: false,
      built_for_shopify: false,
      is_ad: false,
    });
  };

  // Handle column toggle
  const handleColumnToggle = (columnKey) => {
    const newColumns = visibleColumns.includes(columnKey)
      ? visibleColumns.filter(c => c !== columnKey)
      : [...visibleColumns, columnKey];
    setVisibleColumns(newColumns);
    localStorage.setItem('tableColumns', JSON.stringify(newColumns));
  };

  // Handle column reset
  const handleColumnReset = () => {
    setVisibleColumns(DEFAULT_VISIBLE_COLUMNS);
    localStorage.setItem('tableColumns', JSON.stringify(DEFAULT_VISIBLE_COLUMNS));
  };

  // Row selection
  const handleRowSelect = (handle) => {
    setSelectedRows(prev => 
      prev.includes(handle)
        ? prev.filter(h => h !== handle)
        : [...prev, handle]
    );
  };

  const handleSelectAll = () => {
    if (selectedRows.length === paginatedApps.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(paginatedApps.map(app => app.handle));
    }
  };

  // Export to CSV
  const exportToCSV = () => {
    const dataToExport = selectedRows.length > 0 
      ? filteredAndSortedApps.filter(app => selectedRows.includes(app.handle))
      : filteredAndSortedApps;

    const headers = ['Name', 'Category', 'Rating', 'Reviews', 'Pricing', 'Free Plan', 'Built for Shopify', 'Description', 'URL'];
    const rows = dataToExport.map(app => [
      app.name,
      app.category_url_clean?.split('/').pop() || '',
      app.rating || '',
      app.review_count || '',
      app.pricing_text || '',
      app.has_free_plan ? 'Yes' : 'No',
      app.built_for_shopify ? 'Yes' : 'No',
      app.short_description || '',
      app.app_url || ''
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `shopify-apps-export-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const visibleColumnsData = ALL_COLUMNS.filter(col => visibleColumns.includes(col.key));

  return (
    <div className="space-y-4">
      {/* Stats Summary */}
      <StatsSummaryBar stats={stats} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Apps Explorer</h1>
          <p className="text-gray-500 text-sm mt-1">
            Database-style view with advanced filtering and sorting
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Export Button */}
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
            {selectedRows.length > 0 && (
              <span className="bg-white text-green-600 text-xs px-1.5 rounded">
                {selectedRows.length}
              </span>
            )}
          </button>

          {/* View Toggle */}
          <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 ${viewMode === 'table' ? 'bg-blue-50 text-blue-600' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
              title="Table view"
            >
              <Table2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 ${viewMode === 'grid' ? 'bg-blue-50 text-blue-600' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
              title="Grid view"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>

          {/* Column Selector */}
          <ColumnSelector
            columns={ALL_COLUMNS}
            visibleColumns={visibleColumns}
            onToggle={handleColumnToggle}
            onReset={handleColumnReset}
          />
        </div>
      </div>

      {/* Filter Panel */}
      <AdvancedFilterPanel
        categories={categories}
        filters={filters}
        onFilterChange={handleFilterChange}
        onClearAll={handleClearAll}
        totalCount={allApps.length}
        filteredCount={filteredAndSortedApps.length}
      />

      {/* Main Content */}
      {viewMode === 'table' ? (
        <>
          {/* Data Table */}
          <DataTable
            data={paginatedApps}
            columns={visibleColumnsData}
            sortColumn={sortColumn}
            sortDirection={sortDirection}
            onSort={handleSort}
            selectedRows={selectedRows}
            onRowSelect={handleRowSelect}
            onSelectAll={handleSelectAll}
            loading={loading}
          />

          {/* Pagination */}
          <TablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredAndSortedApps.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={(val) => {
              setItemsPerPage(val);
              setCurrentPage(1);
            }}
          />
        </>
      ) : (
        /* Grid View Fallback */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedApps.map((app) => (
            <a
              key={app.handle}
              href={app.app_url}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white rounded-lg p-4 border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all"
            >
              <div className="flex items-start gap-3">
                <img
                  src={app.icon_url}
                  alt=""
                  className="w-12 h-12 rounded-lg object-cover bg-gray-100"
                  onError={(e) => e.target.style.display = 'none'}
                />
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">{app.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    {app.rating && (
                      <span className="flex items-center text-sm">
                        <Star className="w-3 h-3 fill-yellow-400 text-yellow-400 mr-1" />
                        {app.rating}
                      </span>
                    )}
                    {app.review_count > 0 && (
                      <span className="text-xs text-gray-500">({app.review_count} reviews)</span>
                    )}
                  </div>
                </div>
              </div>
              <p className="text-sm text-gray-500 mt-2 line-clamp-2">{app.short_description}</p>
              <div className="flex items-center gap-2 mt-3">
                {app.has_free_plan && (
                  <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">Free</span>
                )}
                {app.built_for_shopify && (
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-xs">Shopify</span>
                )}
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
