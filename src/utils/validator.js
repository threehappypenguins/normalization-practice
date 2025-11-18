/**
 * Validation Utility
 * Validates user's normalization solution against the correct solution
 */

/**
 * Normalize table/column names for comparison (case-insensitive, trim whitespace)
 */
function normalizeName(name) {
  return name.trim().toLowerCase().replace(/\s+/g, '_');
}

/**
 * Find matching column in solution (flexible name matching)
 */
function findMatchingColumn(userColName, solutionColumns) {
  const userNormalized = normalizeName(userColName);
  
  for (const solutionCol of solutionColumns) {
    const solutionNormalized = normalizeName(solutionCol.name);
    
    // Exact match
    if (userNormalized === solutionNormalized) {
      return solutionCol;
    }
    
    // One contains the other (e.g., "CREW_MEM" matches "CREW_MEMBER")
    if (userNormalized.includes(solutionNormalized) || solutionNormalized.includes(userNormalized)) {
      return solutionCol;
    }
    
    // Word-based matching
    const userWords = userNormalized.split(/[_\s]+/).filter(w => w.length > 0);
    const solutionWords = solutionNormalized.split(/[_\s]+/).filter(w => w.length > 0);
    
    if (userWords.length > 0 && solutionWords.length > 0) {
      const allUserWordsMatch = userWords.every(userWord => 
        solutionWords.some(solWord => 
          userWord === solWord || 
          userWord.startsWith(solWord) || 
          solWord.startsWith(userWord) ||
          userWord.includes(solWord) ||
          solWord.includes(userWord)
        )
      );
      
      const allSolutionWordsMatch = solutionWords.every(solWord =>
        userWords.some(userWord =>
          solWord === userWord ||
          solWord.startsWith(userWord) ||
          userWord.startsWith(solWord) ||
          solWord.includes(userWord) ||
          userWord.includes(solWord)
        )
      );
      
      if (allUserWordsMatch || allSolutionWordsMatch) {
        return solutionCol;
      }
    }
  }
  
  return null;
}

/**
 * Compare two column objects
 */
function columnsMatch(userCol, solutionCol) {
  const userNormalized = normalizeName(userCol.name);
  const solutionNormalized = normalizeName(solutionCol.name);
  
  // Use flexible matching
  if (userNormalized === solutionNormalized) {
    // Exact match - check type
  } else if (userNormalized.includes(solutionNormalized) || solutionNormalized.includes(userNormalized)) {
    // Contains match - check type
  } else {
    // Try word-based matching
    const userWords = userNormalized.split(/[_\s]+/).filter(w => w.length > 0);
    const solutionWords = solutionNormalized.split(/[_\s]+/).filter(w => w.length > 0);
    
    if (userWords.length > 0 && solutionWords.length > 0) {
      const allUserWordsMatch = userWords.every(userWord => 
        solutionWords.some(solWord => 
          userWord === solWord || 
          userWord.startsWith(solWord) || 
          solWord.startsWith(userWord) ||
          userWord.includes(solWord) ||
          solWord.includes(userWord)
        )
      );
      
      const allSolutionWordsMatch = solutionWords.every(solWord =>
        userWords.some(userWord =>
          solWord === userWord ||
          solWord.startsWith(userWord) ||
          userWord.startsWith(solWord) ||
          solWord.includes(userWord) ||
          userWord.includes(solWord)
        )
      );
      
      if (!(allUserWordsMatch || allSolutionWordsMatch)) {
        return false;
      }
    } else {
      return false;
    }
  }
  
  // Check type (PK, FK, attribute)
  const userType = userCol.type?.toUpperCase() || 'ATTRIBUTE';
  const solutionType = solutionCol.type?.toUpperCase() || 'ATTRIBUTE';
  
  // PK and FK should match exactly
  if (solutionType === 'PK' || solutionType === 'FK') {
    return userType === solutionType;
  }
  
  // For attributes, any type is acceptable (PK/FK/attribute)
  return true;
}

/**
 * Validate column mapping
 * @param {Object} userCol - User's column definition
 * @param {Object} solutionCol - Solution column definition
 * @returns {Object} Validation result with valid flag and error message
 */
function validateColumnMapping(userCol, solutionCol) {
  // If solution doesn't have mapping info, skip mapping validation
  if (!solutionCol.mappingType || !solutionCol.sourceCols) {
    return { valid: true };
  }

  // Check mapping type matches
  if (userCol.mappingType !== solutionCol.mappingType) {
    return {
      valid: false,
      error: `${userCol.name} should use ${solutionCol.mappingType} mapping (got ${userCol.mappingType || 'none'})`
    };
  }

  // Check source columns match (order doesn't matter)
  if (userCol.sourceCols && solutionCol.sourceCols) {
    const userSources = new Set(userCol.sourceCols.map(c => normalizeName(c)));
    const solutionSources = new Set(solutionCol.sourceCols.map(c => normalizeName(c)));
    
    if (userSources.size !== solutionSources.size) {
      return {
        valid: false,
        error: `${userCol.name} should map to ${solutionCol.sourceCols.length} source column(s): ${solutionCol.sourceCols.join(', ')}`
      };
    }

    // Check if all solution sources are in user sources
    for (const solSource of solutionSources) {
      if (!userSources.has(solSource)) {
        return {
          valid: false,
          error: `${userCol.name} should include source column: ${solutionCol.sourceCols.find(c => normalizeName(c) === solSource)}`
        };
      }
    }
  } else if (solutionCol.sourceCols && !userCol.sourceCols) {
    return {
      valid: false,
      error: `${userCol.name} is missing source column mapping`
    };
  }

  return { valid: true };
}

/**
 * Find all matching tables in solution (one user table can match multiple solution tables)
 * Uses flexible matching to allow variations like "FLIGHT" matching "FLIGHT_DETAILS"
 */
function findMatchingTables(userTable, solutionTables) {
  const userTableName = normalizeName(userTable.name);
  const matches = [];
  
  for (const solutionTable of solutionTables) {
    const solutionTableName = normalizeName(solutionTable.name);
    
    // Exact match
    if (userTableName === solutionTableName) {
      matches.push(solutionTable);
      continue;
    }
    
    // One contains the other (e.g., "FLIGHT" matches "FLIGHT_DETAILS")
    if (userTableName.includes(solutionTableName) || solutionTableName.includes(userTableName)) {
      matches.push(solutionTable);
      continue;
    }
    
    // Word-based matching (e.g., "CHARTER_TRIP" matches "CHARTERTRIP" or "CHARTER TRIP")
    const userWords = userTableName.split(/[_\s]+/).filter(w => w.length > 0);
    const solutionWords = solutionTableName.split(/[_\s]+/).filter(w => w.length > 0);
    
    // Check if all user words appear in solution (order doesn't matter)
    if (userWords.length > 0 && solutionWords.length > 0) {
      const allUserWordsMatch = userWords.every(userWord => 
        solutionWords.some(solWord => 
          userWord === solWord || 
          userWord.startsWith(solWord) || 
          solWord.startsWith(userWord) ||
          userWord.includes(solWord) ||
          solWord.includes(userWord)
        )
      );
      
      // Also check if all solution words appear in user (for cases like "FLIGHT_DETAILS" vs "FLIGHT")
      const allSolutionWordsMatch = solutionWords.every(solWord =>
        userWords.some(userWord =>
          solWord === userWord ||
          solWord.startsWith(userWord) ||
          userWord.startsWith(solWord) ||
          solWord.includes(userWord) ||
          userWord.includes(userWord)
        )
      );
      
      // If either direction matches, consider it a match
      if (allUserWordsMatch || allSolutionWordsMatch) {
        matches.push(solutionTable);
      }
    }
  }
  
  return matches;
}

/**
 * Find a single matching table (for backward compatibility)
 * Uses flexible matching to allow variations like "FLIGHT" matching "FLIGHT_DETAILS"
 */
function findMatchingTable(userTable, solutionTables) {
  const matches = findMatchingTables(userTable, solutionTables);
  return matches.length > 0 ? matches[0] : null;
}

/**
 * Validate a single table structure
 */
function validateTable(userTable, solutionTable) {
  const errors = [];
  const warnings = [];
  
  // Check columns
  const solutionColumnMap = new Map();
  solutionTable.columns.forEach(col => {
    solutionColumnMap.set(normalizeName(col.name), col);
  });
  
  const userColumnMap = new Map();
  userTable.columns.forEach(col => {
    userColumnMap.set(normalizeName(col.name), col);
  });
  
  // Check for missing columns (using flexible matching)
  solutionTable.columns.forEach(solutionCol => {
    const userCol = findMatchingColumn(solutionCol.name, userTable.columns);
    
    if (!userCol) {
      errors.push(`Missing column: ${solutionCol.name}`);
    } else {
      // Check column type match
      if (!columnsMatch(userCol, solutionCol)) {
        if (solutionCol.type === 'PK' && userCol.type?.toUpperCase() !== 'PK') {
          errors.push(`Column ${solutionCol.name} should be a Primary Key (PK)`);
        } else if (solutionCol.type === 'FK' && userCol.type?.toUpperCase() !== 'FK') {
          errors.push(`Column ${solutionCol.name} should be a Foreign Key (FK)`);
        }
      }

      // Check column mapping
      const mappingValidation = validateColumnMapping(userCol, solutionCol);
      if (!mappingValidation.valid) {
        errors.push(mappingValidation.error);
      }
    }
  });
  
  // Check for extra columns (warnings, not errors - user might add helpful columns)
  // Use flexible matching to avoid false warnings for name variations
  userTable.columns.forEach(userCol => {
    const matched = findMatchingColumn(userCol.name, solutionTable.columns);
    if (!matched) {
      warnings.push(`Extra column: ${userCol.name} (not in solution, but may be acceptable)`);
    }
  });
  
  // Check primary keys (using flexible matching)
  const solutionPKs = solutionTable.columns
    .filter(c => c.type === 'PK')
    .map(c => {
      const matched = findMatchingColumn(c.name, userTable.columns);
      return matched ? normalizeName(matched.name) : normalizeName(c.name);
    })
    .sort();
  
  const userPKs = userTable.columns
    .filter(c => c.type?.toUpperCase() === 'PK')
    .map(c => normalizeName(c.name))
    .sort();
  
  // Check if all solution PKs have matching user PKs
  const solutionPKSet = new Set(solutionPKs);
  const userPKSet = new Set(userPKs);
  
  const missingPKs = solutionPKs.filter(pk => !userPKSet.has(pk));
  const extraPKs = userPKs.filter(pk => !solutionPKSet.has(pk));
  
  if (missingPKs.length > 0 || extraPKs.length > 0) {
    const solutionPKNames = solutionTable.columns
      .filter(c => c.type === 'PK')
      .map(c => c.name)
      .join(', ');
    const userPKNames = userTable.columns
      .filter(c => c.type?.toUpperCase() === 'PK')
      .map(c => c.name)
      .join(', ');
    errors.push(`Primary keys don't match. Expected: ${solutionPKNames}, Got: ${userPKNames}`);
  }
  
  return { errors, warnings };
}

/**
 * Main validation function
 * @param {Array} userTables - User's table definitions
 * @param {Array} solutionTables - Correct solution table definitions
 * @returns {Object} Validation result with isValid, errors, warnings, and details
 */
export function validateSolution(userTables, solutionTables) {
  const result = {
    isValid: true,
    errors: [],
    warnings: [],
    tableDetails: []
  };
  
  if (!userTables || userTables.length === 0) {
    result.isValid = false;
    result.errors.push('No tables provided');
    return result;
  }
  
  // Validate each user table - allow flexible matching
  const matchedSolutionTables = new Set();
  const allErrors = [];
  const allWarnings = [];
  
  userTables.forEach((userTable) => {
    const matchingSolutionTables = findMatchingTables(userTable, solutionTables);
    
    if (matchingSolutionTables.length === 0) {
      // No match found - but don't error, just warn
      result.tableDetails.push({
        tableName: userTable.name,
        isValid: false,
        errors: [`Table "${userTable.name}" doesn't match any expected table structure`],
        warnings: []
      });
      allErrors.push(`Table "${userTable.name}" doesn't match any solution table`);
      result.isValid = false;
    } else {
      // Try to match against all possible solution tables
      let bestMatch = null;
      let bestValidation = null;
      let bestErrorCount = Infinity;
      
      for (const solutionTable of matchingSolutionTables) {
        const validation = validateTable(userTable, solutionTable);
        if (validation.errors.length < bestErrorCount) {
          bestErrorCount = validation.errors.length;
          bestMatch = solutionTable;
          bestValidation = validation;
        }
      }
      
      if (bestMatch) {
        matchedSolutionTables.add(bestMatch);
        
        if (bestValidation.errors.length > 0) {
          result.isValid = false;
        }
        
        allErrors.push(...bestValidation.errors.map(e => `${userTable.name}: ${e}`));
        allWarnings.push(...bestValidation.warnings.map(w => `${userTable.name}: ${w}`));
        
        result.tableDetails.push({
          tableName: userTable.name,
          isValid: bestValidation.errors.length === 0,
          errors: bestValidation.errors,
          warnings: bestValidation.warnings
        });
      }
    }
  });
  
  // Check for missing tables - use flexible matching
  // Only report missing if a solution table has NO matching user table at all
  solutionTables.forEach(solutionTable => {
    let found = false;
    
    // Check if any user table matches this solution table (by name or structure)
    for (const userTable of userTables) {
      const matches = findMatchingTables(userTable, [solutionTable]);
      if (matches.length > 0) {
        // Check if the columns match reasonably well
        const validation = validateTable(userTable, solutionTable);
        // If it's a reasonable match (few errors), consider it found
        if (validation.errors.length <= 2) { // Allow some flexibility
          found = true;
          break;
        }
      }
    }
    
    if (!found) {
      // Only report missing if we truly can't find a match
      allErrors.push(`Missing table: ${solutionTable.name}`);
      result.isValid = false;
    }
  });
  
  // Deduplicate errors and warnings
  result.errors = Array.from(new Set(allErrors));
  result.warnings = Array.from(new Set(allWarnings));
  
  return result;
}

/**
 * Check if a normalization form is completed
 * @param {string} datasetId - Dataset ID
 * @param {string} form - Normalization form (1NF, 2NF, 3NF)
 * @returns {boolean}
 */
export function isFormCompleted(datasetId, form) {
  const progress = JSON.parse(localStorage.getItem('normalizationProgress') || '{}');
  return progress[datasetId]?.[form] === true;
}

/**
 * Mark a normalization form as completed
 * @param {string} datasetId - Dataset ID
 * @param {string} form - Normalization form (1NF, 2NF, 3NF)
 */
export function markFormCompleted(datasetId, form) {
  const progress = JSON.parse(localStorage.getItem('normalizationProgress') || '{}');
  if (!progress[datasetId]) {
    progress[datasetId] = {};
  }
  progress[datasetId][form] = true;
  localStorage.setItem('normalizationProgress', JSON.stringify(progress));
}

/**
 * Get all progress
 * @returns {Object} Progress object
 */
export function getProgress() {
  return JSON.parse(localStorage.getItem('normalizationProgress') || '{}');
}

/**
 * Clear all progress
 */
export function clearProgress() {
  localStorage.removeItem('normalizationProgress');
}

