import { Search, SlidersHorizontal, X } from 'lucide-react';
import { useState } from 'react';

export default function FilterPanel({ 
  categories, 
  selectedCategory, 
  onCategoryChange,
  searchQuery, 
  onSearchChange,
  sortBy, 
  onSortChange,
  freeOnly, 
  onFreeOnlyChange 
}) {
  const [showFilters, setShowFilters] = useState(false);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
      <div className="flex flex-col md:flex-row gap-4">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search apps..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-shopify-500 focus:border-transparent"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter Toggle (Mobile) */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="md:hidden flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-lg hover:bg-gray-50"
        >
          <SlidersHorizontal className="w-5 h-5" />
          Filters
        </button>

        {/* Desktop Filters */}
        <div className="hidden md:flex items-center gap-3">
          {/* Category */}
          <select
            value={selectedCategory}
            onChange={(e) => onCategoryChange(e.target.value)}
            className="px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-shopify-500 bg-white"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.slug} value={cat.slug}>
                {cat.name}
              </option>
            ))}
          </select>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value)}
            className="px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-shopify-500 bg-white"
          >
            <option value="rating">Top Rated</option>
            <option value="reviews">Most Reviews</option>
            <option value="name">Name A-Z</option>
          </select>

          {/* Free Only Toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={freeOnly}
              onChange={(e) => onFreeOnlyChange(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-shopify-600 focus:ring-shopify-500"
            />
            <span className="text-sm text-gray-700">Free Plan</span>
          </label>
        </div>
      </div>

      {/* Mobile Filters */}
      {showFilters && (
        <div className="mt-4 pt-4 border-t border-gray-100 md:hidden space-y-3">
          <select
            value={selectedCategory}
            onChange={(e) => onCategoryChange(e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-shopify-500 bg-white"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.slug} value={cat.slug}>
                {cat.name} ({cat.app_count})
              </option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-shopify-500 bg-white"
          >
            <option value="rating">Top Rated</option>
            <option value="reviews">Most Reviews</option>
            <option value="name">Name A-Z</option>
          </select>

          <label className="flex items-center gap-2 cursor-pointer px-1">
            <input
              type="checkbox"
              checked={freeOnly}
              onChange={(e) => onFreeOnlyChange(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-shopify-600 focus:ring-shopify-500"
            />
            <span className="text-sm text-gray-700">Free Plan Only</span>
          </label>
        </div>
      )}
    </div>
  );
}
