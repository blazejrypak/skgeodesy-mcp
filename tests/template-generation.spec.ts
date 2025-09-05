import { test, expect } from '@playwright/test';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { generateHtml } from '../src/tools/skgeodesy/helpers.js';
import { QuickStats } from '../src/tools/skgeodesy/schemas.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

test.describe('Template Generation', () => {
  test('should generate HTML from JSON data using template', async ({ page }) => {
    // Read the JSON data
    const jsonPath = join(__dirname, '..', 'processedTitleDeeds-2025-09-04T23:10:44.003Z.json');
    const jsonData = JSON.parse(readFileSync(jsonPath, 'utf-8')) as any[];
    
    const quickStats: QuickStats = jsonData.reduce<QuickStats>(
      (acc, parcel) => {
        acc.parcelCount += 1; // Each processedTitleDeed represents one parcel
        acc.totalAreaM2 += parcel.parcel.areaM2 || 0;
        acc.structureCount += parcel.structures.length;
        // count unique owners by people array
        const allParcelOwners = parcel.owners.map((owner) => owner.people).flat();
        acc.ownerCount += new Set(allParcelOwners).size;
        return acc;
      },
      {
        parcelCount: 0,
        totalAreaM2: 0,
        structureCount: 0,
        ownerCount: 0,
      }
    );

    const header = jsonData[0].header;
    const _parcels = jsonData.map((titleDeed) => ({
      structures: titleDeed.structures,
      owners: titleDeed.owners,
      encumbrances: titleDeed.encumbrances,
      ...titleDeed.parcel
    }));

    const allTitleDeeds = {
      header,
      quickStats,
      parcels: _parcels
    };
    
    // Generate HTML using the template
    const generatedHtml = generateHtml({
      ...allTitleDeeds,
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
