import React, { useState, useEffect } from 'react';

export default function ColumnMappingDialog({
  isOpen,
  onClose,
  onAddColumn,
  availableSourceColumns,
  mappedColumns = [],
  existingColumn = null,
  tableId = null,
  tables = [],
  onTablesChange = null
}) {
  const [columnName, setColumnName] = useState('');
  const [mappingType, setMappingType] = useState('direct');
  const [selectedSourceCols, setSelectedSourceCols] = useState([]);
  const [columnType, setColumnType] = useState('attribute');
  const [foreignKeyTable, setForeignKeyTable] = useState('');

  // Get crossed out columns from table state (persisted)
  const getCrossedOutCols = () => {
    if (!tableId) return new Set();
    const table = tables.find(t => t.id === tableId);
    return new Set(table?.crossedOutColumns || []);
  };

  const [crossedOutCols, setCrossedOutCols] = useState(getCrossedOutCols());

  // Update crossed out columns in table state
  const updateCrossedOutCols = (newSet) => {
    setCrossedOutCols(newSet);
    if (tableId && onTablesChange) {
      onTablesChange(tables.map(t => 
        t.id === tableId 
          ? { ...t, crossedOutColumns: Array.from(newSet) }
          : t
      ));
    }
  };

  // Ensure mappedColumns is always an array
  const mappedColsArray = Array.isArray(mappedColumns) ? mappedColumns : Array.from(mappedColumns || []);
  const isEditing = existingColumn !== null;

  // Show all columns, with mapped ones available but greyed out
  const getAvailableColumns = () => {
    // Always show all columns so user can see mapped ones greyed out
    return availableSourceColumns;
  };

  const availableCols = getAvailableColumns();

  const toggleCrossOut = (colName) => {
    const newSet = new Set(crossedOutCols);
    if (newSet.has(colName)) {
      newSet.delete(colName);
    } else {
      newSet.add(colName);
    }
    updateCrossedOutCols(newSet);
  };

  // Pre-populate form when editing existing column
  useEffect(() => {
    if (existingColumn) {
      setColumnName(existingColumn.name || '');
      setMappingType(existingColumn.mappingType || 'direct');
      setSelectedSourceCols(existingColumn.sourceCols || []);
      setColumnType(existingColumn.type || 'attribute');
      setForeignKeyTable(existingColumn.foreignKeyTable || '');
    } else {
      // Reset form when adding new column
      setColumnName('');
      setMappingType('direct');
      setSelectedSourceCols([]);
      setColumnType('attribute');
      setForeignKeyTable('');
    }
    // Load crossed out columns from table state when dialog opens
    if (isOpen) {
      setCrossedOutCols(getCrossedOutCols());
    }
  }, [existingColumn, isOpen, tableId, tables]);

  useEffect(() => {
    // Reset selections when mapping type changes (but preserve if editing)
    if (!existingColumn) {
      setSelectedSourceCols([]);
    }
  }, [mappingType, existingColumn]);

  const handleSourceColToggle = (colName) => {
    if (mappingType === 'direct') {
      // Single selection for direct mapping
      setSelectedSourceCols([colName]);
    } else {
      // Multiple selection for consolidation and metadata
      setSelectedSourceCols(prev => {
        if (prev.includes(colName)) {
          return prev.filter(c => c !== colName);
        } else {
          return [...prev, colName];
        }
      });
    }
  };

  const handleAdd = () => {
    if (!columnName.trim()) {
      alert('Please enter a column name');
      return;
    }

    if (selectedSourceCols.length === 0) {
      alert('Please select at least one source column');
      return;
    }

    if (mappingType === 'direct' && selectedSourceCols.length > 1) {
      alert('Direct mapping can only use one source column');
      return;
    }

    const newColumn = {
      name: columnName.trim(),
      type: columnType,
      mappingType: mappingType,
      sourceCols: selectedSourceCols,
      ...(columnType === 'FK' && foreignKeyTable ? { foreignKeyTable } : {})
    };

    onAddColumn(newColumn);
    
    // Reset form
    setColumnName('');
    setMappingType('direct');
    setSelectedSourceCols([]);
    setColumnType('attribute');
    setForeignKeyTable('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <h3 className="text-2xl font-bold text-gray-800 mb-4">
          {isEditing ? 'Edit Column' : 'Add New Column'}
        </h3>

        {/* Column Name */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Column Name:
          </label>
          <input
            type="text"
            value={columnName}
            onChange={(e) => setColumnName(e.target.value)}
            placeholder="e.g., CREW_MEMBER"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Mapping Type */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Mapping Type:
          </label>
          <div className="space-y-2">
            <label className="flex items-center p-3 border rounded-md cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                value="direct"
                checked={mappingType === 'direct'}
                onChange={(e) => setMappingType(e.target.value)}
                className="mr-3"
              />
              <div>
                <span className="font-medium">Direct (1-to-1)</span>
                <p className="text-sm text-gray-600">Source column data flows directly to new column unchanged</p>
              </div>
            </label>
            <label className="flex items-center p-3 border rounded-md cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                value="consolidate"
                checked={mappingType === 'consolidate'}
                onChange={(e) => setMappingType(e.target.value)}
                className="mr-3"
              />
              <div>
                <span className="font-medium">Consolidate Data (Many-to-1)</span>
                <p className="text-sm text-gray-600">Values from multiple source columns are combined into separate rows</p>
              </div>
            </label>
            <label className="flex items-center p-3 border rounded-md cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                value="metadata"
                checked={mappingType === 'metadata'}
                onChange={(e) => setMappingType(e.target.value)}
                className="mr-3"
              />
              <div>
                <span className="font-medium">Use Column Names as Values</span>
                <p className="text-sm text-gray-600">The column names themselves become values (e.g., 'PILOT', 'COPILOT')</p>
              </div>
            </label>
          </div>
        </div>

        {/* Source Columns */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Source Columns:
            {mappingType === 'direct' && (
              <span className="text-xs text-gray-500 ml-2">(Select one)</span>
            )}
            {(mappingType === 'consolidate' || mappingType === 'metadata') && (
              <span className="text-xs text-gray-500 ml-2">(Select multiple)</span>
            )}
          </label>
          <div className="border border-gray-300 rounded-md p-3 max-h-48 overflow-y-auto">
            {availableCols.length === 0 ? (
              <p className="text-sm text-gray-500 italic">
                {mappingType === 'direct' 
                  ? 'No unmapped columns available' 
                  : 'No source columns available'}
              </p>
            ) : (
              <div className="space-y-2">
                {availableCols.map((col) => {
                  const isSelected = selectedSourceCols.includes(col);
                  const isMapped = mappedColsArray.includes(col);
                  const isCrossedOut = crossedOutCols.has(col);
                  return (
                    <div
                      key={col}
                      className={`flex items-center p-2 rounded ${
                        isSelected ? 'bg-blue-100' : 
                        isMapped ? 'bg-gray-100 opacity-60' : 
                        isCrossedOut ? 'bg-gray-50 opacity-40' : 
                        'hover:bg-gray-50'
                      }`}
                    >
                      <label className="flex items-center flex-1 cursor-pointer">
                        <input
                          type={mappingType === 'direct' ? 'radio' : 'checkbox'}
                          checked={isSelected}
                          onChange={() => handleSourceColToggle(col)}
                          disabled={
                            isCrossedOut || 
                            (mappingType === 'direct' && isMapped && !(isEditing && existingColumn?.sourceCols?.includes(col)))
                          }
                          className="mr-2"
                        />
                        <span className={`${
                          isMapped ? 'text-gray-400' : 
                          isCrossedOut ? 'text-gray-400 line-through' : 
                          ''
                        }`}>
                          {col}
                        </span>
                        {isMapped && (
                          <span className="ml-2 text-xs text-gray-500">(already mapped)</span>
                        )}
                      </label>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleCrossOut(col);
                        }}
                        className={`ml-2 px-2 py-1 rounded text-xs ${
                          isCrossedOut 
                            ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                            : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                        }`}
                        title={isCrossedOut ? 'Unmark as done' : 'Mark as done'}
                      >
                        {isCrossedOut ? '✓' : '○'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          {mappingType === 'consolidate' && selectedSourceCols.length > 0 && (
            <p className="mt-2 text-xs text-blue-600">
              ✓ Values from {selectedSourceCols.length} column(s) will be consolidated into separate rows
            </p>
          )}
          {mappingType === 'metadata' && selectedSourceCols.length > 0 && (
            <p className="mt-2 text-xs text-blue-600">
              ✓ Column names ({selectedSourceCols.join(', ')}) will become values
            </p>
          )}
        </div>

        {/* Column Type */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Column Type:
          </label>
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="radio"
                value="attribute"
                checked={columnType === 'attribute'}
                onChange={(e) => setColumnType(e.target.value)}
                className="mr-2"
              />
              <span>Attribute</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="PK"
                checked={columnType === 'PK'}
                onChange={(e) => setColumnType(e.target.value)}
                className="mr-2"
              />
              <span>Primary Key (PK)</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="FK"
                checked={columnType === 'FK'}
                onChange={(e) => setColumnType(e.target.value)}
                className="mr-2"
              />
              <span>Foreign Key (FK)</span>
            </label>
          </div>
        </div>

        {/* Foreign Key Reference (if FK selected) */}
        {columnType === 'FK' && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              References Table:
            </label>
            <input
              type="text"
              value={foreignKeyTable}
              onChange={(e) => setForeignKeyTable(e.target.value)}
              placeholder="e.g., CUSTOMER"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-3 justify-end mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleAdd}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
          >
            {isEditing ? 'Update Column' : 'Add Column'}
          </button>
        </div>
      </div>
    </div>
  );
}

