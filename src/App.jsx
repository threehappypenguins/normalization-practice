import React, { useState, useEffect } from 'react';
import { loadAllDatasets, loadDatasetById } from './utils/datasetLoader';
import { validateSolution, markFormCompleted, getProgress, clearProgress, isFormCompleted } from './utils/validator';
import { getMappedColumns, getMappingStats } from './utils/dataTransformer';
import DatasetSelector from './components/DatasetSelector';
import RawDataView from './components/RawDataView';
import TableBuilder from './components/TableBuilder';
import HelpSystem from './components/HelpSystem';
import ValidationFeedback from './components/ValidationFeedback';

const NORMALIZATION_FORMS = ['1NF', '2NF', '3NF'];

function App() {
  const [datasets, setDatasets] = useState([]);
  const [selectedDataset, setSelectedDataset] = useState(null);
  const [currentForm, setCurrentForm] = useState('1NF');
  const [userTables, setUserTables] = useState([]);
  const [validationResult, setValidationResult] = useState(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [progress, setProgress] = useState({});

  // Helper functions to save/load tables per dataset per form
  // These are defined as regular functions (not using useCallback) since they don't depend on state
  const saveTablesForForm = React.useCallback((datasetId, form, tables) => {
    const allWork = JSON.parse(localStorage.getItem('normalizationWork') || '{}');
    if (!allWork[datasetId]) {
      allWork[datasetId] = {};
    }
    allWork[datasetId][form] = tables;
    localStorage.setItem('normalizationWork', JSON.stringify(allWork));
  }, []);

  const loadTablesForForm = React.useCallback((datasetId, form) => {
    const allWork = JSON.parse(localStorage.getItem('normalizationWork') || '{}');
    return allWork[datasetId]?.[form] || [];
  }, []);

  const clearTablesForDataset = React.useCallback((datasetId) => {
    const allWork = JSON.parse(localStorage.getItem('normalizationWork') || '{}');
    delete allWork[datasetId];
    localStorage.setItem('normalizationWork', JSON.stringify(allWork));
  }, []);

  const reloadDatasets = () => {
    const loadedDatasets = loadAllDatasets();
    setDatasets(loadedDatasets);
  };

  // Load datasets on mount
  useEffect(() => {
    reloadDatasets();
    setProgress(getProgress());
    
    // Load last viewed dataset and form from localStorage
    const lastView = JSON.parse(localStorage.getItem('lastView') || '{}');
    if (lastView.datasetId && lastView.form) {
      const dataset = loadDatasetById(lastView.datasetId);
      if (dataset) {
        // Check if the last viewed form is still accessible
        let formToLoad = lastView.form;
        if (!canAccessForm(lastView.form, dataset)) {
          formToLoad = '1NF';
        }
        setSelectedDataset(dataset);
        setCurrentForm(formToLoad);
        const savedTables = loadTablesForForm(lastView.datasetId, formToLoad);
        setUserTables(savedTables);
      }
    }
  }, []);

  // Save work to localStorage whenever it changes
  useEffect(() => {
    if (selectedDataset) {
      // Always save tables (even if empty) to track which forms have been worked on
      saveTablesForForm(selectedDataset.id, currentForm, userTables);
      // Also save last viewed
      localStorage.setItem('lastView', JSON.stringify({
        datasetId: selectedDataset.id,
        form: currentForm
      }));
    }
  }, [selectedDataset, currentForm, userTables]);

  const handleSelectDataset = (dataset) => {
    setSelectedDataset(dataset);
    // Load last viewed form for this dataset, or default to 1NF
    const lastView = JSON.parse(localStorage.getItem('lastView') || '{}');
    let formToLoad = '1NF';
    if (lastView.datasetId === dataset.id && lastView.form && canAccessForm(lastView.form, dataset)) {
      formToLoad = lastView.form;
    }
    setCurrentForm(formToLoad);
    const savedTables = loadTablesForForm(dataset.id, formToLoad);
    setUserTables(savedTables);
    setValidationResult(null);
  };

  const handleCheckAnswer = () => {
    if (!selectedDataset || !selectedDataset.solutions[currentForm]) {
      return;
    }

    // Check if all tables are saved
    if (userTables.length > 0) {
      const unsavedTables = userTables.filter(table => !table.saved);
      if (unsavedTables.length > 0) {
        setValidationResult({
          isValid: false,
          errors: [`Please save all tables before checking your answer. ${unsavedTables.length} table(s) need to be saved.`],
          warnings: [],
          tableDetails: []
        });
        return;
      }
    }

    const solution = selectedDataset.solutions[currentForm];
    const result = validateSolution(userTables, solution.tables);
    setValidationResult(result);

    if (result.isValid) {
      markFormCompleted(selectedDataset.id, currentForm);
      setProgress(getProgress());
    }
  };

  const handleNextForm = () => {
    const currentIndex = NORMALIZATION_FORMS.indexOf(currentForm);
    if (currentIndex < NORMALIZATION_FORMS.length - 1) {
      const nextForm = NORMALIZATION_FORMS[currentIndex + 1];
      handleFormChange(nextForm);
    }
  };

  const handleFormChange = (form) => {
    if (!selectedDataset) return;
    setCurrentForm(form);
    const savedTables = loadTablesForForm(selectedDataset.id, form);
    setUserTables(savedTables);
    setValidationResult(null);
  };

  const handleResetProgress = () => {
    clearProgress();
    localStorage.removeItem('normalizationWork');
    localStorage.removeItem('lastView');
    setProgress({});
    setSelectedDataset(null);
    setCurrentForm('1NF');
    setUserTables([]);
    setValidationResult(null);
    setShowResetConfirm(false);
  };

  const handleResetDataset = (datasetId) => {
    // Clear progress for this dataset
    const progress = getProgress();
    if (progress[datasetId]) {
      delete progress[datasetId];
      localStorage.setItem('normalizationProgress', JSON.stringify(progress));
    }
    // Clear tables for this dataset
    clearTablesForDataset(datasetId);
    // Reload progress
    setProgress(getProgress());
    // If this is the current dataset, switch to 1NF and clear tables
    if (selectedDataset && selectedDataset.id === datasetId) {
      setCurrentForm('1NF');
      setUserTables([]);
      setValidationResult(null);
    }
  };

  const canAccessForm = (form, dataset = selectedDataset) => {
    if (form === '1NF') return true;
    if (!dataset) return false;
    
    // Allow access if the form is completed (user can review completed forms)
    if (isFormCompleted(dataset.id, form)) return true;
    
    // Otherwise, check if previous form is completed
    const formIndex = NORMALIZATION_FORMS.indexOf(form);
    const previousForm = NORMALIZATION_FORMS[formIndex - 1];
    return isFormCompleted(dataset.id, previousForm);
  };

  const getFormStatus = (form) => {
    if (!selectedDataset) return 'locked';
    if (isFormCompleted(selectedDataset.id, form)) return 'completed';
    if (form === currentForm) return 'current';
    if (canAccessForm(form)) return 'available';
    return 'locked';
  };

  const getFormStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'current': return 'bg-blue-500';
      case 'available': return 'bg-gray-300';
      case 'locked': return 'bg-gray-200';
      default: return 'bg-gray-200';
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Database Normalization Practice</h1>
              <p className="text-sm text-gray-600 mt-1">Learn normalization through hands-on practice</p>
            </div>
            <button
              onClick={() => setShowResetConfirm(true)}
              className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
            >
              Reset All Progress
            </button>
          </div>
        </div>
      </header>

      {/* Reset Confirmation Dialog */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Reset All Progress?</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to reset all progress? This will erase all completed problems and your current work. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleResetProgress}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
              >
                Yes, Reset Everything
              </button>
              <button
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {/* Progress Indicator */}
        {selectedDataset && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-bold mb-4 text-gray-800">Normalization Progress</h2>
            <div className="flex items-center gap-2">
              {NORMALIZATION_FORMS.map((form, idx) => {
                const status = getFormStatus(form);
                return (
                  <React.Fragment key={form}>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${getFormStatusColor(status)}`}>
                          {status === 'completed' ? '✓' : idx + 1}
                        </div>
                        <span className="font-semibold text-gray-700">{form}</span>
                        {status === 'completed' && (
                          <span className="text-xs text-green-600">✓ Completed</span>
                        )}
                      </div>
                      {(status === 'current' || status === 'completed') && (
                        <button
                          onClick={() => handleFormChange(form)}
                          className="text-xs text-blue-600 hover:text-blue-800"
                        >
                          {status === 'current' ? '(Click to work on this form)' : '(Click to view this form)'}
                        </button>
                      )}
                      {status === 'available' && (
                        <button
                          onClick={() => handleFormChange(form)}
                          className="text-xs text-gray-600 hover:text-gray-800"
                        >
                          (Click to start this form)
                        </button>
                      )}
                    </div>
                    {idx < NORMALIZATION_FORMS.length - 1 && (
                      <div className={`h-1 flex-1 ${status === 'completed' ? 'bg-green-500' : 'bg-gray-200'}`} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        )}

        {/* Dataset Selector */}
        {!selectedDataset ? (
          <DatasetSelector
            datasets={datasets}
            selectedDataset={selectedDataset}
            onSelectDataset={handleSelectDataset}
            onDatasetsUpdate={reloadDatasets}
          />
        ) : (
          <div className="space-y-6">
            {/* Current Form Header */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">
                    {selectedDataset.title} - {currentForm}
                  </h2>
                  <p className="text-gray-600 mt-1">{selectedDataset.description}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const confirmReset = window.confirm(
                        `Are you sure you want to reset progress for "${selectedDataset.title}"? This will clear all saved tables and completion status for this dataset.`
                      );
                      if (confirmReset) {
                        handleResetDataset(selectedDataset.id);
                      }
                    }}
                    className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors"
                    title="Reset this dataset"
                  >
                    Reset Dataset
                  </button>
                  <button
                    onClick={() => {
                      setSelectedDataset(null);
                      setValidationResult(null);
                    }}
                    className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400 transition-colors"
                  >
                    Change Dataset
                  </button>
                </div>
              </div>
            </div>

            {/* Raw Data View */}
            <RawDataView 
              rawData={selectedDataset.rawData}
              mappedColumns={getMappedColumns(userTables)}
              mappingStats={selectedDataset.rawData ? getMappingStats(userTables, selectedDataset.rawData.columns) : null}
            />

            {/* Help System */}
            <HelpSystem
              solution={selectedDataset.solutions[currentForm]}
              currentForm={currentForm}
              onGenerateTables={(solutionTables) => {
                // Convert solution tables to user table format
                const newTables = solutionTables.map((solTable, idx) => ({
                  id: Date.now() + idx,
                  name: solTable.name,
                  saved: false, // Generated tables are not saved by default
                  columns: solTable.columns.map(col => ({
                    name: col.name,
                    type: col.type,
                    mappingType: col.mappingType,
                    sourceCols: col.sourceCols || []
                  }))
                }));
                setUserTables(newTables);
              }}
            />

            {/* Table Builder */}
            <TableBuilder
              tables={userTables}
              onTablesChange={setUserTables}
              rawData={selectedDataset.rawData}
            />

            {/* Validation Feedback */}
            <ValidationFeedback
              validationResult={validationResult}
              onCheckAnswer={handleCheckAnswer}
            />

            {/* Next Form Button */}
            {validationResult?.isValid && canAccessForm(NORMALIZATION_FORMS[NORMALIZATION_FORMS.indexOf(currentForm) + 1]) && (
              <div className="bg-green-50 border-2 border-green-400 rounded-lg p-6">
                <h3 className="text-xl font-bold text-green-800 mb-2">Great job!</h3>
                <p className="text-green-700 mb-4">
                  You've successfully completed {currentForm}. Ready to move on to the next normalization form?
                </p>
                <button
                  onClick={handleNextForm}
                  className="px-6 py-3 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors font-semibold"
                >
                  Continue to {NORMALIZATION_FORMS[NORMALIZATION_FORMS.indexOf(currentForm) + 1]}
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-12">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 text-center text-sm text-gray-600">
          <p>Database Normalization Practice Application</p>
        </div>
      </footer>
    </div>
  );
}

export default App;

