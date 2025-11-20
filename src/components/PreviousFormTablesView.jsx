import React from 'react';
import { generateTableData } from '../utils/dataTransformer';

/**
 * Component to display previous form's tables as read-only reference
 * Used when building 2NF (shows 1NF tables) or 3NF (shows 2NF tables)
 */
export default function PreviousFormTablesView({ previousFormTables, previousFormName, rawData, previousPreviousFormTables = null }) {
  if (!previousFormTables || previousFormTables.length === 0) {
    return null;
  }

  // Generate preview data for each table
  // For 2NF tables (shown in 3NF), we need to regenerate from 1NF tables
  // For 1NF tables (shown in 2NF), we generate from rawData
  const tablesWithData = previousFormTables.map(table => {
    let previewData = [];
    if (table.saved && rawData) {
      if (previousFormName === '2NF' && previousPreviousFormTables && previousPreviousFormTables.length > 0) {
        // Regenerate 2NF tables from 1NF tables
        previewData = generateTableData(table, rawData, previousPreviousFormTables);
      } else {
        // Generate 1NF tables from rawData
        previewData = generateTableData(table, rawData);
      }
    }
    return { ...table, previewData };
  });

  return (
    <div className="bg-blue-50 rounded-lg shadow-md p-6 mb-6 border-2 border-blue-300">
      <div className="mb-4">
        <h3 className="text-xl font-bold text-gray-800">
          Your {previousFormName} Tables (Starting Point)
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          These are your completed {previousFormName} tables. Build your {previousFormName === '1NF' ? '2NF' : '3NF'} tables based on these.
        </p>
      </div>

      <div className="space-y-4">
        {tablesWithData.map((table) => (
          <div key={table.id} className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
            <div className="mb-3">
              <h4 className="text-lg font-semibold text-gray-800">{table.name || 'Untitled Table'}</h4>
            </div>

            {table.previewData && table.previewData.length > 0 && (
              <div className="mt-4 border-t pt-4">
                <div className="mb-2">
                  <h5 className="text-sm font-semibold text-gray-700">
                    Data Preview ({table.previewData.length} rows):
                  </h5>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full border-collapse border border-gray-300 text-sm">
                    <thead>
                      <tr className="bg-gray-100">
                        {table.columns.map((col, idx) => {
                          let label = null;
                          if (col.type === 'PK') {
                            label = 'PK';
                          } else if (col.type === 'FK') {
                            label = 'FK';
                          }
                          return (
                            <th
                              key={idx}
                              className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700"
                            >
                              <div className="flex items-center gap-1">
                                <span>{col.name}</span>
                                {label && (
                                  <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                                    col.type === 'PK' ? 'bg-green-100 text-green-800' :
                                    'bg-blue-100 text-blue-800'
                                  }`}>
                                    {label}
                                  </span>
                                )}
                              </div>
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {table.previewData.map((row, rowIdx) => (
                        <tr key={rowIdx} className="hover:bg-gray-50">
                          {row.map((cell, cellIdx) => (
                            <td
                              key={cellIdx}
                              className="border border-gray-300 px-3 py-2 text-gray-700"
                            >
                              {cell || <span className="text-gray-400 italic">(empty)</span>}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                    </table>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

