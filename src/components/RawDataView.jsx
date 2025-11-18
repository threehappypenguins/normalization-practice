import React from 'react';

export default function RawDataView({ rawData, mappedColumns = [], mappingStats = null }) {
  if (!rawData) return null;

  const normalizeColName = (name) => name.trim().toLowerCase().replace(/\s+/g, '_');
  const isMapped = (colName) => {
    const normalized = normalizeColName(colName);
    return Array.from(mappedColumns).some(mapped => normalizeColName(mapped) === normalized);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-gray-800">
          Raw Data (0NF) - {rawData.tableName}
        </h3>
        {mappingStats && (
          <div className="text-sm">
            <span className={`px-3 py-1 rounded-full font-medium ${
              mappingStats.percentage === 100 
                ? 'bg-green-100 text-green-800' 
                : mappingStats.percentage >= 50 
                ? 'bg-yellow-100 text-yellow-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              {mappingStats.mapped} of {mappingStats.total} columns mapped ({mappingStats.percentage}%)
            </span>
          </div>
        )}
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-100">
              {rawData.columns.map((col, idx) => {
                const mapped = isMapped(col);
                return (
                  <th
                    key={idx}
                    className={`border border-gray-300 px-4 py-2 text-left text-sm font-semibold ${
                      mapped 
                        ? 'bg-green-50 text-green-800 border-green-300' 
                        : 'text-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {col}
                      {mapped && (
                        <span className="text-xs bg-green-200 text-green-800 px-1.5 py-0.5 rounded">
                          ✓ Mapped
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rawData.rows.map((row, rowIdx) => (
              <tr key={rowIdx} className="hover:bg-gray-50">
                {row.map((cell, cellIdx) => {
                  const mapped = isMapped(rawData.columns[cellIdx]);
                  return (
                    <td
                      key={cellIdx}
                      className={`border border-gray-300 px-4 py-2 text-sm ${
                        mapped 
                          ? 'bg-green-50 text-green-900 border-green-200' 
                          : 'text-gray-700'
                      }`}
                    >
                      {cell || <span className="text-gray-400 italic">(empty)</span>}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="mt-4">
        <p className="text-sm text-gray-600 italic">
          This is the un-normalized data. Your task is to normalize it step by step.
        </p>
      </div>
    </div>
  );
}

