import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import './activity.html';

const AW_API_URL = 'http://localhost:5600';

Template.activity.onCreated(function() {
  const instance = this;
  
  // Create reactive variables
  instance.buckets = new ReactiveVar([]);
  instance.loading = new ReactiveVar(true);
  instance.error = new ReactiveVar(null);
  
  // Define fetchBuckets BEFORE calling it
  instance.fetchBuckets = function() {
    instance.loading.set(true);
    instance.error.set(null);
    
    fetch(`${AW_API_URL}/api/0/buckets`)
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to fetch buckets');
        }
        return response.json();
      })
      .then(bucketsObj => {
        // Convert object to array for easier iteration in Blaze
        const bucketsArray = Object.keys(bucketsObj).map(key => ({
          id: key,
          ...bucketsObj[key]
        }));
        
        instance.buckets.set(bucketsArray);
        instance.loading.set(false);
      })
      .catch(error => {
        console.error('Error fetching buckets:', error);
        instance.error.set(error.message);
        instance.loading.set(false);
      });
  };
  
  // Define exportBucketAsJSON
  instance.exportBucketAsJSON = function(bucketId) {
    instance.loading.set(true);
    
    fetch(`${AW_API_URL}/api/0/buckets/${bucketId}/events?limit=10000`)
      .then(response => response.json())
      .then(events => {
        const dataStr = JSON.stringify(events, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `${bucketId}_export.json`;
        link.click();
        
        URL.revokeObjectURL(url);
        instance.loading.set(false);
      })
      .catch(error => {
        console.error('Error exporting bucket:', error);
        alert('Failed to export bucket: ' + error.message);
        instance.loading.set(false);
      });
  };
  
  // Define exportBucketAsCSV
  instance.exportBucketAsCSV = function(bucketId) {
    instance.loading.set(true);
    
    fetch(`${AW_API_URL}/api/0/buckets/${bucketId}/events?limit=10000`)
      .then(response => response.json())
      .then(events => {
        if (events.length === 0) {
          alert('No events to export');
          instance.loading.set(false);
          return;
        }
        
        // CSV headers
        const headers = ['Timestamp', 'Duration', 'Data'];
        const csvRows = [headers.join(',')];
        
        // CSV data rows
        events.forEach(event => {
          const row = [
            event.timestamp,
            event.duration || 0,
            JSON.stringify(event.data).replace(/"/g, '""')
          ];
          csvRows.push(row.map(field => `"${field}"`).join(','));
        });
        
        const csvString = csvRows.join('\n');
        const blob = new Blob([csvString], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `${bucketId}_export.csv`;
        link.click();
        
        URL.revokeObjectURL(url);
        instance.loading.set(false);
      })
      .catch(error => {
        console.error('Error exporting bucket:', error);
        alert('Failed to export bucket: ' + error.message);
        instance.loading.set(false);
      });
  };
  
  // NOW call fetchBuckets after it's defined
  instance.fetchBuckets();
});

Template.activity.helpers({
  buckets() {
    return Template.instance().buckets.get();
  },
  
  loading() {
    return Template.instance().loading.get();
  },
  
  error() {
    return Template.instance().error.get();
  },
  
  formatTimestamp(timestamp) {
    if (!timestamp) return 'Never';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  }
});

Template.activity.events({
  'click .refresh-btn'(event, instance) {
    instance.fetchBuckets();
  },
  
  'click .open-btn'(event, instance) {
    const bucketId = event.currentTarget.dataset.bucketId;
    console.log('Opening bucket:', bucketId);
    // Add your logic to open/view bucket details
  },
  
  'click .export-json-btn'(event, instance) {
    const bucketId = event.currentTarget.dataset.bucketId;
    instance.exportBucketAsJSON(bucketId);
  },
  
  'click .export-csv-btn'(event, instance) {
    const bucketId = event.currentTarget.dataset.bucketId;
    instance.exportBucketAsCSV(bucketId);
  }
});