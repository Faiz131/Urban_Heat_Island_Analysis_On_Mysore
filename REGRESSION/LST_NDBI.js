// Define the region of interest (Mysore, India)
var mysore = ee.Geometry.Point([76.6394, 12.2958]).buffer(10000); // Reduced buffer size

// Define the time range
var startDate = '2014-01-01';
var endDate = '2024-12-31';

// Load Landsat 8 Collection 2 Surface Reflectance Image Collection
var landsat8 = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
                  .filterDate(startDate, endDate)
                  .filterBounds(mysore)
                  .filter(ee.Filter.lt('CLOUD_COVER', 10)); // More stringent cloud cover filter

// Function to calculate NDBI and LST for each image
var calculateIndices = function(image) {
  // Calculate NDBI
  var ndbi = image.normalizedDifference(['SR_B6', 'SR_B5']).rename('NDBI');
  
  // Calculate LST (Land Surface Temperature)
  var bt = image.select('ST_B10').multiply(0.00341802).add(149.0); // Brightness temperature (Kelvin)
  var emissivity = ee.Image(0.986); // Assumed emissivity for built-up areas
  
  var lst = bt.divide(
    bt.expression('1 + (0.00115 * BT / 1.4388) * logE', {
      'BT': bt,
      'logE': emissivity.log() // Use .log() instead of log()
    })
  ).subtract(273.15).rename('LST');
  
  return image.addBands([ndbi, lst]);
};

// Apply NDBI and LST calculation to the image collection
var landsatWithIndices = landsat8.map(calculateIndices);

// Select NDBI and LST bands for correlation analysis
var ndbiLstCollection = landsatWithIndices.select(['NDBI', 'LST']);

// Sample pixel values across the region
var samplePoints = ndbiLstCollection.mean().clip(mysore).sample({
  region: mysore,
  scale: 30,
  numPixels: 3600, // Increased number of pixels for better representation
  seed: 10 // Random seed for reproducibility
});

// Filter out outliers (e.g., NDBI values outside typical range)
var filteredPoints = samplePoints.filter(ee.Filter.lte('NDBI', 1)).filter(ee.Filter.gte('NDBI', -1));

// Calculate Pearson's correlation coefficient
var correlation = filteredPoints.reduceColumns({
  selectors: ['NDBI', 'LST'],
  reducer: ee.Reducer.pearsonsCorrelation()
});

// Get the correlation coefficient and R-squared
var rValue = ee.Number(correlation.get('correlation')); 
var rSquared = rValue.pow(2);

// Print results
print('Pearson’s Correlation Coefficient (R):', rValue);
print('R-squared (R²):', rSquared);

// Create a scatter plot of NDBI vs. LST
var chart = ui.Chart.feature.byFeature({
  features: filteredPoints,
  xProperty: 'NDBI',
  yProperties: ['LST']
})
.setChartType('ScatterChart')
.setOptions({
  title: 'NDBI vs. LST Correlation (2014–2024)',
  hAxis: {'title': 'NDBI'},
  vAxis: {'title': 'LST (°C)'},
  pointSize: 3,
  trendlines: { 0: {
    color: 'red',
    showR2: true,
    visibleInLegend: true
  }}
});

// Display the chart
print(chart);