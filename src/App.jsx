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

  const reloadDatasets = () => {
    const loadedDatasets = loadAllDatasets();
    setDatasets(loadedDatasets);
  };

  // Load datasets on mount
  useEffect(() => {
    reloadDatasets();
    setProgress(getProgress());
    
    // Load saved work from localStorage
    const savedWork = JSON.parse(localStorage.getItem('normalizationWork') || '{}');
    if (savedWork.datasetId && savedWork.form) {
      const dataset = loadDatasetById(savedWork.datasetId);
      if (dataset) {
        setSelectedDataset(dataset);
        setCurrentForm(savedWork.form);
        setUserTables(savedWork.tables || []);
      }
    }
  }, []);

  // Save work to localStorage whenever it changes
  useEffect(() => {
    if (selectedDataset && userTables.length > 0) {
      const workToSave = {
        datasetId: selectedDataset.id,
        form: currentForm,
        tables: userTables
      };
      localStorage.setItem('normalizationWork', JSON.stringify(workToSave));
    }
  }, [selectedDataset, currentForm, userTables]);

  const handleSelectDataset = (dataset) => {
    setSelectedDataset(dataset);
    setCurrentForm('1NF');
    setUserTables([]);
    setValidationResult(null);
  };

  const handleCheckAnswer = () => {
    if (!selectedDataset || !selectedDataset.solutions[currentForm]) {
      return;
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
      setCurrentForm(nextForm);
      setUserTables([]);
      setValidationResult(null);
    }
  };

  const handleResetProgress = () => {
    clearProgress();
    localStorage.removeItem('normalizationWork');
    setProgress({});
    setSelectedDataset(null);
    setCurrentForm('1NF');
    setUserTables([]);
    setValidationResult(null);
    setShowResetConfirm(false);
  };

  const canAccessForm = (form) => {
    if (form === '1NF') return true;
    if (!selectedDataset) return false;
    
    const formIndex = NORMALIZATION_FORMS.indexOf(form);
    const previousForm = NORMALIZATION_FORMS[formIndex - 1];
    return isFormCompleted(selectedDataset.id, previousForm);
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
                      {status === 'current' && (
                        <button
                          onClick={() => {
                            setCurrentForm(form);
                            setUserTables([]);
                            setValidationResult(null);
                          }}
                          className="text-xs text-blue-600 hover:text-blue-800"
                        >
                          (Click to work on this form)
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
                <button
                  onClick={() => {
                    setSelectedDataset(null);
                    setUserTables([]);
                    setValidationResult(null);
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400 transition-colors"
                >
                  Change Dataset
                </button>
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

