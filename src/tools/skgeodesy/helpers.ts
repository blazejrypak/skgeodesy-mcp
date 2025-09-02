import { z } from "zod";
import { createCadastrialUnitCodeUrl, createCKNCadastrialURL, createEKNCadastrialURL, getPlainPdfTemplate } from "./utils.js";
import { Context } from "../../context.js";
import type { Response } from '../../response.js';
import { CAPTCHA_URL } from "./constants.js";
import {parse} from "node-html-parser";
import Handlebars from "handlebars";

type ToolParams = {
    context: Context;
    params: z.output<z.Schema>;
    response: Response;
}

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
}

export const getCadastrialUnitCode = async (city: string, toolParams: ToolParams) => {
    const url = createCadastrialUnitCodeUrl(city);
    const { context } = toolParams;

    const tab = await context.ensureTab();
    const r = await tab.page.request.get(url, {
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        },
        maxRedirects: 0,
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
}

export const getParcelInfo = async (url: string, toolParams: ToolParams): Promise<string> => {
    const { context } = toolParams;
    const tab = await context.ensureTab();
    const r = await tab.page.request.get(url, {
        maxRedirects: 0,
    });

    const html = await r.text();
    const root = parse(html);
    const bodyContent = root.querySelector("body")?.innerHTML || "";

    return bodyContent;
}


export const getParcelInfoFullHtml = async (url: string, toolParams: ToolParams): Promise<string> => {
    const { context } = toolParams;
    const tab = await context.ensureTab();
    const r = await tab.page.request.get(url, {
        maxRedirects: 0,
    });

    const html = await r.text();
    const root = parse(html);
    const bodyContent = root.innerHTML;

    return bodyContent;
}

export const generateHtml = (data: any) => {
    const templateHTML = getPlainPdfTemplate();
    const template = Handlebars.compile(templateHTML);
    return template(data);
}