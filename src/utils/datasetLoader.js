/**
 * Dataset Loader Utility
 * Automatically loads all dataset JSON files from the datasets directory
 */

// Import all dataset files
// Note: In Vite, we can use import.meta.glob to dynamically import files
const datasetModules = import.meta.glob('../datasets/*.json', { eager: true });

/**
 * Load uploaded datasets from localStorage
 * @returns {Array} Array of uploaded dataset objects
 */
export function loadUploadedDatasets() {
  try {
    const uploaded = JSON.parse(localStorage.getItem('uploadedDatasets') || '[]');
    // Mark as uploaded for UI display
    return uploaded.map(d => ({ ...d, isUploaded: true }));
  } catch (error) {
    console.error('Error loading uploaded datasets:', error);
    return [];
  }
}

/**
 * Load all available datasets (file-based + uploaded)
 * @returns {Array} Array of dataset objects
 */
export function loadAllDatasets() {
  const datasets = [];
  
  // Load file-based datasets
  for (const path in datasetModules) {
    const dataset = datasetModules[path].default || datasetModules[path];
    // Skip template.json
    if (dataset.id && dataset.id !== 'dataset-id' && !path.includes('template.json')) {
      datasets.push(dataset);
    }
  }
  
  // Load uploaded datasets
  const uploadedDatasets = loadUploadedDatasets();
  datasets.push(...uploadedDatasets);
  
  // Sort by difficulty and title
  const difficultyOrder = { easy: 1, medium: 2, hard: 3 };
  datasets.sort((a, b) => {
    const diffCompare = (difficultyOrder[a.difficulty] || 99) - (difficultyOrder[b.difficulty] || 99);
    if (diffCompare !== 0) return diffCompare;
    return a.title.localeCompare(b.title);
  });
  
  return datasets;
}

/**
 * Load a specific dataset by ID
 * @param {string} datasetId - The ID of the dataset to load
 * @returns {Object|null} The dataset object or null if not found
 */
export function loadDatasetById(datasetId) {
  const datasets = loadAllDatasets();
  return datasets.find(d => d.id === datasetId) || null;
}

/**
 * Get dataset metadata (for selector display)
 * @returns {Array} Array of dataset metadata objects
 */
export function getDatasetMetadata() {
  return loadAllDatasets().map(d => ({
    id: d.id,
    title: d.title,
    difficulty: d.difficulty,
    description: d.description
  }));
}

