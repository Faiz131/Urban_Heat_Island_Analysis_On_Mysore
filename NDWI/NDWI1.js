// Define the region of interest (Mysore, India)
var mysore = ee.Geometry.Point([76.6394, 12.2958]).buffer(50000); // 50 km buffer around Mysore

// Define the time range
var startDate = '2014-01-01';
var endDate = '2024-12-31';

// Load Landsat 8 Collection 2 Level-2 Image Collection
var landsat8 = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
                  .filterBounds(mysore)
                  .filterDate(startDate, endDate)
                  .filter(ee.Filter.lt('CLOUD_COVER', 20)); // Less cloudy images

// Function to calculate NDWI using Landsat 8 bands (B3: Green, B5: NIR)
var calculateNDWI = function(image) {
  var ndwi = image.normalizedDifference(['SR_B3', 'SR_B5']).rename('NDWI');  
  return image.addBands(ndwi);  // Add NDWI as a band (instead of clipping inside function)
};

// Apply the NDWI function to the Image Collection
var ndwiCollection = landsat8.map(calculateNDWI);

// Create a median composite for NDWI
var ndwiComposite = ndwiCollection.select('NDWI').median().clip(mysore); // Clip at the final step

// Visualization parameters for NDWI
var ndwiVisParams = {
  min: -1,
  max: 1,
  palette: ['red', 'yellow', 'green'] //  Red for dry areas, Yellow for moderate, Green for water
};

// Add NDWI layer to the map
Map.centerObject(mysore, 10); // Zoom into Mysore
Map.addLayer(ndwiComposite, ndwiVisParams, 'Median NDWI - Mysore');

// Export the NDWI composite as a GeoTIFF to Google Drive
Export.image.toDrive({
  image: ndwiComposite.float(), // Preserve original NDWI values (-1 to 1)
  description: 'Mysore_NDWI_2014_2024',
  folder: 'GEE_Exports', // Specify your Google Drive folder
  fileNamePrefix: 'Mysore_NDWI_2014_2024',
  region: mysore.bounds(), // Ensure correct geometry format for export
  scale: 30, // Landsat resolution
  maxPixels: 1e13 // Handle large data sizes
});
