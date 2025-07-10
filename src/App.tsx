// src/App.tsx
import React, { useState, useCallback, useEffect } from 'react';
import { Responsive, WidthProvider, type Layouts, type Layout } from 'react-grid-layout';
import { DashboardWidget, SisenseContextProvider } from '@sisense/sdk-ui';

import LTDExpensedWidget from './components/LTDExpensedWidget';
import EnrollmentPercentageWidget from './components/EnrollmentPercentageWidget';
import BudgetVsForecastWidget from './components/BudgetVsForecastWidget';

const ResponsiveGridLayout = WidthProvider(Responsive);

// --- WIDGET CATALOG & OID MAP ---
const WIDGET_CATALOG = [
    { id: 'kpi0', title: 'LTD Expensed (Custom)', component: LTDExpensedWidget, defaultLayout: { w: 3, h: 3 } },
    { id: 'kpi1', title: 'LTD Reconciled', defaultLayout: { w: 3, h: 3 } },
    { id: 'kpi2', title: 'Trial budget', defaultLayout: { w: 3, h: 3 } },
    { id: 'kpi3', title: 'Remaining budget', defaultLayout: { w: 3, h: 3 } },
    { id: 'kpi4', title: '% Recognized', defaultLayout: { w: 3, h: 3 } },
    { id: 'kpi5', title: 'Enrolled Patients % (Custom)', component: EnrollmentPercentageWidget, defaultLayout: { w: 3, h: 3 } },
    { id: 'chart1', title: 'LTD trial spend', defaultLayout: { w: 6, h: 8 } },
    { id: 'chart2', title: 'Actual + forecast', defaultLayout: { w: 6, h: 8 } },
    { id: 'chart3', title: 'Cumulative total spend', defaultLayout: { w: 6, h: 8 } },
    { id: 'chart4', title: 'Budget vs forecast by cost category', defaultLayout: { w: 6, h: 8 } },
    { id: 'chart5', title: 'Vendor progress', defaultLayout: { w: 6, h: 8 } },
    { id: 'table1', title: 'Financial Summary', defaultLayout: { w: 12, h: 8 } },
    { id: 'chart6', title: 'Quarterly expenses', defaultLayout: { w: 12, h: 8 } },
    { id: 'chart7', title: 'Budget vs. Forecast (Custom)', component: BudgetVsForecastWidget, defaultLayout: { w: 6, h: 8 } },
];

const WIDGET_OID_MAP: Record<string, { widgetOid: string, dashboardOid: string }> = {
    'kpi1': { widgetOid: '684ae8c995906e3edc558213', dashboardOid: '684ae8c995906e3edc558210' },
    'kpi2': { widgetOid: '684ae8c995906e3edc558214', dashboardOid: '684ae8c995906e3edc558210' },
    'kpi3': { widgetOid: '684ae8c995906e3edc558219', dashboardOid: '684ae8c995906e3edc558210' },
    'kpi4': { widgetOid: '684ae8c995906e3edc558216', dashboardOid: '684ae8c995906e3edc558210' },
    'chart1': { widgetOid: '684ae8c995906e3edc558211', dashboardOid: '684ae8c995906e3edc558210' },
    'chart2': { widgetOid: '684ae8c995906e3edc558212', dashboardOid: '684ae8c995906e3edc558210' },
    'chart3': { widgetOid: '684c1e2f95906e3edc558321', dashboardOid: '684ae8c995906e3edc558210' },
    'chart4': { widgetOid: '684ae8c995906e3edc558217', dashboardOid: '684ae8c995906e3edc558210' },
    'chart5': { widgetOid: '684c118b95906e3edc55830c', dashboardOid: '684ae8c995906e3edc558210' },
    'table1': { widgetOid: '684ae8c995906e3edc55821a', dashboardOid: '684ae8c995906e3edc558210' },
    'chart6': { widgetOid: '6851e57ef8d1a53383881e98', dashboardOid: '684ae8c995906e3edc558210' },
    'chart7': { widgetOid: '6865dfcbf8d1a5338388236e', dashboardOid: '684ae8c995906e3edc558210' },
};

// --- TOOLTIP FORMATTERS ---

function genericSharedTooltipFormatter(this: any) {
    const formatCurrency = (value: number) => '$' + new Intl.NumberFormat('en-US').format(Math.round(value));
    const header = `<b>${this.x}</b>`;

    let total = 0;
    const rows = this.points.map((point: any) => {
        const value = point.y;
        if (value !== null && typeof value === 'number') {
            total += value;
        }
        return `
            <tr>
                <td style="color: ${point.series.color}; font-size: 1.5em; vertical-align: middle;">\u25CF</td>
                <td style="padding: 0 10px 0 5px;">${point.series.name}</td>
                <td style="text-align: right;">${formatCurrency(value)}</td>
            </tr>
        `;
    }).join('');

    const totalRow = `
        <tr style="border-top: 1px solid #ccc; font-weight: bold;">
            <td></td>
            <td style="padding: 5px 10px 0 5px;">Total</td>
            <td style="text-align: right; padding-top: 5px;">${formatCurrency(total)}</td>
        </tr>`;

    const finalTotalRow = this.points.length > 1 ? totalRow : '';

    return `${header}<table>${rows}${finalTotalRow}</table>`;
}

function customTooltipFormatter(this: any) {
    const formatCurrency = (value: number) => '$' + new Intl.NumberFormat('en-US').format(Math.round(value));
    const isActualForecastChart = this.points.some((p: any) => p.series.name.includes(' - A') || p.series.name.includes(' - F'));
    const isForecast = isActualForecastChart && this.points.some((p: any) => p.series.name.includes('- F'));
    
    let headerDate = this.x;
    
    if (!isActualForecastChart && typeof headerDate === 'string' && /^\d{2}\/\d{4}$/.test(headerDate)) {
        const [month, year] = headerDate.split('/');
        const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
        headerDate = date.toLocaleString('en-US', { month: 'short', year: 'numeric' });
    }

    let header = `<b>${headerDate}`;
    if (isActualForecastChart) {
        header += isForecast ? ' (forecast)' : '';
    }
    header += `</b>`;

    const ltdSpendSortOrder = ['Direct Fees', 'Pass-throughs', 'Investigator fees', 'OCCs'];
    const actualForecastSortOrder = ['Direct fees', 'Pass-throughs', 'Investigator', 'OCC']; 
    const sortOrder = isActualForecastChart ? actualForecastSortOrder : ltdSpendSortOrder;

    const barPoints = this.points.filter((p: any) => !p.series.name.toLowerCase().includes('count') && !p.series.name.toLowerCase().includes('enrollment'));
    const sortedBarPoints = barPoints.sort((a: any, b: any) => {
        const cleanNameA = a.series.name.replace(/ - [AF]$/, '');
        const cleanNameB = b.series.name.replace(/ - [AF]$/, '');
        return sortOrder.indexOf(cleanNameA) - sortOrder.indexOf(cleanNameB);
    });

    let total = 0;
    const barRows: string[] = [];

    sortedBarPoints.forEach((point: any) => {
        const value = point.y;
        if (value !== null && value !== 0) {
            total += value;
            barRows.push(`
                <tr>
                    <td style="color: ${point.series.color}; font-size: 1.5em; vertical-align: middle;">\u25CF</td>
                    <td style="padding: 0 10px 0 5px;">${point.series.name.replace(/ - [AF]$/, '')}</td>
                    <td style="text-align: right;">${formatCurrency(value)}</td>
                </tr>
            `);
        }
    });

    const finalBarRows = barRows.join('');
    const totalRow = `
        <tr style="border-top: 1px solid #ccc; font-weight: bold;">
            <td></td>
            <td style="padding: 5px 10px 0 5px;">Total</td>
            <td style="text-align: right; padding-top: 5px;">${formatCurrency(total)}</td>
        </tr>`;

    let lineContent = '';
    const linePoint = this.points.find((p: any) => p.series.name.toLowerCase().includes('count') || p.series.name.toLowerCase().includes('enrollment'));

    if (linePoint) {
        const color = linePoint.series.color;
        if (isActualForecastChart) {
            const enrollmentValue = linePoint.y;
            if (isForecast) {
                const actualRow = `
                    <tr>
                        <td style="color: ${color}; font-size: 1.5em; vertical-align: middle; padding-top: 5px;">\u25AC</td>
                        <td style="padding: 5px 10px 0 5px; font-weight: bold;">Actual enrollment</td>
                        <td style="text-align: right; font-weight: bold; padding-top: 5px;">\u2014</td>
                    </tr>`;
                const forecastRow = `
                    <tr>
                        <td style="color: ${color}; font-size: 1.5em; vertical-align: middle; padding-top: 5px; font-style: italic;">\u25AC</td>
                        <td style="padding: 5px 10px 0 5px; font-weight: bold;">Forecasted enrollment</td>
                        <td style="text-align: right; font-weight: bold; padding-top: 5px;">${enrollmentValue ?? '\u2014'}</td>
                    </tr>`;
                lineContent = actualRow + forecastRow;
            } else { 
                lineContent = `
                    <tr>
                        <td style="color: ${color}; font-size: 1.5em; vertical-align: middle; padding-top: 5px;">\u25AC</td>
                        <td style="padding: 5px 10px 0 5px; font-weight: bold;">Actual enrollment</td>
                        <td style="text-align: right; font-weight: bold; padding-top: 5px;">${enrollmentValue ?? '\u2014'}</td>
                    </tr>`;
            }
        } else {
            lineContent = `
                <tr>
                    <td style="color: ${color}; font-size: 1.5em; vertical-align: middle; padding-top: 5px;">\u25AC</td>
                    <td style="padding: 5px 10px 0 5px; font-weight: bold;">${linePoint.series.name}</td>
                    <td style="text-align: right; padding: 4px 2px; font-weight: bold;">${linePoint.y ?? '\u2014'}</td>
                </tr>`;
        }
    }
    
    return `${header}<table>${finalBarRows}${totalRow}${lineContent}</table>`;
}

function ltdSpendCustomTooltipFormatter(this: any) {
    const formatCurrency = (value: number) => '$' + new Intl.NumberFormat('en-US').format(Math.round(value));

    let headerDate = this.x;
    if (typeof headerDate === 'string' && /^\d{2}\/\d{4}$/.test(headerDate)) {
        const [month, year] = headerDate.split('/');
        const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
        headerDate = date.toLocaleString('en-US', { month: 'short', year: 'numeric' });
    }

    let header = `<div style="font-size: 14px; margin-bottom: 10px;"><b>${headerDate}</b></div>`;
    
    let s = '<div style="padding: 5px 10px; min-width: 200px; font-family: sans-serif;">';
    s += header;
    s += '<table style="width: 100%;">';

    let total = 0;
    
    const ltdSpendSortOrder = ['Direct Fees', 'Pass-throughs', 'Investigator fees', 'OCCs'];
    const costPoints = this.points.filter((p: any) => p.series.type === 'column')
        .sort((a: any, b: any) => {
            return ltdSpendSortOrder.indexOf(a.series.name) - ltdSpendSortOrder.indexOf(b.series.name);
        });

    costPoints.forEach((point: any) => {
        if (point.y !== 0) {
            const value = point.y;
            total += value;
            const icon = `<span style="background-color: ${point.series.color}; width: 8px; height: 8px; display: inline-block; margin-right: 6px; vertical-align: middle;"></span>`;
            s += `<tr>
                    <td style="padding: 4px 2px;">${icon}${point.series.name}</td>
                    <td style="text-align: right; padding: 4px 2px; font-weight: bold;">${formatCurrency(value)}</td>
                  </tr>`;
        }
    });

    if (costPoints.length > 0) {
        s += `<tr>
                <td style="border-top: 1px solid #E0E0E0; padding-top: 8px; padding-bottom: 8px;"><b>Total</b></td>
                <td style="border-top: 1px solid #E0E0E0; padding-top: 8px; padding-bottom: 8px; text-align: right;"><b>${formatCurrency(total)}</b></td>
              </tr>`;
    }

    const linePoint = this.points.find((p: any) => p.series.type === 'line' && p.series.name === 'Patient count');

    if (linePoint) {
        const color = linePoint.series.color;
        const icon = `<span style="color:${color}; font-weight: bold; font-size: 18px; vertical-align: middle; line-height: 10px;">—</span>`;
        const value = (linePoint.y === null) ? '—' : new Intl.NumberFormat('en-US').format(Math.round(linePoint.y));
        s += `<tr>
                <td style="padding: 4px 2px;">${icon} Actual enrollment</td>
                <td style="text-align: right; padding: 4px 2px; font-weight: bold;">${value}</td>
              </tr>`;
    }

    s += '</table></div>';
    return s;
}

// --- UI COMPONENTS ---
const Modal: React.FC<{ onClose: () => void; children: React.ReactNode; title: string }> = ({ onClose, children, title }) => ( <div className="modal-overlay" onClick={onClose}><div className="modal-content" onClick={(e) => e.stopPropagation()}><div className="modal-header"><h2>{title}</h2><button className="modal-close-button" onClick={onClose}>&times;</button></div><div className="modal-body">{children}</div></div></div> );
const WidgetLibrary: React.FC<{ onAddWidget: (widgetConfig: any) => void }> = ({ onAddWidget }) => (
  <div className="widget-library">
    {WIDGET_CATALOG.map(widget => (
      <div key={widget.id} className="widget-card">
        <h4>{widget.title}</h4>
        <button onClick={() => onAddWidget(widget)}>+ Add to Dashboard</button>
      </div>
    ))}
  </div>
);

// --- MAIN APP COMPONENT ---
const App: React.FC = () => {
    const initialWidgetIds = ['kpi0', 'kpi1', 'kpi2', 'kpi3', 'kpi4', 'kpi5', 'chart1', 'chart6', 'chart7'];

    const [widgetInstances, setWidgetInstances] = useState(() => {
        const savedInstancesJSON = localStorage.getItem('dashboard-widgets');
        if (savedInstancesJSON) {
            try {
                const savedInstances = JSON.parse(savedInstancesJSON);
                if (Array.isArray(savedInstances)) {
                    const validatedInstances = savedInstances.filter(inst => inst && typeof inst === 'object' && inst.layout && typeof inst.layout === 'object');
                    if (validatedInstances.length > 0) {
                        return validatedInstances;
                    }
                }
            } catch (e) {
                console.error("Failed to parse widget instances from localStorage", e);
            }
        }
        return initialWidgetIds
            .map((id, i) => {
                const widgetConfig = WIDGET_CATALOG.find(w => w.id === id);
                if (!widgetConfig) return null;
                const defaultLayout = widgetConfig.defaultLayout || { w: 3, h: 3 };
                const x = (i % 4) * 3;
                const y = Math.floor(i / 4) * 3;
                return { instanceId: `${id}-${i}`, id: id, layout: { i: `${id}-${i}`, x, y, ...defaultLayout } };
            })
            .filter(Boolean as any);
    });

    useEffect(() => {
        localStorage.setItem('dashboard-widgets', JSON.stringify(widgetInstances));
    }, [widgetInstances]);

    const widgets = widgetInstances.map(inst => {
        const catalogEntry = WIDGET_CATALOG.find(w => w.id === inst.id);
        return { ...catalogEntry, ...inst };
    });

    const layouts = { lg: widgetInstances.map(inst => inst.layout) };
    
    const [isLibraryOpen, setLibraryOpen] = useState(false);
    const [isEditable, setIsEditable] = useState(false);
    const [contextMenu, setContextMenu] = useState<{ visible: boolean; x: number; y: number; widgetId: string | null; }>({
        visible: false, x: 0, y: 0, widgetId: null,
    });

    const onLayoutChange = useCallback((newLayout: Layout[], _allLayouts: Layouts) => {
        setWidgetInstances(prevInstances => {
            const newInstances = prevInstances.map(instance => {
                const layoutItem = newLayout.find(l => l.i === instance.instanceId);
                return layoutItem ? { ...instance, layout: layoutItem } : instance;
            });
            if (JSON.stringify(newInstances) !== JSON.stringify(prevInstances)) {
                return newInstances;
            }
            return prevInstances;
        });
    }, []);

    const onResizeStop = useCallback((_layout: Layout[], _oldItem: Layout, newItem: Layout) => {
        setWidgetInstances(prevInstances => {
            return prevInstances.map(instance => (instance.instanceId === newItem.i) ? { ...instance, layout: newItem } : instance);
        });
        setTimeout(() => { window.dispatchEvent(new Event('resize')); }, 150);
    }, []);

    const addWidget = (widgetConfig: any) => {
        const instanceId = `${widgetConfig.id}-${Date.now()}`;
        const newWidgetInstance = {
            instanceId: instanceId,
            id: widgetConfig.id,
            layout: { i: instanceId, x: (widgets.length * 3) % 12, y: Infinity, ...widgetConfig.defaultLayout }
        };
        setWidgetInstances(prev => [...prev, newWidgetInstance]);
        setLibraryOpen(false);
    };
    
    const removeWidget = (widgetInstanceId: string) => {
        setWidgetInstances(prev => prev.filter(inst => inst.instanceId !== widgetInstanceId));
    };

    const handleContextMenu = (event: React.MouseEvent, widgetId: string) => {
        event.preventDefault();
        if (!isEditable) return;
        setContextMenu({ visible: true, x: event.clientX, y: event.clientY, widgetId });
    };

    const closeContextMenu = useCallback(() => {
        setContextMenu(prev => ({ ...prev, visible: false }));
    }, []);

    useEffect(() => {
        if (contextMenu.visible) {
            window.addEventListener('click', closeContextMenu);
            window.addEventListener('scroll', closeContextMenu);
        }
        return () => {
            window.removeEventListener('click', closeContextMenu);
            window.removeEventListener('scroll', closeContextMenu);
        };
    }, [contextMenu.visible, closeContextMenu]);

    // --- onBeforeRender HOOKS FOR STANDARD WIDGETS ---
    
    const cumulativeSpendOnBeforeRender = (options: any) => {
        const budgetSeries = options.series?.find((s: any) => s.name === 'Total budget');
        const budgetDataPoint = budgetSeries?.data?.find((point: any) => point && typeof point.y === 'number');
        const budgetValue = budgetDataPoint?.y;

        if (typeof budgetValue === 'number') {
            options.yAxis = options.yAxis || [{}];
            options.yAxis[0] = options.yAxis[0] || {};
            options.yAxis[0].plotLines = options.yAxis[0].plotLines || [];
            options.yAxis[0].plotLines.push({
                color: '#F39C12',
                width: 2,
                value: budgetValue,
                zIndex: 5,
                label: { text: 'Total budget', align: 'left', x: 10, style: { color: '#A9A9A9', fontWeight: 'bold' } }
            });
        }
        
        options.tooltip = { ...options.tooltip, shared: true, useHTML: true, formatter: genericSharedTooltipFormatter };
        return options;
    };

    // ★★★ FIX IS HERE ★★★
    const ltdSpendOnBeforeRender = (options: any) => {
        options.chart = options.chart || {};
        options.chart.alignTicks = true;
        
        options.plotOptions = { ...options.plotOptions, column: { ...options.plotOptions?.column, borderRadius: 1, crisp: false, groupPadding: 0.4 } };
        
        if (options.yAxis && options.yAxis.length > 1) {
            options.yAxis[0].min = -400000;
            options.yAxis[1].min = -1;
        }

        const desiredOrder = ['Patient count', 'Direct Fees', 'Pass-throughs', 'Investigator fees', 'OCCs'];
        if (!options.series) return options;

        options.series.forEach((s: any) => {
            const orderIndex = desiredOrder.indexOf(s.name);
            s.legendIndex = orderIndex !== -1 ? orderIndex : desiredOrder.length;
            if (s.name === 'Patient count') s.zIndex = 5;
        });
    
        const secondarySeries = options.series.find((s: any) => s.name === 'Patient count');
        let secondaryAxisMax = 0;
        if (secondarySeries?.data?.length) {
            const dataPoints = secondarySeries.data.map((p: any) => (typeof p === 'object' && p !== null ? p.y : p));
            secondaryAxisMax = Math.max(0, ...dataPoints.filter((v: any): v is number => typeof v === 'number'));
        }
    
        const primaryAxisSeries = options.series.filter((s: any) => s.name !== 'Patient count');
        const stacks: { [key: number]: (number | null)[] } = {};
    
        primaryAxisSeries.forEach((s: any) => {
            if (!s.data) return;
            s.data.forEach((p: any, index: number) => {
                if (!stacks[index]) stacks[index] = [];
                const value = (typeof p === 'object' && p !== null) ? p.y : p;
                stacks[index].push(value);
            });
        });
    
        let primaryAxisMin = 0;
        let primaryAxisMax = 0;
        Object.values(stacks).forEach(categoryValues => {
            const validValues = categoryValues.filter((v): v is number => typeof v === 'number');
            const positiveSum = validValues.filter(v => v > 0).reduce((sum, v) => sum + v, 0);
            const negativeSum = validValues.filter(v => v < 0).reduce((sum, v) => sum + v, 0);
            if (positiveSum > primaryAxisMax) primaryAxisMax = positiveSum;
            if (negativeSum < primaryAxisMin) primaryAxisMin = negativeSum;
        });
    
        options.yAxis = options.yAxis || [{}, {}];
        options.yAxis[0] = options.yAxis[0] || {};
        options.yAxis[1] = options.yAxis[1] || {};
    
        if (primaryAxisMin < 0 && primaryAxisMax > 0 && secondaryAxisMax > 0) {
            const newSecondaryMin = primaryAxisMin * (secondaryAxisMax / primaryAxisMax);
            options.yAxis[0].min = primaryAxisMin;
            options.yAxis[0].max = primaryAxisMax;
            options.yAxis[1].min = newSecondaryMin;
            options.yAxis[1].max = secondaryAxisMax;
            options.yAxis[0].startOnTick = false;
            options.yAxis[0].endOnTick = false;
            options.yAxis[1].startOnTick = false;
            options.yAxis[1].endOnTick = false;
        }

        options.tooltip = {
            ...options.tooltip,
            shared: true,
            useHTML: true,
            formatter: ltdSpendCustomTooltipFormatter,
            backgroundColor: 'rgba(255, 255, 255, 1)',
            borderWidth: 1,
            borderColor: '#C0C0C0',
            shadow: true,
        };
    
        return options;
    };

    // ★★★ FIX IS HERE ★★★
    const actualForecastOnBeforeRender = (options: any) => {
        options.chart = options.chart || {};
        options.chart.alignTicks = true;

        options.plotOptions = { ...options.plotOptions, column: { ...options.plotOptions?.column, borderRadius: 1, crisp: false, groupPadding: 0.4 } };
        
        if (options.yAxis && options.yAxis.length > 1) {
            options.yAxis[0].min = -400000;
            options.yAxis[1].min = -1;
        }

        const desiredOrder = [
            'Enrollment', 'Direct fees - A', 'Pass-throughs - A', 'Investigator - A', 'OCC - A', 
            'Direct fees - F', 'Pass-throughs - F', 'Investigator - F', 'OCC - F'
        ];
        
        if (options.series) {
            options.series.forEach((s: any) => {
                const orderIndex = desiredOrder.indexOf(s.name);
                s.legendIndex = orderIndex !== -1 ? orderIndex : desiredOrder.length;
                if (s.name === 'Enrollment') {
                    s.type = 'line';
                    s.zIndex = 5;
                }
            });
        }
        
        options.tooltip = { ...options.tooltip, shared: true, useHTML: true, formatter: customTooltipFormatter };
        return options;
    };

    const vendorProgressOnBeforeRender = (options: any) => {
        const desiredOrder = ['LTD reconciled', 'Remaining Budget'];
        if (options.series) {
            options.series.forEach((s: any) => {
                const orderIndex = desiredOrder.indexOf(s.name);
                s.legendIndex = orderIndex !== -1 ? orderIndex : desiredOrder.length;
            });
        }
        options.tooltip = { ...options.tooltip, shared: true, useHTML: true, formatter: genericSharedTooltipFormatter };
        return options;
    };
    
    const budgetChartOnBeforeRender = (options: any) => {
        options.tooltip = { ...options.tooltip, shared: true, useHTML: true, formatter: genericSharedTooltipFormatter };
        return options;
    };

    const quarterlyExpensesOnBeforeRender = (options: any) => {
        options.tooltip = { ...options.tooltip, shared: true, useHTML: true, formatter: genericSharedTooltipFormatter };
        return options;
    };

    const sisenseUrl = import.meta.env.VITE_SISENSE_URL;
    const sisenseToken = import.meta.env.VITE_SISENSE_TOKEN;

    if (!sisenseUrl || !sisenseToken) {
      return (
        <div style={{ padding: '20px', color: 'red', fontFamily: 'Inter, Arial, sans-serif' }}>
          Error: Sisense URL and/or Token are not configured.
          <br />
          Please ensure `VITE_SISENSE_URL` and `VITE_SISENSE_TOKEN` are set in your `.env.local` file.
        </div>
      );
    }

    return (
        <SisenseContextProvider url={sisenseUrl} token={sisenseToken}>
            <div className="app-container">
                <header className="app-header">
                    <div className="header-branding">
                        <img src="/Sisense logo.png" alt="Sisense Logo" className="header-logo" />
                    </div>
                    <div className="header-actions">
                        <button className={`edit-mode-button ${isEditable ? 'editing' : ''}`} onClick={() => setIsEditable(prev => !prev)}>
                            {isEditable ? 'Lock Layout' : 'Edit Layout'}
                        </button>
                        <button className="action-button" onClick={() => setLibraryOpen(true)}>+ Add Widget</button>
                    </div>
                </header>

                <ResponsiveGridLayout
                    className={`layout ${isEditable ? 'is-editable' : ''}`}
                    layouts={layouts}
                    onLayoutChange={onLayoutChange}
                    isDraggable={isEditable}
                    isResizable={isEditable}
                    onResizeStop={onResizeStop}
                    breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
                    cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
                    rowHeight={100}
                    compactType="vertical"
                >
                    {widgets.map((w) => {
                        const WidgetComponent = (w as any).component;

                        return (
                            <div
                                key={w.instanceId}
                                className={`widget-container ${isEditable ? 'is-editable' : ''}`}
                                onContextMenu={(e) => handleContextMenu(e, w.instanceId)}
                            >
                                {WidgetComponent ? (
                                    <WidgetComponent />
                                ) : (
                                    <DashboardWidget
                                        widgetOid={WIDGET_OID_MAP[w.id]?.widgetOid}
                                        dashboardOid={WIDGET_OID_MAP[w.id]?.dashboardOid}
                                        title={w.title}
                                        styleOptions={{
                                            header: { hidden: w.id.startsWith('kpi') }
                                        }}
                                        onBeforeRender={
                                            w.id === 'chart1' ? ltdSpendOnBeforeRender :
                                            w.id === 'chart2' ? actualForecastOnBeforeRender :
                                            w.id === 'chart3' ? cumulativeSpendOnBeforeRender :
                                            w.id === 'chart4' ? budgetChartOnBeforeRender :
                                            w.id === 'chart5' ? vendorProgressOnBeforeRender :
                                            w.id === 'chart6' ? quarterlyExpensesOnBeforeRender :
                                            undefined
                                        }
                                    />
                                )}
                            </div>
                        );
                    })}
                </ResponsiveGridLayout>

                {isLibraryOpen && ( <Modal onClose={() => setLibraryOpen(false)} title="Widget Library"><WidgetLibrary onAddWidget={addWidget} /></Modal> )}

                {contextMenu.visible && (
                    <div
                        className="context-menu"
                        style={{ top: contextMenu.y, left: contextMenu.x }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            onClick={() => {
                                if (contextMenu.widgetId) {
                                    removeWidget(contextMenu.widgetId);
                                }
                                closeContextMenu();
                            }}
                        >
                            Remove Widget
                        </button>
                    </div>
                )}
            </div>
        </SisenseContextProvider>
    );
}

export default App;
