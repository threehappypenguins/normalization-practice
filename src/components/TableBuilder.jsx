import React, { useState } from 'react';
import ColumnMappingDialog from './ColumnMappingDialog';
import { generateTableData, getMappedColumns } from '../utils/dataTransformer';

export default function TableBuilder({ tables, onTablesChange, rawData }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentTableId, setCurrentTableId] = useState(null);
  const [editingColumnIndex, setEditingColumnIndex] = useState(null); // Track which column is being edited
  const [previewData, setPreviewData] = useState({});
  const [savedTables, setSavedTables] = useState(new Set()); // Track which tables are saved/collapsed

  const addTable = () => {
    const newTable = {
      id: Date.now(),
      name: `TABLE_${tables.length + 1}`,
      columns: []
    };
    onTablesChange([...tables, newTable]);
  };

  const removeTable = (tableId) => {
    onTablesChange(tables.filter(t => t.id !== tableId));
    const newPreview = { ...previewData };
    delete newPreview[tableId];
    setPreviewData(newPreview);
    setSavedTables(prev => {
      const newSet = new Set(prev);
      newSet.delete(tableId);
      return newSet;
    });
  };

  const updateTableName = (tableId, newName) => {
    onTablesChange(tables.map(t => 
      t.id === tableId ? { ...t, name: newName } : t
    ));
  };

  const openColumnDialog = (tableId, columnIndex = null) => {
    setCurrentTableId(tableId);
    setEditingColumnIndex(columnIndex);
    setDialogOpen(true);
  };

  const handleAddColumn = (newColumn) => {
    if (!currentTableId) return;

    if (editingColumnIndex !== null) {
      // Update existing column
      onTablesChange(tables.map(t => 
        t.id === currentTableId 
          ? { 
              ...t, 
              columns: t.columns.map((col, idx) => 
                idx === editingColumnIndex ? newColumn : col
              )
            }
          : t
      ));
    } else {
      // Add new column
      onTablesChange(tables.map(t => 
        t.id === currentTableId 
          ? { ...t, columns: [...t.columns, newColumn] }
          : t
      ));
    }

    // Reset editing state
    setEditingColumnIndex(null);

    // Auto-generate preview when column is added/updated
    setTimeout(() => {
      generatePreviewForTable(currentTableId);
    }, 100);
  };

  const removeColumn = (tableId, columnIndex) => {
    onTablesChange(tables.map(t => 
      t.id === tableId 
        ? { ...t, columns: t.columns.filter((_, idx) => idx !== columnIndex) }
        : t
    ));

    // Regenerate preview
    setTimeout(() => {
      generatePreviewForTable(tableId);
    }, 100);
  };

  const moveColumn = (tableId, fromIndex, toIndex) => {
    onTablesChange(tables.map(t => {
      if (t.id !== tableId) return t;
      const newColumns = [...t.columns];
      const [moved] = newColumns.splice(fromIndex, 1);
      newColumns.splice(toIndex, 0, moved);
      return { ...t, columns: newColumns };
    }));

    // Regenerate preview
    setTimeout(() => {
      generatePreviewForTable(tableId);
    }, 100);
  };

  const [draggedColumn, setDraggedColumn] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  const generatePreviewForTable = (tableId) => {
    if (!rawData) return;

    const table = tables.find(t => t.id === tableId);
    if (!table || !table.columns || table.columns.length === 0) {
      const newPreview = { ...previewData };
      delete newPreview[tableId];
      setPreviewData(newPreview);
      return;
    }

    // Validate that all columns have required mapping info
    const hasValidMappings = table.columns.every(col => 
      col.mappingType && col.sourceCols && col.sourceCols.length > 0
    );

    if (!hasValidMappings) {
      return; // Don't generate preview if mappings are incomplete
    }

    const data = generateTableData(table, rawData);
    setPreviewData({
      ...previewData,
      [tableId]: data
    });
  };


  const getMappingDescription = (column) => {
    if (!column.mappingType || !column.sourceCols) {
      return 'No mapping defined';
    }

    switch (column.mappingType) {
      case 'direct':
        return `← maps to ${column.sourceCols[0]}`;
      case 'consolidate':
        return `← consolidates from ${column.sourceCols.join(', ')}`;
      case 'metadata':
        return `← uses names of ${column.sourceCols.join(', ')}`;
      default:
        return '';
    }
  };

  const getMappedColsForTable = (tableId) => {
    const table = tables.find(t => t.id === tableId);
    if (!table) return [];
    
    // Only return columns that are used in "direct" mappings
    // Consolidation and metadata mappings can reuse the same source columns
    const directMappedCols = new Set();
    table.columns.forEach(col => {
      if (col.mappingType === 'direct' && col.sourceCols && col.sourceCols.length > 0) {
        col.sourceCols.forEach(sourceCol => {
          directMappedCols.add(sourceCol);
        });
      }
    });
    
    return Array.from(directMappedCols);
  };

  const isTableSaved = (tableId) => {
    return savedTables.has(tableId);
  };

  const handleSaveTable = (tableId) => {
    generatePreviewForTable(tableId);
    setSavedTables(prev => new Set(prev).add(tableId));
  };

  const handleEditTable = (tableId) => {
    setSavedTables(prev => {
      const newSet = new Set(prev);
      newSet.delete(tableId);
      return newSet;
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold text-gray-800">Your Tables</h3>
        <button
          onClick={addTable}
          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
        >
          + Add Table
        </button>
      </div>

      {tables.length === 0 && (
        <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <p className="text-gray-500">No tables yet. Click "Add Table" to get started.</p>
        </div>
      )}

      {tables.map((table) => {
        const tablePreview = previewData[table.id] || [];
        const mappedCols = getMappedColsForTable(table.id);

        return (
          <div key={table.id} className="bg-white rounded-lg shadow-md p-6 border-2 border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex-1">
                <input
                  type="text"
                  value={table.name}
                  onChange={(e) => updateTableName(table.id, e.target.value)}
                  placeholder="Table Name"
                  className="text-lg font-semibold px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-full mb-2"
                />
                <p className="text-sm text-gray-600">Table: {table.name || 'Untitled'}</p>
              </div>
              <div className="flex gap-2 ml-4">
                {isTableSaved(table.id) ? (
                  <button
                    onClick={() => handleEditTable(table.id)}
                    className="px-3 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors text-sm"
                  >
                    Edit Table
                  </button>
                ) : (
                  <button
                    onClick={() => handleSaveTable(table.id)}
                    className="px-3 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors text-sm"
                  >
                    Save Table
                  </button>
                )}
                <button
                  onClick={() => removeTable(table.id)}
                  className="px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors text-sm"
                >
                  Remove Table
                </button>
              </div>
            </div>

            {/* Columns Section - Only show if not saved */}
            {!isTableSaved(table.id) && (
              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700">Columns:</label>
                  <button
                    onClick={() => openColumnDialog(table.id)}
                    className="px-3 py-1 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors text-sm"
                  >
                    + Add Column
                  </button>
                </div>

                {table.columns.length === 0 && (
                  <p className="text-sm text-gray-500 italic">No columns yet. Add columns to define the table structure.</p>
                )}

                {table.columns.map((column, colIdx) => (
                  <div 
                    key={colIdx} 
                    className={`p-3 bg-gray-50 rounded border border-gray-200 cursor-move ${
                      draggedColumn === colIdx ? 'opacity-50' : ''
                    } ${dragOverIndex === colIdx ? 'border-blue-500 border-2' : ''}`}
                    draggable
                    onDragStart={(e) => {
                      setDraggedColumn(colIdx);
                      e.dataTransfer.effectAllowed = 'move';
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                      setDragOverIndex(colIdx);
                    }}
                    onDragLeave={() => {
                      setDragOverIndex(null);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (draggedColumn !== null && draggedColumn !== colIdx) {
                        moveColumn(table.id, draggedColumn, colIdx);
                      }
                      setDraggedColumn(null);
                      setDragOverIndex(null);
                    }}
                    onDragEnd={() => {
                      setDraggedColumn(null);
                      setDragOverIndex(null);
                    }}
                  >
                    <div className="flex items-start gap-2 mb-2">
                      <div className="cursor-move text-gray-400 hover:text-gray-600 mr-1">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-gray-800">{column.name || 'Unnamed Column'}</span>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            column.type === 'PK' ? 'bg-green-100 text-green-800' :
                            column.type === 'FK' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {column.type}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 italic">
                          {getMappingDescription(column)}
                        </p>
                        {column.mappingType && (
                          <span className="text-xs text-blue-600 ml-2">
                            ({column.mappingType})
                          </span>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => openColumnDialog(table.id, colIdx)}
                          className="px-2 py-1 bg-blue-400 text-white rounded-md hover:bg-blue-500 transition-colors text-sm"
                          title="Edit column"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => removeColumn(table.id, colIdx)}
                          className="px-2 py-1 bg-red-400 text-white rounded-md hover:bg-red-500 transition-colors text-sm"
                          title="Delete column"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Data Preview - Only show when table is saved */}
            {isTableSaved(table.id) && tablePreview.length > 0 && (
              <div className="mt-6 border-t pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-gray-800">Data Preview ({tablePreview.length} rows):</h4>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full border-collapse border border-gray-300 text-sm">
                    <thead>
                      <tr className="bg-gray-100">
                        {table.columns.map((col, idx) => (
                          <th
                            key={idx}
                            className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700"
                          >
                            {col.name}
                            {col.type === 'PK' && <span className="text-green-600 ml-1">(PK)</span>}
                            {col.type === 'FK' && <span className="text-blue-600 ml-1">(FK)</span>}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {tablePreview.slice(0, 10).map((row, rowIdx) => (
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
                  {tablePreview.length > 10 && (
                    <p className="text-xs text-gray-500 mt-2">
                      Showing first 10 of {tablePreview.length} rows
                    </p>
                  )}
                </div>
              </div>
            )}

            {!isTableSaved(table.id) && table.columns.length > 0 && tablePreview.length === 0 && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                <p className="text-sm text-yellow-800">
                  Click "Save Table" to generate a data preview based on your column mappings.
                </p>
              </div>
            )}
          </div>
        );
      })}

      {/* Column Mapping Dialog */}
      <ColumnMappingDialog
        isOpen={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setCurrentTableId(null);
          setEditingColumnIndex(null);
        }}
        onAddColumn={handleAddColumn}
        availableSourceColumns={rawData?.columns || []}
        mappedColumns={currentTableId ? getMappedColsForTable(currentTableId) : []}
        existingColumn={editingColumnIndex !== null && currentTableId 
          ? tables.find(t => t.id === currentTableId)?.columns[editingColumnIndex] 
          : null}
        tableId={currentTableId}
        tables={tables}
        onTablesChange={onTablesChange}
      />
    </div>
  );
}
