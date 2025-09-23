import React from 'react';
import { Card, CardContent, CardHeader, Typography, useTheme } from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { useMonthlySalesTrends } from '../hooks/useMonthlySalesTrends';
import { formatCurrency } from '../utils/format';

const MonthlySalesTrends: React.FC = () => {
  const theme = useTheme();
  const { data: monthlyTrends, loading, error } = useMonthlySalesTrends();

  const columns: GridColDef[] = [
    { 
      field: 'month', 
      headerName: 'Month', 
      flex: 1,
      valueGetter: (params) => {
        const month = params.row.monthName;
        const year = params.row.year;
        return `${month} ${year}`;
      }
    },
    { 
      field: 'totalSales', 
      headerName: 'Total Sales', 
      flex: 1,
      valueFormatter: (params) => formatCurrency(Number(params.value)),
      cellClassName: 'font-tabular-nums'
    },
    { 
      field: 'totalOrders', 
      headerName: 'Total Orders', 
      flex: 1,
      valueFormatter: (params) => params.value.toLocaleString(),
      cellClassName: 'font-tabular-nums'
    },
    { 
      field: 'averageOrderValue', 
      headerName: 'Avg. Order Value', 
      flex: 1,
      valueFormatter: (params) => formatCurrency(Number(params.value)),
      cellClassName: 'font-tabular-nums'
    },
  ];

  if (error) {
    return (
      <Card>
        <CardContent>
          <Typography color="error">Error loading monthly sales trends: {error}</Typography>
        </CardContent>
      </Card>
    );
  }

  // Calculate totals for the summary
  const totals = monthlyTrends.reduce((acc, trend) => ({
    totalSales: acc.totalSales + trend.totalSales,
    totalOrders: acc.totalOrders + trend.totalOrders,
    avgOrderValue: acc.avgOrderValue + trend.averageOrderValue
  }), { totalSales: 0, totalOrders: 0, avgOrderValue: 0 });

  const avgOrderValue = monthlyTrends.length > 0 
    ? totals.avgOrderValue / monthlyTrends.length 
    : 0;

  return (
    <Card>
      <CardHeader 
        title="Monthly Sales Trends" 
        subheader="Historical sales data by month"
      />
      <CardContent>
        {monthlyTrends.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <Typography variant="subtitle2" color="textSecondary">Total Sales</Typography>
                <Typography variant="h5">{formatCurrency(totals.totalSales)}</Typography>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <Typography variant="subtitle2" color="textSecondary">Total Orders</Typography>
                <Typography variant="h5">{totals.totalOrders.toLocaleString()}</Typography>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <Typography variant="subtitle2" color="textSecondary">Avg. Order Value</Typography>
                <Typography variant="h5">{formatCurrency(avgOrderValue)}</Typography>
              </div>
            </div>
            <div style={{ height: 400, width: '100%' }}>
              <DataGrid
                rows={monthlyTrends}
                columns={columns}
                pageSize={10}
                rowsPerPageOptions={[10, 25, 50]}
                loading={loading}
                disableSelectionOnClick
                sx={{
                  '& .MuiDataGrid-cell': {
                    borderBottom: `1px solid ${theme.palette.divider}`,
                  },
                  '& .MuiDataGrid-columnHeaders': {
                    backgroundColor: theme.palette.background.paper,
                  },
                }}
              />
            </div>
          </>
        ) : (
          <Typography>No monthly sales data available</Typography>
        )}
      </CardContent>
    </Card>
  );
};

export default MonthlySalesTrends;
