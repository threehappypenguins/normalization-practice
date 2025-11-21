/**
 * Data Transformer Utility
 * Generates preview data for tables based on column mappings
 */

/**
 * Convert previous form's tables into a flat structure similar to rawData
 * This allows us to reuse the same data generation logic
 * @param {Array} previousFormTables - Array of table definitions from previous form
 * @param {Object} rawData - Original raw data (used as fallback for generating previews)
 * @returns {Object} Object with columns and rows, where columns are "tableName.columnName"
 */
export function flattenPreviousFormTables(previousFormTables, rawData) {
  const columns = [];
  const rows = [];
  const tableDataMap = new Map(); // Map table.id to its generated data

  // First, generate data for each previous form table
  previousFormTables.forEach(prevTable => {
    if (prevTable.saved && rawData) {
      const tableData = generateTableDataFromRaw(prevTable, rawData);
      tableDataMap.set(prevTable.id, tableData);
    }
  });

  // Create column names as "tableName.columnName"
  previousFormTables.forEach(prevTable => {
    prevTable.columns.forEach(col => {
      const columnName = `${prevTable.name}.${col.name}`;
      columns.push(columnName);
    });
  });

  // Generate rows by combining data from all previous tables
  // We need to create a cartesian product of rows from all tables
  // For simplicity, we'll create rows where each row contains data from one table
  // and empty values for other tables (this is a simplified approach)
  
  // Get max number of rows across all tables
  let maxRows = 0;
  previousFormTables.forEach(prevTable => {
    const tableData = tableDataMap.get(prevTable.id) || [];
    maxRows = Math.max(maxRows, tableData.length);
  });

  // Create rows
  for (let i = 0; i < maxRows; i++) {
    const row = [];
    previousFormTables.forEach(prevTable => {
      const tableData = tableDataMap.get(prevTable.id) || [];
      const tableRow = tableData[i] || [];
      
      // Add data for this table's columns
      prevTable.columns.forEach((col, colIdx) => {
        row.push(tableRow[colIdx] || '');
      });
    });
    rows.push(row);
  }

  return { columns, rows };
}

/**
 * Generate table data preview from raw data (original implementation)
 * @param {Object} table - Table definition with columns and mappings
 * @param {Object} rawData - Raw data object with columns and rows
 * @returns {Array} Array of rows for the table
 */
function generateTableDataFromRaw(table, rawData) {
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

    if (masterSourceColIndices.length === 0) {
      // No valid source columns found
      return [];
    }

    // Process each raw data row
    rawRows.forEach((rawRow, rawRowIdx) => {
      // For each source column in the consolidation group
      masterSourceColIndices.forEach((sourceColIndex, sourceIdx) => {
        // Make sure we have a valid index
        if (sourceColIndex < 0 || sourceColIndex >= rawRow.length) {
          return;
        }
        
        const cellValue = rawRow[sourceColIndex];
        const sourceColName = masterSourceCols[sourceIdx];
        
        // Only create a row if the cell has a value (not empty)
        // Check if value exists and is not just whitespace
        const hasValue = cellValue !== null && 
                        cellValue !== undefined && 
                        String(cellValue).trim() !== '';
        
        if (hasValue) {
          const newRow = [];

          // Process each column in the table definition in order
          table.columns.forEach(col => {
            if (col.mappingType === 'direct') {
              // Direct mapping: copy value from source column
              if (col.sourceCols && col.sourceCols.length > 0) {
                const sourceColIndex = rawColumns.indexOf(col.sourceCols[0]);
                newRow.push(sourceColIndex !== -1 ? rawRow[sourceColIndex] : '');
              } else {
                newRow.push('');
              }
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
  // But be careful - we only want to remove truly identical rows
  // For normalization, duplicate rows might be valid (e.g., same crew member on different trips)
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
 * Generate table data preview based on column mappings
 * Works with either rawData or previousFormTables
 * @param {Object} table - Table definition with columns and mappings
 * @param {Object} rawData - Raw data object with columns and rows (for 1NF)
 * @param {Array} previousFormTables - Previous form's tables (for 2NF/3NF)
 * @returns {Array} Array of rows for the table
 */
export function generateTableData(table, rawData, previousFormTables = null, previousPreviousFormTables = null) {
  // If we have previous form tables, use them as the source
  if (previousFormTables && previousFormTables.length > 0) {
    return generateTableDataFromPreviousForm(table, previousFormTables, rawData, previousPreviousFormTables);
  }
  
  // Otherwise, use raw data (for 1NF)
  return generateTableDataFromRaw(table, rawData);
}

/**
 * Generate table data from previous form's tables
 * @param {Object} table - Table definition with columns and mappings
 * @param {Array} previousFormTables - Previous form's tables
 * @param {Object} rawData - Original raw data (needed to generate previews of previous tables)
 * @param {Array} previousPreviousFormTables - Previous-previous form's tables (for 3NF: 1NF tables to generate 2NF from)
 * @returns {Array} Array of rows for the table
 */
function generateTableDataFromPreviousForm(table, previousFormTables, rawData, previousPreviousFormTables = null) {
  if (!table.columns || table.columns.length === 0) {
    return [];
  }

  // Helper function to normalize table/column names for matching
  const normalizeName = (name) => {
    if (!name) return '';
    return name.trim().toLowerCase().replace(/\s+/g, '_');
  };

  // Helper function to flexibly match table names (similar to validator)
  // Allows "FLIGHT" to match "FLIGHT_DETAILS" and vice versa
  const tablesMatch = (tableName1, tableName2) => {
    const norm1 = normalizeName(tableName1);
    const norm2 = normalizeName(tableName2);
    
    // Exact match
    if (norm1 === norm2) return true;
    
    // One contains the other (e.g., "FLIGHT" matches "FLIGHT_DETAILS")
    if (norm1.includes(norm2) || norm2.includes(norm1)) return true;
    
    // Word-based matching
    const words1 = norm1.split(/[_\s]+/).filter(w => w.length > 0);
    const words2 = norm2.split(/[_\s]+/).filter(w => w.length > 0);
    
    if (words1.length > 0 && words2.length > 0) {
      // Check if all words from table1 appear in table2
      const allWords1Match = words1.every(w1 => 
        words2.some(w2 => 
          w1 === w2 || w1.startsWith(w2) || w2.startsWith(w1) ||
          w1.includes(w2) || w2.includes(w1)
        )
      );
      
      // Check if all words from table2 appear in table1
      const allWords2Match = words2.every(w2 =>
        words1.some(w1 =>
          w2 === w1 || w2.startsWith(w1) || w1.startsWith(w2) ||
          w2.includes(w1) || w1.includes(w2)
        )
      );
      
      if (allWords1Match || allWords2Match) return true;
    }
    
    return false;
  };

  // Helper function to find a matching table in previousFormTables
  const findMatchingTable = (targetTableName) => {
    return previousFormTables.find(t => tablesMatch(t.name, targetTableName));
  };

  // Collect all solution table names referenced in sourceCols for reverse mapping
  const solutionTableNames = new Set();
  table.columns.forEach(col => {
    if (col.sourceCols && col.sourceCols.length > 0) {
      col.sourceCols.forEach(sourceCol => {
        if (sourceCol.includes('.')) {
          const solutionTableName = sourceCol.split('.')[0];
          solutionTableNames.add(solutionTableName);
        }
      });
    }
  });

  // First, generate data for each previous form table and create a lookup map
  const previousTableDataMap = new Map();
  const columnDataMap = new Map(); // Maps "tableName.columnName" to array of values
  
  previousFormTables.forEach(prevTable => {
    if (prevTable.saved && rawData) {
      // For 3NF: if we have previousPreviousFormTables (1NF), generate 2NF from 1NF
      // For 2NF: generate 1NF from rawData
      let tableData;
      if (previousPreviousFormTables && previousPreviousFormTables.length > 0) {
        // Generate previous form (2NF) from previous-previous form (1NF)
        tableData = generateTableData(prevTable, rawData, previousPreviousFormTables);
      } else {
        // Generate previous form (1NF) from rawData
        tableData = generateTableDataFromRaw(prevTable, rawData);
      }
      
      previousTableDataMap.set(prevTable.id, {
        table: prevTable,
        data: tableData,
        columnMap: new Map(prevTable.columns.map((col, idx) => [col.name, idx]))
      });
      
      // Create column data map for easy lookup
      prevTable.columns.forEach((col, colIdx) => {
        const columnKey = `${prevTable.name}.${col.name}`;
        const columnValues = tableData.map(row => row[colIdx]);
        
        // Store with exact key (user's table name)
        columnDataMap.set(columnKey, columnValues);
        
        // Always store with normalized key for flexible matching
        const normalizedKey = `${normalizeName(prevTable.name)}.${normalizeName(col.name)}`;
        columnDataMap.set(normalizedKey, columnValues);
        
        // Also store with solution table names if this table matches any solution table
        // This allows lookups like "FLIGHT_DETAILS.CHAR_TRIP" to find "FLIGHT.CHAR_TRIP"
        solutionTableNames.forEach(solutionTableName => {
          if (tablesMatch(prevTable.name, solutionTableName)) {
            const solutionKey = `${solutionTableName}.${col.name}`;
            columnDataMap.set(solutionKey, columnValues);
            const normalizedSolutionKey = `${normalizeName(solutionTableName)}.${normalizeName(col.name)}`;
            columnDataMap.set(normalizedSolutionKey, columnValues);
          }
        });
        
        // Also allow lookup by just column name (for backward compatibility)
        if (!columnDataMap.has(col.name)) {
          columnDataMap.set(col.name, columnValues);
        }
        
        // Store with normalized column name too
        const normalizedColName = normalizeName(col.name);
        if (!columnDataMap.has(normalizedColName)) {
          columnDataMap.set(normalizedColName, columnValues);
        }
      });
    }
  });

  // Find the primary source table - the one that has the most columns referenced
  // This helps us determine which table's rows to iterate over
  const sourceTableUsage = new Map();
  table.columns.forEach(col => {
    if (col.sourceCols && col.sourceCols.length > 0) {
      col.sourceCols.forEach(sourceCol => {
        // Extract table name from "tableName.columnName" format
        let tableName = null;
        if (sourceCol.includes('.')) {
          tableName = sourceCol.split('.')[0];
        } else {
          // Try to find which table this column belongs to
          for (const prevTable of previousFormTables) {
            if (prevTable.columns.some(c => c.name === sourceCol)) {
              tableName = prevTable.name;
              break;
            }
          }
        }
        if (tableName) {
          sourceTableUsage.set(tableName, (sourceTableUsage.get(tableName) || 0) + 1);
        }
      });
    }
  });

  // Find the most referenced table (or use the first one if none found)
  let primaryTableName = null;
  let maxUsage = 0;
  sourceTableUsage.forEach((usage, tableName) => {
    if (usage > maxUsage) {
      maxUsage = usage;
      primaryTableName = tableName;
    }
  });

  if (!primaryTableName && previousFormTables.length > 0) {
    primaryTableName = previousFormTables[0].name;
  }

  // Get the primary table's data - use flexible matching
  const primaryTable = findMatchingTable(primaryTableName);
  if (!primaryTable || !primaryTable.saved || !rawData) {
    return [];
  }

  // For 3NF: generate 2NF from 1NF; for 2NF: generate 1NF from rawData
  let primaryTableData;
  if (previousPreviousFormTables && previousPreviousFormTables.length > 0) {
    primaryTableData = generateTableData(primaryTable, rawData, previousPreviousFormTables);
  } else {
    primaryTableData = generateTableDataFromRaw(primaryTable, rawData);
  }
  const primaryTableColumnMap = new Map(primaryTable.columns.map((col, idx) => [col.name, idx]));

  const getValueByColumnName = (columnName, rowIdx) => {
    if (!columnName) return '';
    const normalizedTarget = normalizeName(columnName);
    for (const [, tableInfo] of previousTableDataMap.entries()) {
      for (const [colName, idx] of tableInfo.columnMap.entries()) {
        if (normalizeName(colName) === normalizedTarget) {
          if (rowIdx < tableInfo.data.length) {
            const val = tableInfo.data[rowIdx][idx];
            if (val !== null && val !== undefined && val !== '') {
              return val;
            }
          }
        }
      }
    }
    return '';
  };

  // Helper function to get value from a source column at a specific row index
  const getValueFromSource = (sourceCol, rowIdx) => {
    if (!sourceCol) return '';
    
    // Try "tableName.columnName" format first
    if (sourceCol.includes('.')) {
      const [tableName, columnName] = sourceCol.split('.', 2);
      const normalizedTableName = normalizeName(tableName);
      const normalizedColumnName = normalizeName(columnName);
      
      // Try exact match first
      let values = columnDataMap.get(sourceCol);
      if (values && rowIdx < values.length) {
        const val = values[rowIdx];
        if (val !== null && val !== undefined) {
          return val;
        }
      }
      
      // Try normalized match
      const normalizedKey = `${normalizedTableName}.${normalizedColumnName}`;
      values = columnDataMap.get(normalizedKey);
      if (values && rowIdx < values.length) {
        const val = values[rowIdx];
        if (val !== null && val !== undefined) {
          return val;
        }
      }
      
      // Try to find by matching table and column names in previousTableDataMap
      // This is the most reliable method - directly access the data
      // Use flexible table name matching
      for (const [tableId, tableInfo] of previousTableDataMap.entries()) {
        const prevTable = tableInfo.table;
        if (tablesMatch(prevTable.name, tableName)) {
          // Try exact column name match first
          let colIdx = tableInfo.columnMap.get(columnName);
          if (colIdx !== undefined && rowIdx < tableInfo.data.length) {
            const val = tableInfo.data[rowIdx][colIdx];
            if (val !== null && val !== undefined) {
              return val;
            }
          }
          // Try normalized column name match
          for (const [colName, idx] of tableInfo.columnMap.entries()) {
            if (normalizeName(colName) === normalizedColumnName) {
              if (rowIdx < tableInfo.data.length) {
                const val = tableInfo.data[rowIdx][idx];
                if (val !== null && val !== undefined) {
                  return val;
                }
              }
            }
          }
        }
      }
      
      
      // Fallback: try case-insensitive matching in columnDataMap
      for (const [key, val] of columnDataMap.entries()) {
        if (key.includes('.')) {
          const [keyTable, keyCol] = key.split('.', 2);
          if (normalizeName(keyTable) === normalizedTableName && 
              normalizeName(keyCol) === normalizedColumnName) {
            if (rowIdx < val.length) {
              const result = val[rowIdx];
              if (result !== null && result !== undefined) {
                return result;
              }
            }
          }
        }
      }

      // Try by column name alone as a last resort
      const alt = getValueByColumnName(columnName, rowIdx);
      if (alt) {
        return alt;
      }
    }
    
    // Try primary table first (by column name only)
    const colIdx = primaryTableColumnMap.get(sourceCol);
    if (colIdx !== undefined && rowIdx < primaryTableData.length) {
      return primaryTableData[rowIdx][colIdx] || '';
    }
    
    // Try case-insensitive match in primary table
    for (const [colName, idx] of primaryTableColumnMap.entries()) {
      if (normalizeName(colName) === normalizeName(sourceCol)) {
        if (rowIdx < primaryTableData.length) {
          return primaryTableData[rowIdx][idx] || '';
        }
      }
    }
    
    // Try other tables via columnDataMap (by column name only)
    const values = columnDataMap.get(sourceCol);
    if (values && rowIdx < values.length) {
      return values[rowIdx] || '';
    }
    
    // Try case-insensitive match in columnDataMap
    for (const [key, val] of columnDataMap.entries()) {
      if (!key.includes('.') && normalizeName(key) === normalizeName(sourceCol)) {
        if (rowIdx < val.length) {
          return val[rowIdx] || '';
        }
      }
    }
    
    return '';
  };

  // Determine which table to iterate over based on source column references
  // If all columns reference the same table, use that table
  // Otherwise, use the primary table
  let sourceTableForIteration = primaryTable;
  let sourceTableData = primaryTableData;
  
  // Check if all source columns reference the same table
  const referencedTables = new Set();
  table.columns.forEach(col => {
    if (col.sourceCols && col.sourceCols.length > 0) {
      col.sourceCols.forEach(sourceCol => {
        if (sourceCol.includes('.')) {
          const tableName = sourceCol.split('.')[0];
          referencedTables.add(tableName);
        }
      });
    }
  });
  
  // If all columns reference a single table, use that table for iteration
  if (referencedTables.size === 1) {
    const targetTableName = Array.from(referencedTables)[0];
    const targetTable = findMatchingTable(targetTableName);
    if (targetTable && targetTable.saved && rawData) {
      sourceTableForIteration = targetTable;
      // For 3NF: generate 2NF from 1NF; for 2NF: generate 1NF from rawData
      if (previousPreviousFormTables && previousPreviousFormTables.length > 0) {
        sourceTableData = generateTableData(targetTable, rawData, previousPreviousFormTables);
      } else {
        sourceTableData = generateTableDataFromRaw(targetTable, rawData);
      }
    }
  }

  // Generate rows based on the source table's rows
  // Use ALL rows from the source table to ensure we don't miss any
  const rows = [];
  for (let rowIdx = 0; rowIdx < sourceTableData.length; rowIdx++) {
    const sourceRow = sourceTableData[rowIdx];
    const newRow = [];
    
    table.columns.forEach((col, colIdx) => {
      let value = '';
      
      if (col.mappingType === 'direct' && col.sourceCols && col.sourceCols.length > 0) {
        // Direct mapping: get value from source column
        // Try each sourceCol until we find a value
        for (const sourceCol of col.sourceCols) {
          value = getValueFromSource(sourceCol, rowIdx);
          if (value) break;
        }
      } else if (col.mappingType === 'consolidate' && col.sourceCols && col.sourceCols.length > 0) {
        // Consolidation from previous form: the source column already contains consolidated data
        const columnName = col.name;
        
        // First, try the sourceCols (should be "tableName.columnName" format)
        for (const sourceCol of col.sourceCols) {
          value = getValueFromSource(sourceCol, rowIdx);
          if (value) break;
        }
        
        // If that didn't work, try finding by column name in previous tables as fallback
        if (!value) {
          value = getValueByColumnName(columnName, rowIdx);
        }

        if (!value) {
          for (const sourceCol of col.sourceCols) {
            const plainName = sourceCol.includes('.') ? sourceCol.split('.').pop() : sourceCol;
            value = getValueByColumnName(plainName, rowIdx);
            if (value) break;
          }
        }
      } else if (col.mappingType === 'metadata' && col.sourceCols && col.sourceCols.length > 0) {
        // Metadata: get the actual value from the previous table's metadata column
        const columnName = col.name;
        
        // First, try the sourceCols (should be "tableName.columnName" format)
        for (const sourceCol of col.sourceCols) {
          value = getValueFromSource(sourceCol, rowIdx);
          if (value) break;
        }
        
        // If that didn't work, try finding by column name in previous tables as fallback
        if (!value) {
          value = getValueByColumnName(columnName, rowIdx);
        }

        if (!value) {
          for (const sourceCol of col.sourceCols) {
            const plainName = sourceCol.includes('.') ? sourceCol.split('.').pop() : sourceCol;
            value = getValueByColumnName(plainName, rowIdx);
            if (value) break;
          }
        }
      }
      
      newRow.push(value);
    });
    
    // Always add the row - even if some values are empty, they might be valid empty values
    // or the lookup might have failed (which we'll handle separately)
    rows.push(newRow);
  }

  // For tables with primary keys, deduplicate based on PK values
  // For relationship tables (with both FK and PK), include FK columns in the key
  // For tables without PKs, remove only truly identical rows
  const pkColumnIndices = [];
  const fkColumnIndices = [];
  table.columns.forEach((col, idx) => {
    if (col.type === 'PK') {
      pkColumnIndices.push(idx);
    } else if (col.type === 'FK') {
      fkColumnIndices.push(idx);
    }
  });

  if (pkColumnIndices.length > 0) {
    // For relationship tables (with both FK and PK), use composite key
    // For entity tables (only PK, no FK), use PK only
    const keyColumnIndices = fkColumnIndices.length > 0 
      ? [...fkColumnIndices, ...pkColumnIndices]  // Relationship table: FK + PK
      : pkColumnIndices;  // Entity table: PK only
    
    const uniqueRows = [];
    const seenKeys = new Set();
    
    rows.forEach(row => {
      // Create a key from key column values (FK + PK for relationship tables, PK only for entity tables)
      const key = JSON.stringify(keyColumnIndices.map(idx => row[idx]));
      
      // Only add if we haven't seen this key combination before
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        uniqueRows.push(row);
      }
    });
    
    return uniqueRows;
  }

  // For tables without PKs, remove only truly identical rows
  const uniqueRows = [];
  const seenRows = new Set();
  rows.forEach((row) => {
    const key = JSON.stringify(row);
    if (!seenRows.has(key)) {
      seenRows.add(key);
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
 * @param {Array} rawColumns - Array of raw data column names (for 1NF)
 * @param {Array} previousFormTables - Previous form's tables (for 2NF/3NF)
 * @returns {Object} Statistics object
 */
export function getMappingStats(tables, rawColumns, previousFormTables = null) {
  const mapped = getMappedColumns(tables);
  
  // Determine source columns based on whether we're using previous form tables
  let sourceColumns = [];
  if (previousFormTables && previousFormTables.length > 0) {
    // Extract all columns from previous form tables
    previousFormTables.forEach(prevTable => {
      prevTable.columns.forEach(col => {
        sourceColumns.push(`${prevTable.name}.${col.name}`);
      });
    });
  } else {
    sourceColumns = rawColumns || [];
  }
  
  const total = sourceColumns.length;
  const mappedCount = mapped.size;
  const unmappedCount = total - mappedCount;
  const percentage = total > 0 ? Math.round((mappedCount / total) * 100) : 0;

  return {
    total,
    mapped: mappedCount,
    unmapped: unmappedCount,
    percentage,
    mappedColumns: Array.from(mapped),
    unmappedColumns: sourceColumns.filter(col => !mapped.has(col))
  };
}

/**
 * Get available source columns for column mapping dialog
 * Returns columns from previous form tables (for 2NF/3NF) or raw data (for 1NF)
 * @param {Object} rawData - Raw data object (for 1NF)
 * @param {Array} previousFormTables - Previous form's tables (for 2NF/3NF)
 * @returns {Array} Array of column names
 */
export function getAvailableSourceColumns(rawData, previousFormTables = null) {
  if (previousFormTables && previousFormTables.length > 0) {
    // Return columns from previous form tables in format "tableName.columnName"
    const columns = [];
    previousFormTables.forEach(prevTable => {
      prevTable.columns.forEach(col => {
        columns.push(`${prevTable.name}.${col.name}`);
      });
    });
    return columns;
  }
  
  // For 1NF, return raw data columns
  return rawData?.columns || [];
}
