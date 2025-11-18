import React from 'react';

export default function ValidationFeedback({ validationResult, onCheckAnswer }) {
  if (!validationResult) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <button
          onClick={onCheckAnswer}
          className="w-full px-6 py-3 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors font-semibold text-lg"
        >
          Check Answer
        </button>
      </div>
    );
  }

  const { isValid, errors, warnings, tableDetails } = validationResult;

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className={`p-4 rounded-lg mb-4 ${
        isValid ? 'bg-green-50 border-2 border-green-400' : 'bg-red-50 border-2 border-red-400'
      }`}>
        <div className="flex items-center gap-3">
          {isValid ? (
            <>
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h3 className="text-xl font-bold text-green-800">Correct!</h3>
                <p className="text-green-700">Your normalization is correct. Great job!</p>
              </div>
            </>
          ) : (
            <>
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h3 className="text-xl font-bold text-red-800">Incorrect</h3>
                <p className="text-red-700">Please review the feedback below and try again.</p>
              </div>
            </>
          )}
        </div>
      </div>

      {tableDetails.length > 0 && (
        <div className="mb-4">
          <h4 className="font-semibold text-gray-800 mb-2">Table Details:</h4>
          <div className="space-y-2">
            {tableDetails.map((detail, idx) => (
              <div
                key={idx}
                className={`p-3 rounded border-l-4 ${
                  detail.isValid ? 'bg-green-50 border-green-400' : 'bg-red-50 border-red-400'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold">{detail.tableName}</span>
                  {detail.isValid ? (
                    <span className="text-xs bg-green-200 text-green-800 px-2 py-1 rounded">Valid</span>
                  ) : (
                    <span className="text-xs bg-red-200 text-red-800 px-2 py-1 rounded">Issues</span>
                  )}
                </div>
                {detail.errors.length > 0 && (
                  <ul className="list-disc list-inside ml-2 text-sm text-red-700">
                    {detail.errors.map((error, errIdx) => (
                      <li key={errIdx}>{error}</li>
                    ))}
                  </ul>
                )}
                {detail.warnings.length > 0 && (
                  <ul className="list-disc list-inside ml-2 text-sm text-yellow-700">
                    {detail.warnings.map((warning, warnIdx) => (
                      <li key={warnIdx}>{warning}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={onCheckAnswer}
        className="w-full px-6 py-3 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors font-semibold"
      >
        Check Answer Again
      </button>
    </div>
  );
}



