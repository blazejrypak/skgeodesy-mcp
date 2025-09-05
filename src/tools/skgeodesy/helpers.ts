import Handlebars from 'handlebars';
import { parse } from 'node-html-parser';
import { z } from 'zod';
import { Context } from '../../context.js';
import type { Response } from '../../response.js';
import { CAPTCHA_URL } from './constants.js';
import { TitleDeedsForSummary } from './schemas.js';
import { createCadastrialUnitCodeUrl, getPlainPdfTemplate } from './utils.js';

type ToolParams = {
  context: Context;
  params: z.output<z.Schema>;
  response: Response;
};

export const initializeBrowser = async (toolParams: ToolParams) => {
  const { context } = toolParams;
  const tab = await context.ensureTab();
  await tab.page.goto(CAPTCHA_URL);

  // Wait until the output page
  await tab.page.waitForFunction(
    () => {
      return document.body.innerText.includes('Kataster Portal');
    },
    null,
    { timeout: 60000 }
  );
};

export const getCadastrialUnitCode = async (city: string, toolParams: ToolParams) => {
  const url = createCadastrialUnitCodeUrl(city);
  const { context } = toolParams;

  const tab = await context.ensureTab();
  const r = await tab.page.request.get(url, {
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    maxRedirects: 0
  });

  const data = await r.json();

  let cadastralUnitCode = '';

  if (data['items'].length === 0) {
    throw new Error('No results found');
  } else {
    data['items']?.forEach((item: any) => {
      if (
        item['data']?.['category'] === 'katastrálne územie' &&
        item['data']?.['description']?.includes(city)
      ) {
        cadastralUnitCode = item['data']?.['id'];
      }
    });
  }

  if (!cadastralUnitCode) {
    throw new Error('No matching cadastral unit found');
  }

  return cadastralUnitCode;
};

const matchMetaDataJSON = new RegExp('"value"\\s*:\\s*(\\[[\\s\\S]*?\\])', 'g');

export const getMetaDataJSON = async (
  url: string,
  toolParams: ToolParams
): Promise<any> => {
  const { context } = toolParams;
  const tab = await context.ensureTab();
  const r = await tab.page.request.get(url, {
    maxRedirects: 0
  });

  const text = await r.text() ?? '';
  // group 1 is the JSON
  const match = text.match(matchMetaDataJSON);
  if (!match) {
    throw new Error('No JSON found');
  }
  const json = `{${match[0]}}`;
  const data = JSON.parse(json)?.value?.[0] ?? {};

  return data;
};

export const createParcelImagePreviewURL = (extent: { Xmin: number, Ymin: number, Xmax: number, Ymax: number }, parcelType: 'C' | 'E') => {
  const layerDefs = parcelType === 'C' ? '0:(ID IN (473294351))' : '0:(ID IN (473426700))';
  return `https://kataster.skgeodesy.sk/eskn/rest/services/VRM/parcels_${parcelType.toLowerCase()}_view/MapServer/export?dpi=96&transparent=true&format=png8&bbox=${extent.Xmin},${extent.Ymin},${extent.Xmax},${extent.Ymax}&size=300,150&layerDefs=${layerDefs}&f=image`
}

export const getParcelInfo = async (
  url: string,
  toolParams: ToolParams
): Promise<{ html: string; text: string }> => {
  const { context } = toolParams;
  const tab = await context.ensureTab();
  const r = await tab.page.request.get(url, {
    maxRedirects: 0
  });

  const html = await r.text();
  const root = parse(html);
  const bodyContent = root.querySelector('body')?.innerText || '';
  const bodyHtml = root.querySelector('body')?.innerHTML || '';

  return {
    html: bodyHtml,
    text: bodyContent
  };
};

export const getParcelInfoFullHtml = async (
  url: string,
  toolParams: ToolParams
): Promise<string> => {
  const { context } = toolParams;
  const tab = await context.ensureTab();
  const r = await tab.page.request.get(url, {
    maxRedirects: 0
  });

  const html = await r.text();
  const root = parse(html);
  const bodyContent = root.innerHTML;

  return bodyContent;
};

type TitleDeeds = TitleDeedsForSummary & { lvs: string[]; createdAt: string };

export const generateHtml = (data: TitleDeeds) => {
  const templateHTML = getPlainPdfTemplate();
  Handlebars.registerHelper('parity', function (index, options) {
    return (index % 2 === 0) ? 'even' : 'odd';
  });
  const template = Handlebars.compile(templateHTML);
  return template(data);
};
