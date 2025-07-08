import React, { useCallback } from 'react';
import { DashboardWidget } from '@sisense/sdk-ui';
import Highcharts from 'highcharts';

interface BudgetVsForecastWidgetProps {}

const BudgetVsForecastWidget: React.FC<BudgetVsForecastWidgetProps> = () => {
    const widgetOid = '6865dfcbf8d1a5338388236e';
    const dashboardOid = '684ae8c995906e3edc558210';

    const onBeforeRender = useCallback((options: any) => {
        // Helper to get data from the initial series
        const getSeriesDataByName = (name: string) => {
            const series = options.series?.find((s: any) => s.name === name);
            if (!series?.data) return []; 
            return series.data.map((point: any) => (typeof point === 'object' && point !== null ? point.y : point) || 0);
        };
        
        const categories = options.xAxis?.[0]?.categories || [];

        // Data Preparation
        const ltdExpenseData = getSeriesDataByName('LTD reconciled');
        const remainingBudgetData = getSeriesDataByName('Remaining budget');
        const forecastedData = getSeriesDataByName('Forecasted');
        const contractedData = ltdExpenseData.map((ltd: number, index: number) => ltd + (remainingBudgetData[index] || 0));

        // Color Palette
        const ltdExpenseColor = 'rgb(29, 188, 168)';
        const contractedColor = 'rgba(29, 188, 168, 0.3)';
        const contractedLegendColor = 'rgb(160, 219, 211)';
        const overContractColor = '#D32F2F';
        const underContractColor = '#4CAF50';

        // Reconstruct Series Array
        options.series = [
            { name: 'Forecasted', type: 'bar', data: forecastedData, visible: false, showInLegend: false },
            // ★★★ FIX: Dummy series for "Over/Under" now use 'line' symbol ★★★
            { name: 'Under contract', type: 'bar', color: underContractColor, data: [], showInLegend: true, legendSymbol: 'line' },
            { name: 'Over contract', type: 'bar', color: overContractColor, data: [], showInLegend: true, legendSymbol: 'line' },
            // ★★★ FIX: Dummy series for "Contracted" now explicitly uses 'square' ★★★
            { name: 'Contracted', type: 'bar', color: contractedLegendColor, data: [], showInLegend: true, legendSymbol: 'square' },
            // Data series
            { name: 'Contracted_data', type: 'bar', data: contractedData, color: contractedColor, borderColor: ltdExpenseColor, borderWidth: 1, pointWidth: 40, zIndex: 0, states: { hover: { enabled: false } }, showInLegend: false },
            { name: 'LTD Expense', type: 'bar', data: ltdExpenseData, color: ltdExpenseColor, pointWidth: 20, zIndex: 1, showInLegend: true, legendSymbol: 'square' }, // Also explicitly a square
            {
                name: 'Forecast Marker',
                type: 'bar',
                data: forecastedData.map((val: number, i: number) => ({
                    y: val,
                    color: (val - contractedData[i]) >= 0 ? overContractColor : underContractColor,
                })),
                pointWidth: 3,
                grouping: false,
                zIndex: 5,
                showInLegend: false,
            }
        ];
        
        // --- Chart & Axis Configuration ---
        options.chart = { type: 'bar' };
        options.plotOptions = { bar: { grouping: false, borderWidth: 1, borderRadius: 2, dataLabels: { enabled: false } } };

        options.xAxis = [{
            categories: categories,
            title: { text: '' },
            gridLineWidth: 0,
            reversed: true,
            labels: {
                align: 'right',
                x: -10,
                formatter: function(this: Highcharts.AxisLabelsFormatterContextObject) {
                    return this.value as string;
                }
            }
        }];

        options.yAxis = [{
            title: { text: '' },
            type: 'logarithmic',
            min: 1,
            reversed: false,
            labels: {
                 formatter: function(this: Highcharts.AxisLabelsFormatterContextObject) {
                     const value = this.value as number;
                     if (value >= 1000000000) return `$${value / 1000000000}B`;
                     if (value >= 1000000) return `$${value / 1000000}M`;
                     if (value >= 1000) return `$${value / 1000}K`;
                     return `$${value}`;
                 }
            },
        }];

        options.legend = { enabled: true, verticalAlign: 'top', align: 'left', x: 0, y: -10, reversed: true, symbolRadius: 0, symbolHeight: 12, symbolWidth: 12 };
        
        options.tooltip = {
            enabled: true,
            shared: true,
            useHTML: true,
            backgroundColor: 'rgba(255, 255, 255, 1)',
            borderWidth: 1,
            borderColor: '#E0E0E0',
            shadow: true,
            formatter: function(this: any) {
                try {
                    const pointIndex = this.points?.[0].point.index ?? -1;
                    if (pointIndex === -1) return 'Error';

                    const categoryName = categories[pointIndex];
                    const chart = this.points?.[0].series.chart;

                    const ltdExpenseSeries = chart?.series.find((s: any) => s.name === 'LTD Expense');
                    const contractedDataSeries = chart?.series.find((s: any) => s.name === 'Contracted_data');
                    const forecastedSeries = chart?.series.find((s: any) => s.name === 'Forecasted');

                    if (!ltdExpenseSeries || !contractedDataSeries || !forecastedSeries) { return 'A required data series is missing.'; }

                    const ltdExpenseValue = (ltdExpenseSeries.data[pointIndex] as Highcharts.Point).y ?? 0;
                    const contractedValue = (contractedDataSeries.data[pointIndex] as Highcharts.Point).y ?? 0;
                    const forecastedValue = (forecastedSeries.data[pointIndex] as Highcharts.Point).y ?? 0;

                    const percentComplete = (contractedValue === 0) ? 0 : (ltdExpenseValue / contractedValue) * 100;
                    const overUnderValue = forecastedValue - contractedValue;
                    const overUnderPercent = (contractedValue === 0) ? 0 : (overUnderValue / contractedValue) * 100;
                    const currentOverUnderColor = overUnderValue >= 0 ? overContractColor : underContractColor;

                    let sHtml = `<div style="padding: 10px; min-width: 250px; font-family: 'lato', sans-serif; font-size: 13px;">`;
                    sHtml += `<div style="font-size: 14px; margin-bottom: 10px; font-weight: 700;">${categoryName}</div>`;
                    sHtml += `<table style="width: 100%;">`;
                    sHtml += `<tr><td style="padding: 6px 2px; font-weight: 400;"><span style="background-color: ${ltdExpenseColor}; width: 12px; height: 12px; border-radius: 2px; display: inline-block; margin-right: 8px; vertical-align: middle;"></span>LTD expense</td><td style="text-align: right; padding: 6px 2px; font-weight: 700;">$${Highcharts.numberFormat(ltdExpenseValue, 0, '.', ',')}</td></tr>`;
                    sHtml += `<tr><td style="padding: 6px 2px; font-weight: 400;"><span style="background-color: ${contractedLegendColor}; width: 12px; height: 12px; border-radius: 2px; display: inline-block; margin-right: 8px; vertical-align: middle;"></span>Contracted</td><td style="text-align: right; padding: 6px 2px; font-weight: 700;">$${Highcharts.numberFormat(contractedValue, 0, '.', ',')}</td></tr>`;
                    sHtml += `<tr><td style="padding: 6px 2px; font-weight: 400;"><span style="width: 10px; display: inline-block; margin-right: 8px; margin-left: 4px;"></span>% complete</td><td style="text-align: right; padding: 6px 2px; font-weight: 700;">${Highcharts.numberFormat(percentComplete, 0)}%</td></tr>`;
                    sHtml += `<tr><td colspan="2" style="border-top: 1px solid #EEE; padding-top: 8px;"></td></tr>`;
                    sHtml += `<tr><td style="padding: 6px 2px; font-weight: 400;"><span style="background-color: ${currentOverUnderColor}; width: 3px; height: 12px; border-radius: 2px; display: inline-block; margin-right: 8px; vertical-align: middle; margin-left: 4px;"></span>Forecasted</td><td style="text-align: right; padding: 6px 2px; font-weight: 700;">$${Highcharts.numberFormat(forecastedValue, 0, '.', ',')}</td></tr>`;
                    const formattedValue = (overUnderValue >= 0 ? '+' : '') + '$' + Highcharts.numberFormat(Math.abs(overUnderValue), 0, '.', ',');
                    const formattedPercent = (overUnderValue >= 0 ? '+' : '') + Highcharts.numberFormat(Math.abs(overUnderPercent), 0) + '%';
                    sHtml += `<tr><td style="padding: 6px 2px; font-weight: 400;"><span style="width: 10px; display: inline-block; margin-right: 8px; margin-left: 4px;"></span>Over/under</td><td style="text-align: right; padding: 6px 2px; font-weight: 700; color: ${currentOverUnderColor};">${formattedValue}<span style="display: inline-block; background-color: ${currentOverUnderColor}20; color: ${currentOverUnderColor}; padding: 2px 5px; border-radius: 4px; margin-left: 8px;">${formattedPercent}</span></td></tr>`;
                    sHtml += '</table></div>';
                    return sHtml;
                } catch (e) {
                    console.error('Error in tooltip formatter:', e);
                    return 'Error creating tooltip.';
                }
            }
        };
        
        return options;
    }, []);

    return (
        <DashboardWidget
            widgetOid={widgetOid}
            dashboardOid={dashboardOid}
            title="Budget vs. forecast per vendor"
            onBeforeRender={onBeforeRender}
        />
    );
};

export default BudgetVsForecastWidget;
