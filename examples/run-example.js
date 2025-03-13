const path = require('path');
const { generateDiagrams } = require('../generate-diagrams');

// Define paths
const sampleMarkdownPath = path.join(__dirname, 'sample.md');
const outputImageDir = path.join(__dirname, 'output-images');

// Run the example
console.log('Running Markdown to Diagram example...');
console.log(`Input file: ${sampleMarkdownPath}`);
console.log(`Output image directory: ${outputImageDir}`);

generateDiagrams(sampleMarkdownPath, outputImageDir)
  .then(() => {
    console.log('\nExample completed successfully!');
    console.log('Check the examples directory for the generated files:');
    console.log('- sample-with-diagrams.md: Markdown with Mermaid diagrams');
    console.log('- sample-with-images.md: Markdown with image references');
    console.log(`- ${outputImageDir}: Directory containing the generated images`);
  })
  .catch((error) => {
    console.error('Error running example:', error);
  }); 