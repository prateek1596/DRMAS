import React from 'react';

export default function PageState({ loading, error, empty = false, emptyMessage = 'No data available.' }) {
  if (loading) {
    return (
      <div className="state-banner state-loading" role="status" aria-live="polite">
        <span className="spinner" />
        Loading latest data...
      </div>
    );
  }

  if (error) {
    return (
      <div className="state-banner state-error" role="alert">
        {error}
      </div>
    );
  }

  if (empty) {
    return (
      <div className="state-banner state-empty" role="status" aria-live="polite">
        {emptyMessage}
      </div>
    );
  }

  return null;
}
