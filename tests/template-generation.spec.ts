import { expect, test } from '@playwright/test';
import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { generateHtml } from '../src/tools/skgeodesy/helpers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

test.describe('Template Generation', () => {
  test('should generate HTML from JSON data using template', async ({ page }) => {
    // Read the JSON data
    const jsonPath = join(__dirname, '..', 'processedTitleDeeds.json');
    const jsonData = JSON.parse(readFileSync(jsonPath, 'utf-8')) as any[];
    
    // Generate HTML using the template
    const generatedHtml = generateHtml({
      ...jsonData as any,
      lvs: ['<div>Test LV content</div>'], // Mock LV content
      createdAt: new Date().toLocaleString()
    });
    
    // Set the generated HTML content
    await page.setContent(generatedHtml, { waitUntil: 'load' });
    
    // Verify the page loads correctly
    await expect(page.locator('h1')).toContainText('Výpis z listov vlastníctva – Zákamenné');

    
    // Save the generated HTML to a file for inspection
    const outputPath = join(__dirname, '..', 'test-output.html');
    writeFileSync(outputPath, generatedHtml);
    
    console.log(`Generated HTML saved to: ${outputPath}`);
  });
});
