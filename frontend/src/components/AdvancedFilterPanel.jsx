import { useState } from 'react';
import { 
  Search, 
  Filter, 
  X, 
  ChevronDown, 
  ChevronUp,
  Plus,
  Download,
  Shield,
  Star,
  DollarSign,
  Target
} from 'lucide-react';

export default function AdvancedFilterPanel({
  categories,
  filters,
  onFilterChange,
  onClearAll,
  totalCount,
  filteredCount
}) {
  const [expandedSection, setExpandedSection] = useState('main');
  const [showAddFilter, setShowAddFilter] = useState(false);

  const categoriesList = [
    { slug: 'store-design-search-and-navigation-search-and-filters', name: 'Search & Filters' },
    { slug: 'sales-channels', name: 'Sales Channels' },
    { slug: 'product-reviews', name: 'Product Reviews' },
    { slug: 'marketing-marketing', name: 'Marketing' },
    { slug: 'store-design-search-and-navigation-seo', name: 'SEO' },
    { slug: 'merchandising-upsell-and-cross-sell', name: 'Upsell & Cross-sell' },
    { slug: 'shipping-and-delivery', name: 'Shipping' },
    { slug: 'localization', name: 'Currency & Translation' },
  ];

  const pricingOptions = [
    { value: 'free', label: 'Free plan available' },
    { value: 'free_trial', label: 'Free trial available' },
    { value: 'free_install', label: 'Free to install' },
    { value: 'paid', label: 'Paid' },
  ];

  const toggleArrayFilter = (key, value) => {
    const current = filters[key] || [];
    const updated = current.includes(value)
      ? current.filter(v => v !== value)
      : [...current, value];
    onFilterChange({ [key]: updated.length > 0 ? updated : undefined });
  };

  const handleRangeChange = (key, bound, value) => {
    const current = filters[key] || { min: '', max: '' };
    const updated = { ...current, [bound]: value };
    onFilterChange({ [key]: (updated.min || updated.max) ? updated : undefined });
  };

  const activeFilterCount = Object.entries(filters).filter(([key, value]) => {
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'object' && value !== null) return value.min || value.max;
    return value !== undefined && value !== '';
  }).length;

  const getFilterLabel = (key, value) => {
    switch (key) {
      case 'category':
        const cat = categoriesList.find(c => c.slug === value);
        return cat?.name || value;
      case 'rating':
        return `Rating: ${value.min || '0'} - ${value.max || '5'}`;
      case 'reviews':
        return `Reviews: ${value.min || '0'} - ${value.max || '∞'}`;
      case 'pricing':
        return value.map(v => pricingOptions.find(p => p.value === v)?.label || v);
      case 'has_free_plan':
        return value ? 'Free Plan: Yes' : null;
      case 'built_for_shopify':
        return value ? 'Built for Shopify' : null;
      case 'is_ad':
        return value ? 'Ads Only' : null;
      default:
        return value;
    }
  };

  const removeFilter = (key) => {
    if (key === 'rating' || key === 'reviews') {
      onFilterChange({ [key]: undefined });
    } else if (Array.isArray(filters[key])) {
      onFilterChange({ [key]: undefined });
    } else {
      onFilterChange({ [key]: undefined });
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      {/* Main Toolbar */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search apps..."
              value={filters.search || ''}
              onChange={(e) => onFilterChange({ search: e.target.value || undefined })}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {filters.search && (
              <button
                onClick={() => onFilterChange({ search: undefined })}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Quick Stats */}
          <div className="flex items-center gap-2 text-sm text-gray-600 px-3 py-1 bg-gray-50 rounded-lg">
            <span className="font-medium text-blue-600">{filteredCount?.toLocaleString() || 0}</span>
            <span>of</span>
            <span>{totalCount?.toLocaleString() || 0}</span>
            <span>apps</span>
          </div>

          {/* Toggle Filters Button */}
          <button
            onClick={() => setExpandedSection(expandedSection === 'main' ? 'collapsed' : 'main')}
            className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors ${
              activeFilterCount > 0 
                ? 'border-blue-300 bg-blue-50 text-blue-700' 
                : 'border-gray-200 hover:bg-gray-50'
            }`}
          >
            <Filter className="w-4 h-4" />
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span className="bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded-full">
                {activeFilterCount}
              </span>
            )}
            {expandedSection === 'main' ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>

          {/* Clear All */}
          {activeFilterCount > 0 && (
            <button
              onClick={onClearAll}
              className="text-sm text-gray-500 hover:text-red-600 transition-colors"
            >
              Clear all
            </button>
          )}
        </div>
      </div>

      {/* Active Filter Pills */}
      {activeFilterCount > 0 && (
        <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 flex flex-wrap gap-2">
          {Object.entries(filters).map(([key, value]) => {
            if (!value) return null;
            
            const label = getFilterLabel(key, value);
            if (!label) return null;

            if (Array.isArray(label)) {
              return label.map((l, i) => (
                <span key={`${key}-${i}`} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                  {l}
                  <button onClick={() => {
                    const newValue = [...filters[key]];
                    newValue.splice(i, 1);
                    onFilterChange({ [key]: newValue.length > 0 ? newValue : undefined });
                  }} className="hover:text-blue-900">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ));
            }

            return (
              <span key={key} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                {label}
                <button onClick={() => removeFilter(key)} className="hover:text-blue-900">
                  <X className="w-3 h-3" />
                </button>
              </span>
            );
          })}
        </div>
      )}

      {/* Expanded Filter Panel */}
      {expandedSection === 'main' && (
        <div className="p-4 space-y-4">
          {/* Category Filter */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <Target className="w-4 h-4 text-gray-400" />
              Category
            </label>
            <div className="flex flex-wrap gap-2">
              {categoriesList.map((cat) => (
                <button
                  key={cat.slug}
                  onClick={() => toggleArrayFilter('category', cat.slug)}
                  className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    filters.category?.includes(cat.slug)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Rating Range */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <Star className="w-4 h-4 text-gray-400" />
              Rating Range
            </label>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="5"
                  step="0.1"
                  placeholder="Min"
                  value={filters.rating?.min || ''}
                  onChange={(e) => handleRangeChange('rating', 'min', e.target.value)}
                  className="w-20 px-3 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-gray-400">to</span>
                <input
                  type="number"
                  min="0"
                  max="5"
                  step="0.1"
                  placeholder="Max"
                  value={filters.rating?.max || ''}
                  onChange={(e) => handleRangeChange('rating', 'max', e.target.value)}
                  className="w-20 px-3 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <span className="text-xs text-gray-500">(0.0 - 5.0)</span>
            </div>
          </div>

          {/* Review Count Range */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <span className="text-gray-400 font-mono text-sm">N</span>
              Review Count
            </label>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  placeholder="Min"
                  value={filters.reviews?.min || ''}
                  onChange={(e) => handleRangeChange('reviews', 'min', e.target.value)}
                  className="w-24 px-3 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-gray-400">to</span>
                <input
                  type="number"
                  min="0"
                  placeholder="Max"
                  value={filters.reviews?.max || ''}
                  onChange={(e) => handleRangeChange('reviews', 'max', e.target.value)}
                  className="w-24 px-3 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Pricing Type Filter */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <DollarSign className="w-4 h-4 text-gray-400" />
              Pricing Type
            </label>
            <div className="flex flex-wrap gap-2">
              {pricingOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => toggleArrayFilter('pricing', opt.value)}
                  className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    filters.pricing?.includes(opt.value)
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Boolean Filters */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <Shield className="w-4 h-4 text-gray-400" />
              App Attributes
            </label>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.has_free_plan || false}
                  onChange={(e) => onFilterChange({ has_free_plan: e.target.checked || undefined })}
                  className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                />
                <span className="text-sm text-gray-700">Free Plan Available</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.built_for_shopify || false}
                  onChange={(e) => onFilterChange({ built_for_shopify: e.target.checked || undefined })}
                  className="w-4 h-4 rounded border-gray-300 text-shopify-600 focus:ring-shopify-500"
                />
                <span className="text-sm text-gray-700">Built for Shopify</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.is_ad || false}
                  onChange={(e) => onFilterChange({ is_ad: e.target.checked || undefined })}
                  className="w-4 h-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                />
                <span className="text-sm text-gray-700">Ads Only</span>
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
