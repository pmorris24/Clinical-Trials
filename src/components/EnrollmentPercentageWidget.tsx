// src/components/EnrollmentPercentageWidget.tsx
import React from 'react';
import { useExecuteQueryByWidgetId } from '@sisense/sdk-ui';
import './CustomWidget.css';

interface EnrollmentPercentageWidgetProps {
  // No props needed as OIDs are hardcoded
}

const EnrollmentPercentageWidget: React.FC<EnrollmentPercentageWidgetProps> = () => {
  const widgetOid = '6855ee64f8d1a53383881fad';
  const dashboardOid = '684ae8c995906e3edc558210';

  const { data, isLoading, isError, error } = useExecuteQueryByWidgetId({
    widgetOid,
    dashboardOid,
  });

  if (isLoading) {
    return <div>Loading enrollment data...</div>;
  }

  if (isError) {
    console.error("Error fetching enrollment data:", error);
    return <div style={{ color: '#F39C12' }}>Error loading data: {error.message}</div>;
  }

  let enrolledPatientsCount: number = 0;
  let cumulativeEnrollmentCount: number = 1; // Default to 1 to prevent division by zero
  let percentage: number = 0;

  if (data && data.rows && data.rows.length > 0) {
    data.rows.forEach((row: any[]) => { // Using any[] for simplicity
      const category = row[0]?.data;
      const rawCountData = row[1]?.data;
      const count = typeof rawCountData === 'string' ? Number(rawCountData) : (typeof rawCountData === 'number' ? rawCountData : 0);

      if (category === 'Enrolled patients') {
        enrolledPatientsCount = count;
      } else if (category === 'Cumulative enrollment') {
        cumulativeEnrollmentCount = count;
      }
    });

    if (cumulativeEnrollmentCount !== 0) {
      percentage = (enrolledPatientsCount / cumulativeEnrollmentCount) * 100;
    }
  } else {
    // If no data, display a message
    return <div style={{ color: '#F39C12' }}>No data available or unexpected format.</div>;
  }

  const displayPercentage = Math.round(percentage);
  const progressBarWidth = Math.min(displayPercentage, 100);

  return (
    <div className="custom-widget-content">
      <div className="subtitle">PATIENTS ENROLLED</div>
      <div className="value-container">
        <span className="value">
          {enrolledPatientsCount.toLocaleString()}/{cumulativeEnrollmentCount.toLocaleString()}
        </span>
        <span className="percentage-box">
          {displayPercentage}%
        </span>
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

export default EnrollmentPercentageWidget;