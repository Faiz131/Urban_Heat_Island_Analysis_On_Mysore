// Define the region of interest (Mysore, India)
var mysore = ee.Geometry.Point([76.6394, 12.2958]).buffer(50000); // 50 km buffer around Mysore

// Define the time range
var startDate = '2003-01-01';
var endDate = '2013-12-31';

// Load Landsat 5 & 7 Collection 2 Level-2 Image Collection
var landsat5 = ee.ImageCollection('LANDSAT/LT05/C02/T1_L2')
                  .filterBounds(mysore)
                  .filterDate(startDate, '2011-12-31')
                  .filter(ee.Filter.lt('CLOUD_COVER', 20));

var landsat7 = ee.ImageCollection('LANDSAT/LE07/C02/T1_L2')
                  .filterBounds(mysore)
                  .filterDate('2012-01-01', endDate)
                  .filter(ee.Filter.lt('CLOUD_COVER', 20));

// Function to calculate NDWI using Landsat 5 & 7 (B2: Green, B4: NIR)
var calculateNDWI = function(image) {
  var ndwi = image.normalizedDifference(['SR_B2', 'SR_B4']).rename('NDWI');  
  return image.addBands(ndwi); // Add NDWI as a band
};

// Apply NDWI function to both Landsat 5 & 7 collections
var ndwiCollection5 = landsat5.map(calculateNDWI);
var ndwiCollection7 = landsat7.map(calculateNDWI);

// Merge both collections
var ndwiCollection = ndwiCollection5.merge(ndwiCollection7);

// Create a median composite for NDWI
var ndwiComposite = ndwiCollection.select('NDWI').median().clip(mysore);

// Visualization parameters for NDWI
var ndwiVisParams = {
  min: -1,
  max: 1,
  palette: ['red', 'yellow', 'green'] // Red for dry, Yellow for moderate, Red for water
};

// Add NDWI layer to the map
Map.centerObject(mysore, 10); // Zoom into Mysore
Map.addLayer(ndwiComposite, ndwiVisParams, 'Median NDWI - Mysore (2004-2014)');

// Export the NDWI composite as a GeoTIFF to Google Drive
Export.image.toDrive({
  image: ndwiComposite.float(), // Preserve original NDWI values (-1 to 1)
  description: 'Mysore_NDWI_2004_2014',
  folder: 'GEE_Exports', // Specify your Google Drive folder
  fileNamePrefix: 'Mysore_NDWI_2004_2014',
  region: mysore.bounds(), // Ensure correct geometry format for export
  scale: 30, // Landsat resolution
  maxPixels: 1e13 // Handle large data sizes
});
