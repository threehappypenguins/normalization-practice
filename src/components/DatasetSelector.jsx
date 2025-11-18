import React, { useRef } from 'react';

export default function DatasetSelector({ datasets, selectedDataset, onSelectDataset, onDatasetsUpdate }) {
  const [filterDifficulty, setFilterDifficulty] = React.useState('all');
  const [uploadStatus, setUploadStatus] = React.useState({ success: [], errors: [] });
  const fileInputRef = useRef(null);

  const filteredDatasets = filterDifficulty === 'all' 
    ? datasets 
    : datasets.filter(d => d.difficulty === filterDifficulty);

  const validateDataset = (dataset) => {
    const errors = [];
    
    if (!dataset.id) errors.push('Missing required field: id');
    if (!dataset.title) errors.push('Missing required field: title');
    if (!dataset.difficulty) errors.push('Missing required field: difficulty');
    if (!['easy', 'medium', 'hard'].includes(dataset.difficulty)) {
      errors.push('Difficulty must be "easy", "medium", or "hard"');
    }
    if (!dataset.description) errors.push('Missing required field: description');
    if (!dataset.rawData) errors.push('Missing required field: rawData');
    if (!dataset.rawData.columns || !Array.isArray(dataset.rawData.columns)) {
      errors.push('rawData.columns must be an array');
    }
    if (!dataset.rawData.rows || !Array.isArray(dataset.rawData.rows)) {
      errors.push('rawData.rows must be an array');
    }
    if (!dataset.solutions) errors.push('Missing required field: solutions');
    if (!dataset.solutions['1NF'] || !dataset.solutions['2NF'] || !dataset.solutions['3NF']) {
      errors.push('Missing required normalization forms: 1NF, 2NF, and/or 3NF');
    }
    
    return errors;
  };

  const handleFileUpload = async (event) => {
    const files = Array.from(event.target.files);
    const success = [];
    const errors = [];

    for (const file of files) {
      if (!file.name.endsWith('.json')) {
        errors.push(`${file.name}: Not a JSON file`);
        continue;
      }

      try {
        const text = await file.text();
        const dataset = JSON.parse(text);
        
        const validationErrors = validateDataset(dataset);
        if (validationErrors.length > 0) {
          errors.push(`${file.name}: ${validationErrors.join('; ')}`);
          continue;
        }

        // Check for duplicate IDs
        const existingDatasets = JSON.parse(localStorage.getItem('uploadedDatasets') || '[]');
        if (existingDatasets.some(d => d.id === dataset.id) || 
            datasets.some(d => d.id === dataset.id)) {
          errors.push(`${file.name}: Dataset ID "${dataset.id}" already exists`);
          continue;
        }

        // Store uploaded dataset
        existingDatasets.push(dataset);
        localStorage.setItem('uploadedDatasets', JSON.stringify(existingDatasets));
        success.push(`${file.name}: "${dataset.title}" uploaded successfully`);
        
        // Notify parent to reload datasets
        if (onDatasetsUpdate) {
          onDatasetsUpdate();
        }
      } catch (error) {
        errors.push(`${file.name}: ${error.message}`);
      }
    }

    setUploadStatus({ success, errors });
    
    // Clear file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    // Clear status messages after 5 seconds
    setTimeout(() => {
      setUploadStatus({ success: [], errors: [] });
    }, 5000);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-gray-800">Select Dataset</h2>
        <div className="flex items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            multiple
            onChange={handleFileUpload}
            className="hidden"
            id="dataset-upload"
          />
          <label
            htmlFor="dataset-upload"
            className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors cursor-pointer text-sm font-medium"
          >
            📁 Upload Dataset(s)
          </label>
        </div>
      </div>

      {/* Upload Status Messages */}
      {uploadStatus.success.length > 0 && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
          <h4 className="text-sm font-semibold text-green-800 mb-1">Upload Successful:</h4>
          <ul className="list-disc list-inside text-sm text-green-700">
            {uploadStatus.success.map((msg, idx) => (
              <li key={idx}>{msg}</li>
            ))}
          </ul>
        </div>
      )}

      {uploadStatus.errors.length > 0 && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <h4 className="text-sm font-semibold text-red-800 mb-1">Upload Errors:</h4>
          <ul className="list-disc list-inside text-sm text-red-700">
            {uploadStatus.errors.map((msg, idx) => (
              <li key={idx}>{msg}</li>
            ))}
          </ul>
        </div>
      )}
      
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Filter by Difficulty:
        </label>
        <select
          value={filterDifficulty}
          onChange={(e) => setFilterDifficulty(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm"
        >
          <option value="all">All</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
      </div>

      <div className="space-y-3">
        {filteredDatasets.map((dataset) => (
          <div
            key={dataset.id}
            className={`w-full rounded-lg border-2 transition-all ${
              selectedDataset?.id === dataset.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
            }`}
          >
            <button
              onClick={() => onSelectDataset(dataset)}
              className="w-full text-left p-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-lg text-gray-800">{dataset.title}</h3>
                    {dataset.isUploaded && (
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                        Uploaded
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{dataset.description}</p>
                </div>
                <span className={`ml-4 px-3 py-1 rounded-full text-xs font-medium ${
                  dataset.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                  dataset.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {dataset.difficulty.toUpperCase()}
                </span>
              </div>
            </button>
            {dataset.isUploaded && (
              <div className="px-4 pb-4">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm(`Are you sure you want to delete "${dataset.title}"? This action cannot be undone.`)) {
                      // Remove from localStorage
                      const uploadedDatasets = JSON.parse(localStorage.getItem('uploadedDatasets') || '[]');
                      const updatedDatasets = uploadedDatasets.filter(d => d.id !== dataset.id);
                      localStorage.setItem('uploadedDatasets', JSON.stringify(updatedDatasets));
                      
                      // Notify parent to reload datasets
                      if (onDatasetsUpdate) {
                        onDatasetsUpdate();
                      }
                    }
                  }}
                  className="px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors text-sm"
                  title="Delete uploaded dataset"
                >
                  🗑️ Delete Dataset
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {filteredDatasets.length === 0 && (
        <p className="text-gray-500 text-center py-4">No datasets found</p>
      )}
    </div>
  );
}

