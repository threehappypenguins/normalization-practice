import React, { useState, useEffect } from 'react';

export default function HelpSystem({ solution, currentForm }) {
  const [hintLevel, setHintLevel] = useState(0);
  const [showSolution, setShowSolution] = useState(false);

  // Reset hints when form changes
  useEffect(() => {
    setHintLevel(0);
    setShowSolution(false);
  }, [currentForm, solution]);

  if (!solution) return null;

  const hints = solution.hints || [];
  const maxHints = hints.length;

  const getNextHint = () => {
    if (hintLevel < maxHints) {
      setHintLevel(hintLevel + 1);
    }
  };

  const resetHints = () => {
    setHintLevel(0);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h3 className="text-xl font-bold mb-4 text-gray-800">Help & Guidance</h3>

      <div className="space-y-4">
        {/* Hint System */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold text-gray-700">Hints</h4>
            {hintLevel > 0 && (
              <button
                onClick={resetHints}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Reset Hints
              </button>
            )}
          </div>
          
          {hintLevel === 0 ? (
            <button
              onClick={getNextHint}
              className="w-full px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition-colors"
            >
              Show First Hint
            </button>
          ) : (
            <div className="space-y-2">
              {Array.from({ length: hintLevel }).map((_, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded"
                >
                  <p className="text-sm text-gray-700">
                    <span className="font-semibold">Hint {idx + 1}:</span> {hints[idx]}
                  </p>
                </div>
              ))}
              
              {hintLevel < maxHints && (
                <button
                  onClick={getNextHint}
                  className="w-full px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition-colors"
                >
                  Show Next Hint ({hintLevel + 1}/{maxHints})
                </button>
              )}
              
              {hintLevel >= maxHints && (
                <p className="text-sm text-gray-500 italic">All hints shown</p>
              )}
            </div>
          )}
        </div>

        {/* Solution Toggle */}
        <div className="border-t pt-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold text-gray-700">Solution</h4>
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={showSolution}
                onChange={(e) => setShowSolution(e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">Show Solution</span>
            </label>
          </div>

          {showSolution && (
            <div className="mt-4 space-y-4">
              <div className="p-4 bg-blue-50 border-l-4 border-blue-400 rounded">
                <h5 className="font-semibold text-gray-800 mb-2">Explanation:</h5>
                <p className="text-sm text-gray-700">{solution.explanation}</p>
              </div>

              <div className="space-y-4">
                <h5 className="font-semibold text-gray-800">Correct Solution:</h5>
                {solution.tables.map((table, idx) => (
                  <div key={idx} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <h6 className="font-semibold text-lg text-gray-800 mb-2">{table.name}</h6>
                    <div className="space-y-1 mb-3">
                      {table.columns.map((col, colIdx) => (
                        <div key={colIdx} className="flex items-center gap-2">
                          <span className="text-sm text-gray-700">{col.name}</span>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            col.type === 'PK' ? 'bg-green-100 text-green-800' :
                            col.type === 'FK' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {col.type}
                          </span>
                        </div>
                      ))}
                    </div>
                    
                    {table.sampleRows && table.sampleRows.length > 0 && (
                      <div className="mt-3">
                        <p className="text-xs font-medium text-gray-600 mb-2">Sample Data:</p>
                        <div className="overflow-x-auto">
                          <table className="min-w-full text-xs border-collapse">
                            <thead>
                              <tr className="bg-gray-200">
                                {table.columns.map((col, colIdx) => (
                                  <th key={colIdx} className="border border-gray-300 px-2 py-1 text-left">
                                    {col.name}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {table.sampleRows.map((row, rowIdx) => (
                                <tr key={rowIdx}>
                                  {row.map((cell, cellIdx) => (
                                    <td key={cellIdx} className="border border-gray-300 px-2 py-1">
                                      {cell}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}



