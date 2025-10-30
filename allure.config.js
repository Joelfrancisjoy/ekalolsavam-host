const { defineConfig } = require('allure-playwright');

module.exports = defineConfig({
  // Allure configuration
  resultsDir: 'allure-results',
  reportDir: 'allure-report',
  
  // Test environment
  environment: {
    browser: 'chromium',
    os: 'linux',
    node: process.version,
  },
  
  // Categories for test results
  categories: [
    {
      name: 'Failed tests',
      matchedStatuses: ['failed']
    },
    {
      name: 'Broken tests',
      matchedStatuses: ['broken']
    },
    {
      name: 'Skipped tests',
      matchedStatuses: ['skipped']
    },
    {
      name: 'Passed tests',
      matchedStatuses: ['passed']
    }
  ],
  
  // Test result processing
  testResultProcessor: (testResult) => {
    // Add custom labels
    if (testResult.fullName.includes('smoke')) {
      testResult.labels.push({ name: 'tag', value: 'smoke' });
    }
    if (testResult.fullName.includes('api')) {
      testResult.labels.push({ name: 'tag', value: 'api' });
    }
    if (testResult.fullName.includes('ui')) {
      testResult.labels.push({ name: 'tag', value: 'ui' });
    }
    
    return testResult;
  }
});


