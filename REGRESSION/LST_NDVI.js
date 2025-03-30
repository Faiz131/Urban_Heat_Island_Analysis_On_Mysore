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

// Function to calculate NDVI and LST for each image
var calculateIndices = function(image) {
  // Calculate NDVI
  var ndvi = image.normalizedDifference(['SR_B5', 'SR_B4']).rename('NDVI');
  
  // Calculate LST (Land Surface Temperature)
  var bt = image.select('ST_B10').multiply(0.00341802).add(149.0); // Brightness temperature (Kelvin)
  var ndviScaled = ndvi.clamp(-1, 1); // Ensure NDVI is within valid range
  var fv = ndviScaled.subtract(0.2).divide(0.6).clamp(0, 1); // Fractional vegetation (NDVI scaling)
  var emissivity = fv.multiply(0.004).add(0.986); // Emissivity calculation
  
  // Corrected LST expression syntax
  var lst = bt.divide(
    bt.expression('1 + (0.00115 * BT / 1.4388) * logE', {
      'BT': bt,
      'logE': emissivity.log() // Use .log() instead of log()
    })
  ).subtract(273.15).rename('LST');
  
  return image.addBands([ndvi, lst]);
};

// Apply NDVI and LST calculation to the image collection
var landsatWithIndices = landsat8.map(calculateIndices);

// Select NDVI and LST bands for correlation analysis
var ndviLstCollection = landsatWithIndices.select(['NDVI', 'LST']);

// Sample pixel values across the region
var samplePoints = ndviLstCollection.mean().clip(mysore).sample({
  region: mysore,
  scale: 30,
  numPixels: 2000, // Increased number of pixels for better representation
  seed: 10 // Random seed for reproducibility
});

// Filter out outliers (e.g., NDVI values outside typical range)
var filteredPoints = samplePoints.filter(ee.Filter.lte('NDVI', 1)).filter(ee.Filter.gte('NDVI', -1));

// Calculate Pearson's correlation coefficient
var correlation = filteredPoints.reduceColumns({
  selectors: ['NDVI', 'LST'],
  reducer: ee.Reducer.pearsonsCorrelation()
});

// Get the correlation coefficient and R-squared
var rValue = ee.Number(correlation.get('correlation')); 
var rSquared = rValue.pow(2);

// Print results
print('Pearson’s Correlation Coefficient (R):', rValue);
print('R-squared (R²):', rSquared);

// Create a scatter plot of NDVI vs. LST
var chart = ui.Chart.feature.byFeature({
  features: filteredPoints,
  xProperty: 'NDVI',
  yProperties: ['LST']
})
.setChartType('ScatterChart')
.setOptions({
  title: 'NDVI vs. LST Correlation (2014–2024)',
  hAxis: {'title': 'NDVI'},
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
