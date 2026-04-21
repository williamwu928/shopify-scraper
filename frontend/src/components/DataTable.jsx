import { useState, useMemo } from 'react';
import { 
  ChevronUp, 
  ChevronDown, 
  ChevronsUpDown,
  Star,
  ExternalLink,
  Check,
  MoreHorizontal
} from 'lucide-react';

export default function DataTable({ 
  data, 
  columns, 
  onSort, 
  sortColumn, 
  sortDirection,
  selectedRows,
  onRowSelect,
  onSelectAll,
  loading 
}) {
  const [hoveredRow, setHoveredRow] = useState(null);

  // Debug logging
  console.log('DataTable render:', {
    dataLength: data.length,
    firstItem: data[0] ? { rating: data[0].rating, reviews: data[0].review_count } : null,
    columns: columns,
    columnTypes: columns.map(c => ({ key: c.key, type: c.type }))
  });

  const allSelected = data.length > 0 && data.every(row => selectedRows.includes(row.handle));
  const someSelected = data.some(row => selectedRows.includes(row.handle));

  const handleSort = (columnKey) => {
    if (columns.find(c => c.key === columnKey)?.sortable !== false) {
      onSort(columnKey);
    }
  };

  const renderSortIcon = (columnKey) => {
    const col = columns.find(c => c.key === columnKey);
    if (col?.sortable === false) return null;
    
    if (sortColumn === columnKey) {
      return sortDirection === 'asc' 
        ? <ChevronUp className="w-4 h-4" />
        : <ChevronDown className="w-4 h-4" />;
    }
    return <ChevronsUpDown className="w-4 h-4 opacity-30" />;
  };

  const renderCellContent = (column, row) => {
    const value = row[column.key];
    
    // Debug for rating column
    if (column.type === 'rating') {
      console.log('Rating cell:', { key: column.key, value, rowRating: row.rating, rowRatingType: typeof row.rating });
    }

    switch (column.type) {
      case 'icon':
        return (
          <div className="flex items-center gap-3">
            <img
              src={row.icon_url}
              alt=""
              className="w-8 h-8 rounded object-cover bg-gray-100"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
            <div 
              className="w-8 h-8 rounded bg-gradient-to-br from-blue-500 to-blue-600 items-center justify-center text-white font-semibold text-sm hidden"
            >
              {row.name?.charAt(0) || '?'}
            </div>
            <span className="font-medium text-gray-900 truncate max-w-[180px]">
              {value}
            </span>
          </div>
        );

      case 'rating':
        if (!value) return <span className="text-gray-400">-</span>;
        return (
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
            <span className="font-medium">{parseFloat(value).toFixed(1)}</span>
          </div>
        );

      case 'reviews':
        if (!value) return <span className="text-gray-400">-</span>;
        return <span>{parseInt(value).toLocaleString()}</span>;

      case 'badge':
        return value ? (
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
            column.badgeTrue?.className || 'bg-green-100 text-green-700'
          }`}>
            {column.badgeTrue?.icon && <column.badgeTrue.icon className="w-3 h-3 mr-1" />}
            {column.badgeTrue?.label || 'Yes'}
          </span>
        ) : (
          <span className="text-gray-400">-</span>
        );

      case 'pricing':
        return (
          <span className="text-sm">
            {value || <span className="text-gray-400">-</span>}
          </span>
        );

      case 'category':
        return (
          <span className="px-2 py-1 bg-gray-100 rounded text-xs font-medium text-gray-700">
            {value?.replace('store-design-search-and-navigation-', '').replace(/-/g, ' ') || '-'}
          </span>
        );

      case 'description':
        return (
          <span className="text-sm text-gray-600 truncate block max-w-[280px]" title={value}>
            {value || '-'}
          </span>
        );

      case 'link':
        return (
          <a
            href={row.app_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm"
          >
            <ExternalLink className="w-4 h-4" />
            View
          </a>
        );

      case 'checkbox':
        return (
          <input
            type="checkbox"
            checked={selectedRows.includes(row.handle)}
            onChange={() => onRowSelect(row.handle)}
            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
          />
        );

      case 'number':
        return <span className="font-mono text-sm">{value || '-'}</span>;

      default:
        return value || '-';
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="animate-pulse">
          <div className="h-12 bg-gray-100 border-b border-gray-200" />
          {[...Array(10)].map((_, i) => (
            <div key={i} className="h-14 border-b border-gray-100 flex items-center px-4 gap-4">
              <div className="w-4 h-4 bg-gray-200 rounded" />
              <div className="w-8 h-8 bg-gray-200 rounded" />
              <div className="flex-1 h-4 bg-gray-200 rounded" />
              <div className="w-16 h-4 bg-gray-200 rounded" />
              <div className="w-20 h-4 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-800 text-white">
            <tr>
              <th className="w-12 px-4 py-3 text-left">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected && !allSelected;
                  }}
                  onChange={onSelectAll}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
              </th>
              <th className="w-14 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                #
              </th>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${
                    column.sortable !== false ? 'cursor-pointer hover:bg-slate-700 select-none' : ''
                  }`}
                  style={{ minWidth: column.width || 'auto' }}
                  onClick={() => handleSort(column.key)}
                >
                  <div className="flex items-center gap-2">
                    <span>{column.label}</span>
                    {renderSortIcon(column.key)}
                  </div>
                </th>
              ))}
              <th className="w-20 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 3} className="px-4 py-12 text-center text-gray-500">
                  No apps found matching your criteria
                </td>
              </tr>
            ) : (
              data.map((row, index) => (
                <tr
                  key={row.handle}
                  className={`hover:bg-blue-50 transition-colors ${
                    selectedRows.includes(row.handle) ? 'bg-blue-50' : ''
                  }`}
                  onMouseEnter={() => setHoveredRow(row.handle)}
                  onMouseLeave={() => setHoveredRow(null)}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedRows.includes(row.handle)}
                      onChange={() => onRowSelect(row.handle)}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-sm font-mono">
                    {index + 1}
                  </td>
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={`px-4 py-3 text-sm ${column.align === 'right' ? 'text-right' : ''}`}
                    >
                      {renderCellContent(column, row)}
                    </td>
                  ))}
                  <td className="px-4 py-3">
                    <a
                      href={row.app_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center w-8 h-8 rounded hover:bg-gray-100 text-gray-500 hover:text-blue-600 transition-colors"
                      title="View on Shopify"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
