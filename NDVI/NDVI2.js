// Define the region of interest (Mysore, India)
var mysore = ee.Geometry.Point([76.6394, 12.2958]).buffer(50000); // Buffer around Mysore (50 km)

// Define the time range
var startDate = '2003-01-01';
var endDate = '2013-12-31';

// Load Landsat 5 and Landsat 7 Collection 2 Surface Reflectance Image Collections
var landsat5 = ee.ImageCollection('LANDSAT/LT05/C02/T1_L2')
                  .filterBounds(mysore)
                  .filterDate(startDate, endDate)
                  .filter(ee.Filter.lt('CLOUD_COVER', 20)); // Filter for less cloudy images

var landsat7 = ee.ImageCollection('LANDSAT/LE07/C02/T1_L2')
                  .filterBounds(mysore)
                  .filterDate(startDate, endDate)
                  .filter(ee.Filter.lt('CLOUD_COVER', 20)); // Filter for less cloudy images

// Merge Landsat collections
var landsatCollection = landsat5.merge(landsat7);

// Calculate NDVI using Landsat bands (B4: NIR, B3: Red for Landsat 5/7)
var calculateNDVI = function(image) {
  var ndvi = image.normalizedDifference(['SR_B4', 'SR_B3']).rename('NDVI');
  return ndvi.clip(mysore); // Clip to Mysore region
};

// Map the NDVI calculation function over the Image Collection
var ndviCollection = landsatCollection.map(calculateNDVI);

// Create a composite image showing median NDVI over the time period
var ndviComposite = ndviCollection.median().clip(mysore); // Clip final composite to Mysore

// Visualization parameters for NDVI
var ndviVisParams = {
  min: -1,
  max: 1,
  palette: ['red', 'yellow', 'green'] // Red for low NDVI, Yellow for moderate, Green for high
};

// Add NDVI layer to the map
Map.centerObject(mysore, 10); // Zoom into Mysore region
Map.addLayer(ndviComposite, ndviVisParams, 'Median NDVI - Mysore');

// Export the NDVI composite as a GeoTIFF to Google Drive
Export.image.toDrive({
  image: ndviComposite.float(), // Ensure NDVI values remain in original range (-1 to 1)
  description: 'Mysore_NDVI_2004_2014_Clipped',
  folder: 'GEE_Exports', // Specify your Google Drive folder
  fileNamePrefix: 'Mysore_NDVI_2004_2014_Clipped',
  region: mysore,
  scale: 30, // Spatial resolution in meters (Landsat resolution)
  maxPixels: 1e13 // Handle large datasets
});
