/**
 * Cache visualization and debugging tools
 * This file provides utilities for analyzing cache performance in development mode
 */

import { cacheAnalytics } from './cacheAnalytics';
import { cacheManager } from './api';

/**
 * Create a visual cache dashboard for development
 * @returns A function to clean up the dashboard resources
 */
export function createCacheDashboard(container: HTMLElement): () => void {
  // Create dashboard container
  const dashboard = document.createElement('div');
  dashboard.style.padding = '15px';
  dashboard.style.backgroundColor = '#f5f5f5';
  dashboard.style.borderRadius = '8px';
  dashboard.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
  dashboard.style.margin = '10px';
  dashboard.style.fontFamily = 'system-ui, -apple-system, sans-serif';

  // Create title
  const title = document.createElement('h2');
  title.textContent = 'Cache Analytics Dashboard';
  title.style.margin = '0 0 15px 0';
  title.style.color = '#333';
  dashboard.appendChild(title);

  // Add cache stats section
  const statsSection = document.createElement('div');
  statsSection.style.display = 'grid';
  statsSection.style.gridTemplateColumns = 'repeat(3, 1fr)';
  statsSection.style.gap = '15px';
  statsSection.style.marginBottom = '20px';
  dashboard.appendChild(statsSection);

  // Create and add cards for each stat type
  const cards = [
    { title: 'Hit Rate', id: 'hit-rate', color: '#34c759' },
    { title: 'Response Time', id: 'response-time', color: '#5ac8fa' },
    { title: 'Error Rate', id: 'error-rate', color: '#ff3b30' },
    { title: 'Cache Size', id: 'cache-size', color: '#5856d6' },
    { title: 'Memory Usage', id: 'memory-usage', color: '#ff9500' },
    { title: 'Health Status', id: 'health-status', color: '#007aff' }
  ];

  cards.forEach(card => {
    const cardEl = document.createElement('div');
    cardEl.style.backgroundColor = 'white';
    cardEl.style.borderRadius = '6px';
    cardEl.style.padding = '15px';
    cardEl.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
    cardEl.style.borderLeft = `4px solid ${card.color}`;

    const cardTitle = document.createElement('div');
    cardTitle.textContent = card.title;
    cardTitle.style.fontSize = '14px';
    cardTitle.style.color = '#666';
    cardTitle.style.marginBottom = '5px';
    cardEl.appendChild(cardTitle);

    const cardValue = document.createElement('div');
    cardValue.id = card.id;
    cardValue.textContent = 'Loading...';
    cardValue.style.fontSize = '22px';
    cardValue.style.fontWeight = 'bold';
    cardValue.style.color = '#333';
    cardEl.appendChild(cardValue);

    statsSection.appendChild(cardEl);
  });

  // Add events chart
  const chartSection = document.createElement('div');
  chartSection.style.backgroundColor = 'white';
  chartSection.style.borderRadius = '6px';
  chartSection.style.padding = '15px';
  chartSection.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
  chartSection.style.marginBottom = '20px';
  dashboard.appendChild(chartSection);

  const chartTitle = document.createElement('h3');
  chartTitle.textContent = 'Cache Events (Last 50)';
  chartTitle.style.margin = '0 0 15px 0';
  chartTitle.style.fontSize = '16px';
  chartTitle.style.color = '#333';
  chartSection.appendChild(chartTitle);

  const chart = document.createElement('div');
  chart.id = 'cache-events-chart';
  chart.style.height = '150px';
  chart.style.backgroundColor = '#f9f9f9';
  chart.style.borderRadius = '4px';
  chart.style.overflow = 'hidden';
  chartSection.appendChild(chart);

  // Add actions
  const actionsSection = document.createElement('div');
  actionsSection.style.display = 'flex';
  actionsSection.style.gap = '10px';
  actionsSection.style.marginBottom = '15px';
  dashboard.appendChild(actionsSection);

  // Create action buttons
  const actions = [
    { text: 'Clear All Cache', action: 'clear-all' },
    { text: 'Refresh Stats', action: 'refresh-stats' },
    { text: 'Toggle Analytics', action: 'toggle-analytics' }
  ];

  actions.forEach(action => {
    const button = document.createElement('button');
    button.textContent = action.text;
    button.dataset.action = action.action;
    button.style.padding = '8px 12px';
    button.style.backgroundColor = '#007aff';
    button.style.color = 'white';
    button.style.border = 'none';
    button.style.borderRadius = '4px';
    button.style.cursor = 'pointer';
    button.style.fontSize = '14px';
    button.onclick = () => handleAction(action.action);
    actionsSection.appendChild(button);
  });

  // Add event log
  const logSection = document.createElement('div');
  logSection.style.backgroundColor = 'white';
  logSection.style.borderRadius = '6px';
  logSection.style.padding = '15px';
  logSection.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
  dashboard.appendChild(logSection);

  const logTitle = document.createElement('h3');
  logTitle.textContent = 'Recent Cache Events';
  logTitle.style.margin = '0 0 15px 0';
  logTitle.style.fontSize = '16px';
  logTitle.style.color = '#333';
  logSection.appendChild(logTitle);

  const log = document.createElement('div');
  log.id = 'cache-events-log';
  log.style.height = '150px';
  log.style.backgroundColor = '#f9f9f9';
  log.style.borderRadius = '4px';
  log.style.padding = '10px';
  log.style.overflow = 'auto';
  log.style.fontFamily = 'monospace';
  log.style.fontSize = '12px';
  logSection.appendChild(log);

  // Add dashboard to container
  container.appendChild(dashboard);

  // Update dashboard with initial data
  updateDashboard();

  // Set up interval to update dashboard
  const interval = setInterval(updateDashboard, 2000);
  
  // Create cleanup function for later use
  const cleanup = function() {
    clearInterval(interval);
  };
  
  // Store cleanup function for external access
  (dashboard as any).__cleanup = cleanup;

  // Handle dashboard actions
  function handleAction(action: string): void {
    switch (action) {
      case 'clear-all':
        cacheManager.clearAll();
        break;
      case 'refresh-stats':
        updateDashboard();
        break;
      case 'toggle-analytics':
        // Toggle analytics setting
        cacheManager.updateSettings({
          enableAnalytics: !cacheAnalytics['enabled']
        });
        break;
    }
  }

  // Update dashboard with latest data
  async function updateDashboard(): Promise<void> {
    try {
      // Get cache stats and analytics
      const stats = await cacheManager.getStats();
      const healthReport = cacheManager.getAnalytics();
      const events = cacheAnalytics.getEvents().slice(0, 50);

      // Update stats cards
      document.getElementById('hit-rate')!.textContent = 
        `${Math.round(stats.analytics.hitRate * 100)}%`;
        
      document.getElementById('response-time')!.textContent = 
        `${healthReport?.avgResponseTime.toFixed(0) || 0}ms`;
        
      document.getElementById('error-rate')!.textContent = 
        `${Math.round(stats.analytics.errorRate * 100)}%`;
        
      document.getElementById('cache-size')!.textContent = 
        stats.storage.size;
        
      document.getElementById('memory-usage')!.textContent = 
        `${stats.memory.itemCount} items`;
        
      document.getElementById('health-status')!.textContent = 
        healthReport?.status || 'Unknown';
        
      // Update chart (simple visualization)
      const chartEl = document.getElementById('cache-events-chart')!;
      updateChart(chartEl, events);
      
      // Update log
      const logEl = document.getElementById('cache-events-log')!;
      updateLog(logEl, events.slice(0, 10));
      
    } catch (error) {
      console.error('Error updating cache dashboard:', error);
    }
  }

  // Create simple bar chart visualization of events
  function updateChart(container: HTMLElement, events: any[]): void {
    // Clear container
    container.innerHTML = '';
    
    // Count events by type
    const eventCounts = events.reduce((acc, event) => {
      acc[event.type] = (acc[event.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // Create chart container
    const chartContainer = document.createElement('div');
    chartContainer.style.display = 'flex';
    chartContainer.style.alignItems = 'flex-end';
    chartContainer.style.height = '100%';
    chartContainer.style.padding = '10px';
    chartContainer.style.gap = '10px';
    
    // Define colors for event types
    const colors: Record<string, string> = {
      hit: '#34c759',
      miss: '#ff9500',
      set: '#5ac8fa',
      expired: '#ffcc00',
      error: '#ff3b30'
    };
    
    // Calculate the max count for scaling
    const maxCount = Math.max(...Object.values(eventCounts).map(v => Number(v)), 1);
    
    // Create bars for each event type
    Object.entries(eventCounts).forEach(([type, count]) => {
      const bar = document.createElement('div');
      
      // Calculate height as percentage of total events
      const countNum = Number(count);
      const height = Math.max(10, (countNum / maxCount) * 100);
      
      bar.style.backgroundColor = colors[type] || '#999';
      bar.style.width = '30px';
      bar.style.height = `${height}%`;
      bar.style.position = 'relative';
      bar.style.borderRadius = '4px 4px 0 0';
      
      // Add label
      const label = document.createElement('div');
      label.textContent = type;
      label.style.position = 'absolute';
      label.style.bottom = '-20px';
      label.style.left = '50%';
      label.style.transform = 'translateX(-50%)';
      label.style.fontSize = '10px';
      label.style.color = '#666';
      
      // Add count
      const countEl = document.createElement('div');
      countEl.textContent = countNum.toString();
      countEl.style.position = 'absolute';
      countEl.style.top = '-20px';
      countEl.style.left = '50%';
      countEl.style.transform = 'translateX(-50%)';
      countEl.style.fontSize = '10px';
      countEl.style.color = '#666';
      
      bar.appendChild(label);
      bar.appendChild(countEl);
      chartContainer.appendChild(bar);
    });
    
    container.appendChild(chartContainer);
  }

  // Update event log
  function updateLog(container: HTMLElement, events: any[]): void {
    container.innerHTML = '';
    
    if (events.length === 0) {
      const message = document.createElement('div');
      message.textContent = 'No cache events recorded yet.';
      message.style.color = '#999';
      message.style.padding = '10px';
      container.appendChild(message);
      return;
    }
    
    events.forEach(event => {
      const entry = document.createElement('div');
      const time = new Date(event.timestamp).toLocaleTimeString();
      
      // Color based on event type
      const colors: Record<string, string> = {
        hit: '#34c759',
        miss: '#ff9500',
        set: '#5ac8fa',
        expired: '#ffcc00',
        error: '#ff3b30'
      };
      
      entry.style.color = colors[event.type] || '#333';
      entry.style.marginBottom = '4px';
      
      entry.textContent = `${time} [${event.source}] ${event.type.toUpperCase()}: ${event.key.substring(0, 30)}`;
      
      if (event.duration) {
        entry.textContent += ` (${event.duration.toFixed(0)}ms)`;
      }
      
      container.appendChild(entry);
    });
  }

  // Return cleanup function
  return function cleanup() {
    clearInterval(interval);
  };
}

/**
 * Enable cache debugging tools in console
 * This attaches cache management and analytics to the window object for developer access
 */
export function enableCacheDebugging(): void {
  if (process.env.NODE_ENV === 'development') {
    (window as any).__CACHE__ = {
      manager: cacheManager,
      analytics: cacheAnalytics,
      visualize: (selector = '#cache-dashboard') => {
        const container = document.querySelector(selector);
        if (container) {
          return createCacheDashboard(container as HTMLElement);
        } else {
          console.error(`Container not found: ${selector}`);
        }
      }
    };
    
    console.info(
      '%c🔍 Cache debugging enabled!', 
      'background: #007aff; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;',
      '\nAccess cache debugging tools with window.__CACHE__',
      '\nTry window.__CACHE__.visualize() to create a dashboard'
    );
  }
}
