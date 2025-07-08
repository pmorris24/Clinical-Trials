// src/components/LTDExpensedWidget.tsx
import React from 'react';
import { useExecuteQueryByWidgetId } from '@sisense/sdk-ui';
import './CustomWidget.css';

interface LTDExpensedWidgetProps {
  // No props needed as OIDs are hardcoded
}

const LTDExpensedWidget: React.FC<LTDExpensedWidgetProps> = () => {
  // Use the provided widget and dashboard OIDs directly
  const widgetOid = '68547b23f8d1a53383881f92';
  const dashboardOid = '684ae8c995906e3edc558210';

  // Execute the query using the specific widget ID
  const { data, isLoading, isError, error } = useExecuteQueryByWidgetId({
    widgetOid,
    dashboardOid,
  });

  if (isLoading) {
    return <div style={{ textAlign: 'center', marginTop: '10px' }}>Loading data...</div>;
  }

  if (isError) {
    console.error("Error fetching data for LTD Expensed widget:", error);
    return <div style={{ color: 'red' }}>Error loading data: {error.message}</div>;
  }

  let expensedValue: number = 0;
  let percentage: number = 0;

  // Extracting values
  if (data && data.rows && data.rows.length > 0 && data.rows[0].length >= 2) {
    const mainValueCell = data.rows[0][0];
    const percentageCell = data.rows[0][1];

    // The cell from useExecuteQueryByWidgetId can be an object with a 'data' property
    expensedValue = mainValueCell && typeof mainValueCell.data === 'number' ? mainValueCell.data : 0;
    // Modified line: multiply percentageCell.data by 100
    percentage = percentageCell && typeof percentageCell.data === 'number' ? percentageCell.data * 100 : 0;

  } else {
    console.warn("Data for LTD Expensed widget not in expected format or empty:", data);
    return <div style={{ color: '#F39C12' }}>No data available or unexpected format.</div>;
  }

  // Ensure percentage is rounded for display and capped for the progress bar
  const displayPercentage = Math.round(percentage);
  const progressBarWidth = Math.min(displayPercentage, 100);

  return (
    <div className="custom-widget-content">
      <div className="subtitle">LTD EXPENSED</div>
      <div className="value-container">
        <span className="value">${expensedValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
        <span className="percentage-box">{displayPercentage}%</span>
      </div>
      <div className="progress-bar-container">
        <div
          className="progress-bar-fill"
          style={{
            width: `${progressBarWidth}%`,
          }}
        ></div>
      </div>
    </div>
  );
};

export default LTDExpensedWidget;
