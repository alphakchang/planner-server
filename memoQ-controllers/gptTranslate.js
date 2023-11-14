import { CODESLANG } from './codesLang.js';
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();
const openaiApiKey = process.env.OPENAI_API_KEY;

// Initialise the OpenAI API
const openai = new OpenAI({ apiKey: openaiApiKey });

const callGPT = async (prompt) => {

    const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
            {
                "role": "system",
                "content": "You are an experienced translator who only translate texts, without any extra comments about your translation."
            },
            {
                "role": "user",
                "content": prompt
            }
        ],
        temperature: 0.2
    })

    return completion.choices[0].message.content;
}

const getLanguageName = (code) => {
    if (CODESLANG.hasOwnProperty(code)) {
        return CODESLANG[code].name;
    } else {
        return "Language code not found";
    }
}

const buildTranslationRequests = (textData) => {
    // Validate input is an array
    if (!Array.isArray(textData)) {
        throw new Error('Input must be an array');
    }

    // Map each item to include source_lang, target_lang, and prompts
    const trRequests = textData.map(item => {
        // Validate the structure of the item
        if (!item.text || !Array.isArray(item.text) || typeof item.source_lang !== 'string' || typeof item.target_lang !== 'string') {
            throw new Error('Each item must have a text array, a source_lang string, and a target_lang string');
        }

        // Construct the prompts for each text entry
        const prompt = item.text.map((textEntry, index) => {
            return `translate "${textEntry}" from ${getLanguageName(item.source_lang)} into ${getLanguageName(item.target_lang)}`;
        });

        // Return the new object structure with source_lang and target_lang
        return {
            source_lang: item.source_lang,
            target_lang: item.target_lang,
            prompts: prompt
        };
    });

    return trRequests;
}

const handleGptTranslate = async (req, res) => {
    const { textData } = req.body;
    console.log(textData);

    // Validate the input
    if (!textData) {
        return res.status(400).json({ error: "Input is required" });
    }

    // Construct the requests
    let trRequests;
    try {
        trRequests = buildTranslationRequests(textData);
    } catch (err) {
        console.error('Error building requests:', err);
        return res.status(400).json({ error: err.message });
    }

    // for each of the prompt inside the requests, call the API and the response will replace the prompt
    const results = await Promise.all(trRequests.map(async (trRequest) => {
        const texts = await Promise.all(trRequest.prompts.map(async (prompt) => {
            return await callGPT(prompt);
        }));
        // Return a new object with the prompt key replaced by the text key
        return {
            source_lang: trRequest.source_lang,
            target_lang: trRequest.target_lang,
            texts: texts.map(text => text.trim()) // trim whitespace from each translation
        };
    }));

    // Return the results
    return res.json(results);
}

export default handleGptTranslate;