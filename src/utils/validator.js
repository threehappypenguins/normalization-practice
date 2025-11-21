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
 * Returns the best matching column, prioritizing exact matches
 */
/**
 * Find a column in solutionColumns that matches targetColName
 * @param {string} targetColName - The column name to find a match for (e.g., solution column name)
 * @param {Array} columnsToSearch - Array of columns to search in (e.g., user's columns)
 * @returns {Object|null} The matching column object, or null if no match
 */
function findMatchingColumn(targetColName, columnsToSearch) {
  const targetNormalized = normalizeName(targetColName);
  
  // First pass: look for exact matches
  for (const col of columnsToSearch) {
    const colNormalized = normalizeName(col.name);
    if (targetNormalized === colNormalized) {
      return col;
    }
  }
  
  // Second pass: look for prefix/suffix matches (one starts/ends with the other)
  // This handles cases like "CREW_MEM" matching "CREW_MEMBER" and "BUDGET" matching "PROJECT_BUDGET"
  let prefixSuffixMatch = null;
  
  for (const col of columnsToSearch) {
    const colNormalized = normalizeName(col.name);
    const shorter = targetNormalized.length < colNormalized.length ? targetNormalized : colNormalized;
    const longer = targetNormalized.length >= colNormalized.length ? targetNormalized : colNormalized;
    
    // Check if one is a prefix of the other (starts with)
    const isPrefixMatch = longer.startsWith(shorter);
    // Check if one is a suffix of the other (ends with)
    const isSuffixMatch = longer.endsWith(shorter);
    
    if (isPrefixMatch) {
      // For prefix matches, prefer longer matches (more specific)
      if (!prefixSuffixMatch || colNormalized.length > normalizeName(prefixSuffixMatch.name).length) {
        prefixSuffixMatch = col;
      }
    } else if (isSuffixMatch) {
      // For suffix matches, accept if shorter name is at least 3 characters
      // This allows "BUDGET" (6 chars) to match "PROJECT_BUDGET" (14 chars)
      // Prefer this match if we don't have one yet, or if the current match is also a suffix
      if (!prefixSuffixMatch) {
        prefixSuffixMatch = col;
      } else {
        // Check if current match is also a suffix match
        const currentMatchNormalized = normalizeName(prefixSuffixMatch.name);
        const currentShorter = targetNormalized.length < currentMatchNormalized.length ? targetNormalized : currentMatchNormalized;
        const currentLonger = targetNormalized.length >= currentMatchNormalized.length ? targetNormalized : currentMatchNormalized;
        const currentIsSuffix = currentLonger.endsWith(currentShorter);
        
        // Prefer suffix matches, or if both are suffix matches, prefer longer column name
        if (currentIsSuffix && colNormalized.length > currentMatchNormalized.length) {
          prefixSuffixMatch = col;
        } else if (!currentIsSuffix) {
          // If current match is prefix but this is suffix, prefer suffix for cases like "BUDGET" -> "PROJECT_BUDGET"
          prefixSuffixMatch = col;
        }
      }
    }
  }
  
  // Return prefix/suffix match if found
  // For suffix matches like "BUDGET" -> "PROJECT_BUDGET", we accept even if overlap < 70%
  // because one is clearly a suffix of the other
  if (prefixSuffixMatch) {
    const matchNormalized = normalizeName(prefixSuffixMatch.name);
    const shorter = targetNormalized.length < matchNormalized.length ? targetNormalized : matchNormalized;
    const longer = targetNormalized.length >= matchNormalized.length ? targetNormalized : matchNormalized;
    
    // Check if it's a prefix match (one starts with the other)
    const isPrefixMatch = longer.startsWith(shorter);
    // Check if it's a suffix match (one ends with the other)
    const isSuffixMatch = longer.endsWith(shorter);
    
    if (isPrefixMatch) {
      // For prefix matches, require at least 70% overlap to avoid false matches
      const overlapRatio = shorter.length / longer.length;
      if (overlapRatio >= 0.7) {
        return prefixSuffixMatch;
      }
    } else if (isSuffixMatch) {
      // For suffix matches, accept if shorter name is at least 3 characters
      // This allows "BUDGET" (6 chars) to match "PROJECT_BUDGET" (14 chars)
      // because "PROJECT_BUDGET" clearly ends with "BUDGET"
      if (shorter.length >= 3) {
        return prefixSuffixMatch;
      }
    }
  }
  
  // Third pass: word-based matching (more flexible but less preferred)
  // Be careful: "BUDGET" should NOT match "PROJECT" even if they share some characters
  const targetWords = targetNormalized.split(/[_\s]+/).filter(w => w.length > 0);
  
  let bestMatch = null;
  let bestScore = 0;
  
  for (const col of columnsToSearch) {
    const colNormalized = normalizeName(col.name);
    const colWords = colNormalized.split(/[_\s]+/).filter(w => w.length > 0);
    
    if (targetWords.length > 0 && colWords.length > 0) {
      // Calculate match score based on word overlap
      // Require that ALL words from the shorter name appear in the longer name
      // This prevents "BUDGET" from matching "PROJECT" or "PROJECT_BUDGET"
      const shorterWords = targetWords.length <= colWords.length ? targetWords : colWords;
      const longerWords = targetWords.length > colWords.length ? targetWords : colWords;
      
      const allShorterWordsMatch = shorterWords.every(shortWord => 
        longerWords.some(longWord => 
          shortWord === longWord || 
          shortWord.startsWith(longWord) || 
          longWord.startsWith(shortWord)
        )
      );
      
      if (allShorterWordsMatch) {
        const matchingWords = targetWords.filter(targetWord => 
          colWords.some(colWord => 
            targetWord === colWord || 
            targetWord.startsWith(colWord) || 
            colWord.startsWith(targetWord)
          )
        ).length;
        
        const score = matchingWords / Math.max(targetWords.length, colWords.length);
        
        // Only consider it a match if most words match AND all shorter words are in longer
        if (score > 0.5 && score > bestScore) {
          bestScore = score;
          bestMatch = col;
        }
      }
    }
  }
  
  if (bestMatch) {
    return bestMatch;
  }
  
  // Last resort: substring matching (but be very careful)
  // Only match if one is clearly a subset (at least 3 characters and 70% of the shorter string)
  // AND the shorter string appears at the start or end of the longer string (not in the middle)
  // This prevents "BUDGET" from matching "PROJECT_BUDGET" when "PROJECT_BUDGET" should match "BUDGET" instead
  for (const col of columnsToSearch) {
    const colNormalized = normalizeName(col.name);
    const shorter = targetNormalized.length < colNormalized.length ? targetNormalized : colNormalized;
    const longer = targetNormalized.length >= colNormalized.length ? targetNormalized : colNormalized;
    
    if (shorter.length >= 3 && longer.includes(shorter)) {
      const overlapRatio = shorter.length / longer.length;
      // Only match if it's a strong overlap (70%+) AND the shorter appears at start/end
      // This prevents "BUDGET" from matching "PROJECT" (BUDGET is not at start/end of PROJECT)
      const isAtStart = longer.startsWith(shorter);
      const isAtEnd = longer.endsWith(shorter);
      
      if (overlapRatio >= 0.7 && (isAtStart || isAtEnd)) {
        return col;
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
/**
 * Check if two column names match flexibly (similar to findMatchingColumn logic)
 * Handles cases like "BUDGET" matching "PROJECT_BUDGET"
 */
function columnNamesMatch(colName1, colName2) {
  const norm1 = normalizeName(colName1);
  const norm2 = normalizeName(colName2);
  
  // Exact match
  if (norm1 === norm2) return true;
  
  // Check suffix match (e.g., "BUDGET" matches "PROJECT_BUDGET")
  const shorter = norm1.length < norm2.length ? norm1 : norm2;
  const longer = norm1.length >= norm2.length ? norm1 : norm2;
  
  if (longer.endsWith(shorter) && shorter.length >= 3) {
    return true;
  }
  
  // Check prefix match (with 70% overlap requirement)
  if (longer.startsWith(shorter)) {
    const overlapRatio = shorter.length / longer.length;
    if (overlapRatio >= 0.7) {
      return true;
    }
  }
  
  return false;
}

/**
 * Check if two source columns match flexibly
 * Handles "tableName.columnName" format with flexible table and column name matching
 */
function sourceColsMatch(sourceCol1, sourceCol2) {
  const norm1 = normalizeName(sourceCol1);
  const norm2 = normalizeName(sourceCol2);
  
  // Exact match after normalization
  if (norm1 === norm2) return true;
  
  // If both are in "tableName.columnName" format, check flexible table and column matching
  if (sourceCol1.includes('.') && sourceCol2.includes('.')) {
    const [table1, col1] = sourceCol1.split('.', 2);
    const [table2, col2] = sourceCol2.split('.', 2);
    
    // Table names must match flexibly
    if (!tablesMatchByName(table1, table2)) return false;
    
    // Column names must match flexibly (e.g., "BUDGET" matches "PROJECT_BUDGET")
    return columnNamesMatch(col1, col2);
  }
  
  // If neither has a dot, just compare normalized names
  if (!sourceCol1.includes('.') && !sourceCol2.includes('.')) {
    return norm1 === norm2;
  }
  
  return false;
}

/**
 * Check if two table names match flexibly (similar to findMatchingTables logic)
 */
function tablesMatchByName(tableName1, tableName2) {
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
}

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

  // Check source columns match (order doesn't matter, with flexible table name matching)
  // If solution has multiple source columns, user needs at least one match (not all)
  // This handles cases where solution lists multiple possible sources (e.g., FLIGHT_CREW.CHAR_TRIP, FLIGHT_DETAILS.CHAR_TRIP)
  // but user only has one table that matches both
  if (userCol.sourceCols && solutionCol.sourceCols) {
    // Check if user has at least one source column that matches any solution source column
    const hasAnyMatch = solutionCol.sourceCols.some(solSource => 
      userCol.sourceCols.some(userSource => sourceColsMatch(userSource, solSource))
    );
    
    if (!hasAnyMatch) {
      // None of the user's source columns match any solution source column
      return {
        valid: false,
        error: `${userCol.name} should include source column: ${solutionCol.sourceCols.join(' or ')}`
      };
    }
    
    // If solution has only one source column, user should have exactly one (or at least one matching)
    // If solution has multiple source columns, user can have one or more (as long as at least one matches)
    if (solutionCol.sourceCols.length === 1) {
      // For single source column, check if user's source matches
      const solSource = solutionCol.sourceCols[0];
      const hasMatch = userCol.sourceCols.some(userSource => 
        sourceColsMatch(userSource, solSource)
      );
      
      if (!hasMatch) {
        return {
          valid: false,
          error: `${userCol.name} should include source column: ${solSource}`
        };
      }
    }
    // For multiple source columns, we already checked that at least one matches above
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
    // Note: findMatchingColumn takes (targetName, columnsToSearch)
    // We're looking for a user column that matches the solution column name
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
          
          // Only add errors to main list if they're not column-specific (to avoid duplication)
          // Column-specific errors will be shown in tableDetails
          const columnSpecificErrors = bestValidation.errors.filter(e => 
            e.includes('should be a') || 
            e.includes('should use') || 
            e.includes('should include source column') ||
            e.includes('should map to') ||
            e.includes('is missing source column')
          );
          const generalErrors = bestValidation.errors.filter(e => !columnSpecificErrors.includes(e));
          
          // Add general errors to main list with table name prefix
          allErrors.push(...generalErrors.map(e => `${userTable.name}: ${e}`));
          allWarnings.push(...bestValidation.warnings.map(w => `${userTable.name}: ${w}`));
          
          result.tableDetails.push({
            tableName: userTable.name,
            isValid: bestValidation.errors.length === 0,
            errors: bestValidation.errors, // Show all errors in table details
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

