"use client";

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Bar } from 'react-chartjs-2';
import {
	Chart as ChartJS,
	CategoryScale,
	LinearScale,
	BarElement,
	Title,
	Tooltip,
	Legend,
	PointElement,
	LineElement,
	ArcElement
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, PointElement, LineElement, ArcElement);

interface StatCardProps {
	title: string;
	value: string | number | undefined;
}

function StatCard({ title, value }: StatCardProps) {
	return (
		<div style={{
			display: 'inline-block',
			margin: 12,
			padding: 20,
			background: '#fff',
			borderRadius: 10,
			boxShadow: '0 2px 8px #eee',
			minWidth: 180,
			textAlign: 'center',
		}}>
			<h3 style={{ marginBottom: 8 }}>{title}</h3>
			<div style={{ fontSize: 28, fontWeight: 600 }}>{value}</div>
		</div>
	);
}

type TopProduct = { name: string; sales: number; revenue: number; growth: number; margin: number };
type CustomerSegment = { segment: string; count: number; revenue: number; avgOrderValue: number; retention: number };
type PredictiveAnalytics = { nextMonthForecast?: number; churnRisk?: number; growthRate?: number; seasonalTrend?: number; marketTrend?: number };
type InventoryAnalytics = { lowStockItems?: number; overstockItems?: number; inventoryTurnover?: number; stockoutRate?: number };
type BasicStats = {
	totalSales?: number;
	totalRevenue?: number;
	totalProducts?: number;
	totalCustomers?: number;
	averageOrderValue?: number;
	salesByMonth?: Record<string, number>;
};
type AdvancedStats = {
	topProducts?: TopProduct[];
	customerSegments?: CustomerSegment[];
	predictiveAnalytics?: PredictiveAnalytics;
	inventoryAnalytics?: InventoryAnalytics;
};

interface CustomerRetention {
	totalCustomers?: number;
	repeatCustomers?: number;
	retentionRate?: number;
}

export default function StatisticsPage() {
   const [stats, setStats] = useState<BasicStats & AdvancedStats & { customerRetention?: CustomerRetention }>({});
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState<string | null>(null);

   useEffect(() => {
	   async function fetchDashboardStats() {
		   setLoading(true);
		   setError(null);
		   try {
			   const response = await axios.get('/api/analytics/dashboard');
			   setStats(response.data);
		   } catch {
			   setError('Failed to fetch statistics');
		   } finally {
			   setLoading(false);
		   }
	   }
	   fetchDashboardStats();
   }, []);

   if (loading) {
	   return <div>Loading statistics...</div>;
   }
   if (error) {
	   return <div>{error}</div>;
   }

   // Dashboard Analytics Cards
   const basicCards = [
	   { title: 'Total Sales', value: stats.totalSales },
	   { title: 'Total Revenue', value: stats.totalRevenue },
	   { title: 'Total Products', value: stats.totalProducts },
	   { title: 'Total Customers', value: stats.totalCustomers },
	   { title: 'Average Order Value', value: stats.averageOrderValue },
   ];

   // Sales by Month Chart
   const salesByMonth = stats.salesByMonth || {};
   const salesMonths = Object.keys(salesByMonth);
   const salesAmounts = salesMonths.length > 0 ? Object.values(salesByMonth) : [0];
   const salesMonthChart = {
	   labels: salesMonths.length > 0 ? salesMonths : ['No Data'],
	   datasets: [
		   {
			   label: 'Sales by Month',
			   data: salesAmounts,
			   backgroundColor: '#4f8cff',
		   },
	   ],
   };

   // Top Products Chart
   const topProducts = Array.isArray(stats.topProducts) ? stats.topProducts : [];
   const topProductChart = {
	   labels: topProducts.length > 0 ? topProducts.map((p: TopProduct) => p.name) : ['No Data'],
	   datasets: [
		   {
			   label: 'Revenue',
			   data: topProducts.length > 0 ? topProducts.map((p: TopProduct) => p.revenue) : [0],
			   backgroundColor: '#ffb347',
		   },
	   ],
   };

   // Inventory Analytics
   const inventory = stats.inventoryAnalytics || {};

   // Customer Retention
   const customerRetention = stats.customerRetention || {};

   return (
	   <div style={{ padding: 32, background: '#f7f9fa', minHeight: '100vh' }}>
		   <h1 style={{ marginBottom: 24 }}>System Statistics & Reports</h1>
		   <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 32 }}>
			   {basicCards.map(card => (
				   <StatCard key={card.title} title={card.title} value={card.value ?? '-'} />
			   ))}
		   </div>
		   <div style={{ marginBottom: 40 }}>
			   <h2>Sales by Month</h2>
			   <Bar data={salesMonthChart} options={{ responsive: true, plugins: { legend: { display: false } } }} />
		   </div>
		   <div style={{ marginBottom: 40 }}>
			   <h2>Top Products</h2>
			   <Bar data={topProductChart} options={{ responsive: true }} />
		   </div>
		   <div style={{ marginBottom: 40 }}>
			   <h2>Inventory Analytics</h2>
			   <div style={{ display: 'flex', gap: 24 }}>
				   <StatCard title="Low Stock Items" value={inventory.lowStockItems ?? '-'} />
				   <StatCard title="Overstock Items" value={inventory.overstockItems ?? '-'} />
				   <StatCard title="Inventory Turnover" value={inventory.inventoryTurnover ?? '-'} />
				   <StatCard title="Stockout Rate" value={inventory.stockoutRate ?? '-'} />
			   </div>
		   </div>
		   <div style={{ marginBottom: 40 }}>
			   <h2>Customer Retention</h2>
			   <div style={{ display: 'flex', gap: 24 }}>
				   <StatCard title="Total Customers" value={customerRetention.totalCustomers ?? '-'} />
				   <StatCard title="Repeat Customers" value={customerRetention.repeatCustomers ?? '-'} />
				   <StatCard title="Retention Rate" value={customerRetention.retentionRate ?? '-'} />
			   </div>
		   </div>
	   </div>
   );
}
