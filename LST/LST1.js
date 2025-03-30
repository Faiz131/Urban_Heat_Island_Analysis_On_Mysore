// Define the region of interest (Mysore, India)
var mysore = ee.Geometry.Point([76.6394, 12.2958]).buffer(50000); // Buffer around Mysore (50 km)

// Define the time range
var startDate = '2014-01-01';
var endDate = '2024-12-31';

// Load Landsat 8 Collection 2 Level-2 Image Collection
var landsat8 = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
                  .filterBounds(mysore)
                  .filterDate(startDate, endDate)
                  .filter(ee.Filter.lt('CLOUD_COVER', 20)); // Filter for less cloudy images

// Function to calculate LST
var calculateLST = function(image) {
  // Step 1: Calculate NDVI
  var ndvi = image.normalizedDifference(['SR_B5', 'SR_B4']).rename('NDVI');
  
  // Step 2: Define NDVI min and max as ee.Number objects
  var ndviMin = ee.Number(0.2); // Adjust based on region characteristics
  var ndviMax = ee.Number(0.8); // Adjust based on region characteristics
  
  // Step 3: Calculate Fractional Vegetation (FV)
  var fv = ndvi.subtract(ndviMin).divide(ndviMax.subtract(ndviMin)).rename('FV');
  
  // Step 4: Calculate Emissivity (ε)
  var emissivity = fv.multiply(0.004).add(0.986).rename('Emissivity'); // ε = 0.004 * FV + 0.986
  
  // Step 5: Brightness Temperature (BT) in Kelvin
  var bt = image.select('ST_B10').multiply(0.00341802).add(149.0).rename('BT'); // Convert ST_B10 to Kelvin
  
  // Step 6: Calculate Land Surface Temperature (LST) in Celsius
  var lst = bt.divide(
    bt.expression('1 + ((0.00115 * BT) / 1.4388) * logE', {
      'BT': bt,
      'logE': emissivity.log() // Use ee.Image.log() for logarithmic calculation
    })
  ).subtract(273.15).rename('LST');
  
  return lst.clip(mysore); // Clip to Mysore region
};

// Map the LST calculation function over the Image Collection
var lstCollection = landsat8.map(calculateLST);

// Create a composite image showing median LST over the time period
var lstComposite = lstCollection.median().clip(mysore); // Clip final composite to Mysore

// Visualization parameters for LST
var lstVisParams = {
  min: 15,
  max: 50,
  palette: ['green', 'yellow', 'red'] // Green for low LST, Yellow for moderate, Red for high
};

// Add LST layer to the map
Map.centerObject(mysore, 10); // Zoom into Mysore region
Map.addLayer(lstComposite, lstVisParams, 'Median LST - Mysore');

// Export the LST composite as a GeoTIFF to Google Drive
Export.image.toDrive({
  image: lstComposite.float(), // Ensure LST values remain in original range
  description: 'Mysore_LST_2014_2024_Clipped',
  folder: 'GEE_Exports', // Specify your Google Drive folder
  fileNamePrefix: 'Mysore_LST_2014_2024_Clipped',
  region: mysore,
  scale: 30, // Spatial resolution in meters (Landsat resolution)
  maxPixels: 1e13 // Handle large datasets
});
