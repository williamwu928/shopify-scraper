import { useState } from 'react';
import { X, Columns, RotateCcw } from 'lucide-react';

const DEFAULT_COLUMNS = [
  'name',
  'category_url_clean',
  'rating',
  'review_count',
  'pricing_text',
  'has_free_plan',
  'built_for_shopify',
  'short_description',
];

export default function ColumnSelector({ columns, visibleColumns, onToggle, onReset }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
      >
        <Columns className="w-4 h-4 text-gray-500" />
        <span className="text-sm text-gray-700">Columns</span>
        <span className="text-xs text-gray-400">({visibleColumns.length}/{columns.length})</span>
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)} 
          />
          <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
            <div className="flex items-center justify-between p-3 border-b border-gray-100">
              <span className="font-medium text-gray-700">Toggle Columns</span>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-2 max-h-80 overflow-y-auto">
              {columns.map((col) => (
                <label
                  key={col.key}
                  className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 rounded cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={visibleColumns.includes(col.key)}
                    onChange={() => onToggle(col.key)}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{col.label}</span>
                </label>
              ))}
            </div>
            <div className="p-3 border-t border-gray-100 flex justify-between">
              <button
                onClick={() => {
                  onReset();
                  setIsOpen(false);
                }}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
              >
                <RotateCcw className="w-3 h-3" />
                Reset
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Done
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
