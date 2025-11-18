/**
 * Data Transformer Utility
 * Generates preview data for tables based on column mappings
 */

/**
 * Generate table data preview based on column mappings
 * @param {Object} table - Table definition with columns and mappings
 * @param {Object} rawData - Raw data object with columns and rows
 * @returns {Array} Array of rows for the table
 */
export function generateTableData(table, rawData) {
  if (!table.columns || table.columns.length === 0) {
    return [];
  }

  const rows = [];
  const rawRows = rawData.rows || [];
  const rawColumns = rawData.columns || [];

  // Find columns that need consolidation (many-to-1)
  const consolidationColumns = table.columns.filter(
    col => col.mappingType === 'consolidate' && col.sourceCols && col.sourceCols.length > 0
  );

  // Find metadata columns (column names as values)
  const metadataColumns = table.columns.filter(
    col => col.mappingType === 'metadata' && col.sourceCols && col.sourceCols.length > 0
  );

  // If we have consolidation columns, we need to "unpivot" the data
  if (consolidationColumns.length > 0) {
    // Use the first consolidation column's source columns as the master list
    // All consolidation/metadata columns should use the same source columns (same positions)
    const masterSourceCols = consolidationColumns[0].sourceCols;
    const masterSourceColIndices = masterSourceCols.map(colName => 
      rawColumns.indexOf(colName)
    ).filter(idx => idx !== -1);

    // Process each raw data row
    rawRows.forEach((rawRow) => {
      // For each source column in the consolidation group
      masterSourceColIndices.forEach((sourceColIndex, sourceIdx) => {
        const cellValue = rawRow[sourceColIndex];
        const sourceColName = masterSourceCols[sourceIdx];
        
        // Only create a row if the cell has a value (not empty)
        if (cellValue && cellValue.trim() !== '') {
          const newRow = [];

          // Process each column in the table definition in order
          table.columns.forEach(col => {
            if (col.mappingType === 'direct') {
              // Direct mapping: copy value from source column
              const sourceColIndex = rawColumns.indexOf(col.sourceCols[0]);
              newRow.push(sourceColIndex !== -1 ? rawRow[sourceColIndex] : '');
            } else if (col.mappingType === 'consolidate') {
              // Consolidation: get value from the corresponding source column
              // Find the source column at the same position in this consolidation column's sourceCols
              if (col.sourceCols && col.sourceCols.length > sourceIdx) {
                const correspondingSourceCol = col.sourceCols[sourceIdx];
                const correspondingSourceColIndex = rawColumns.indexOf(correspondingSourceCol);
                newRow.push(correspondingSourceColIndex !== -1 ? rawRow[correspondingSourceColIndex] : '');
              } else {
                newRow.push('');
              }
            } else if (col.mappingType === 'metadata') {
              // Metadata: use the source column name as the value
              newRow.push(sourceColName || '');
            } else {
              newRow.push('');
            }
          });

          rows.push(newRow);
        }
      });
    });
  } else {
    // No consolidation needed - simple direct mapping
    rawRows.forEach(rawRow => {
      const newRow = [];
      table.columns.forEach(col => {
        if (col.mappingType === 'direct' && col.sourceCols && col.sourceCols.length > 0) {
          const sourceColIndex = rawColumns.indexOf(col.sourceCols[0]);
          newRow.push(sourceColIndex !== -1 ? rawRow[sourceColIndex] : '');
        } else {
          newRow.push('');
        }
      });
      rows.push(newRow);
    });
  }

  // Remove duplicate rows (in case of multiple consolidation columns)
  const uniqueRows = [];
  const seen = new Set();
  rows.forEach(row => {
    const key = JSON.stringify(row);
    if (!seen.has(key)) {
      seen.add(key);
      uniqueRows.push(row);
    }
  });

  return uniqueRows;
}

/**
 * Get list of mapped source columns from all tables
 * @param {Array} tables - Array of table definitions
 * @returns {Set} Set of mapped column names
 */
export function getMappedColumns(tables) {
  const mapped = new Set();
  
  tables.forEach(table => {
    if (table.columns) {
      table.columns.forEach(col => {
        if (col.sourceCols) {
          col.sourceCols.forEach(sourceCol => {
            mapped.add(sourceCol);
          });
        }
      });
    }
  });
  
  return mapped;
}

/**
 * Get mapping statistics
 * @param {Array} tables - Array of table definitions
 * @param {Array} rawColumns - Array of raw data column names
 * @returns {Object} Statistics object
 */
export function getMappingStats(tables, rawColumns) {
  const mapped = getMappedColumns(tables);
  const total = rawColumns.length;
  const mappedCount = mapped.size;
  const unmappedCount = total - mappedCount;
  const percentage = total > 0 ? Math.round((mappedCount / total) * 100) : 0;

  return {
    total,
    mapped: mappedCount,
    unmapped: unmappedCount,
    percentage,
    mappedColumns: Array.from(mapped),
    unmappedColumns: rawColumns.filter(col => !mapped.has(col))
  };
}

