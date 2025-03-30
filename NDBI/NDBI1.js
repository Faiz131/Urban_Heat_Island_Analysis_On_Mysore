// Define the region of interest (Mysore, India)
var mysore = ee.Geometry.Point([76.6394, 12.2958]).buffer(50000); // Buffer around Mysore (50 km)

// Define the time range
var startDate = '2014-01-01';
var endDate = '2024-12-31';

// Load Sentinel-2 Image Collection (Harmonized Sentinel-2 MSI Level-2A)
var sentinel2 = ee.ImageCollection('COPERNICUS/S2')
                  .filterBounds(mysore)
                  .filterDate(startDate, endDate)
                  .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20)); // Filter for less cloudy images

// Calculate NDBI using Sentinel-2 bands (B11: SWIR proxy, B8: NIR)
var calculateNDBI = function(image) {
  var ndbi = image.normalizedDifference(['B11', 'B8']).rename('NDBI');
  return ndbi.clip(mysore); // Clip to Mysore region
};

// Map the NDBI calculation function over the Image Collection
var ndbiCollection = sentinel2.map(calculateNDBI);

// Create a composite image showing median NDBI over the time period
var ndbiComposite = ndbiCollection.median().clip(mysore); // Clip final composite to Mysore

// Visualization parameters for NDBI
var ndbiVisParams = {
  min: -1,
  max: 1,
  palette: ['green', 'yellow', 'red'] // green for low NDBI (vegetation), yellow for moderate, Red for high (built-up)
};

// Add NDBI layer to the map
Map.centerObject(mysore, 10); // Zoom into Mysore region
Map.addLayer(ndbiComposite, ndbiVisParams, 'Median NDBI - Mysore');

// Export the NDBI composite as a GeoTIFF to Google Drive
Export.image.toDrive({
  image: ndbiComposite.float(), // Ensure NDBI values remain in original range (-1 to 1)
  description: 'Mysore_NDBI_2014_2024_Clipped',
  folder: 'GEE_Exports', // Specify your Google Drive folder
  fileNamePrefix: 'Mysore_NDBI_2014_2024_Clipped',
  region: mysore,
  scale: 10, // Spatial resolution in meters (Sentinel-2 resolution)
  maxPixels: 1e13 // Handle large datasets
});
