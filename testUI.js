const { chromium } = require('playwright');
const path = require('path');

(async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

    const artifactDir = '/Users/jetinp/.gemini/antigravity/brain/3f8bc2ed-dc09-4365-a3ed-887412a9c263';
    const baseUrl = 'http://localhost:5173/';

    try {
        console.log('Navigating to overview...');
        await page.goto(baseUrl + '#overview');
        await page.waitForTimeout(1000);
        await page.screenshot({ path: path.join(artifactDir, 'final_overview.png'), fullPage: true });

        console.log('Navigating to hssekpis...');
        await page.goto(baseUrl + '#hssekpis');
        await page.waitForTimeout(1000);
        await page.screenshot({ path: path.join(artifactDir, 'final_hssekpis.png'), fullPage: true });

        console.log('Navigating to alerts...');
        await page.goto(baseUrl + '#alerts');
        await page.waitForTimeout(1000);
        await page.screenshot({ path: path.join(artifactDir, 'final_alerts.png'), fullPage: true });

        console.log('Navigating to fatigue...');
        await page.goto(baseUrl + '#fatigue');
        await page.waitForTimeout(1000);
        await page.screenshot({ path: path.join(artifactDir, 'final_fatigue.png'), fullPage: true });

        // Test Tooltip rendering
        console.log('Testing tooltip hover...');
        await page.hover('.info-icon-wrapper').catch(() => console.log('No tooltips found'));
        await page.waitForTimeout(500);
        await page.screenshot({ path: path.join(artifactDir, 'final_tooltip.png') });

        console.log('All screenshots captured successfully.');
    } catch (e) {
        console.error('Error during testing:', e);
    } finally {
        await browser.close();
    }
})();
